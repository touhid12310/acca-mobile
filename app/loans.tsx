import React, { useState, useEffect } from "react";
import {
  Share,
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Text,
  Surface,
  FAB,
  ActivityIndicator,
  Portal,
  Modal,
  TextInput,
  Button,
  ProgressBar,
  Chip,
  SegmentedButtons,
  Divider,
} from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { TriangleAlert } from "lucide-react-native";

import { useTheme } from "../src/contexts/ThemeContext";
import { useCurrency } from "../src/contexts/CurrencyContext";
import { notifyToast } from "../src/contexts/NotificationContext";
import { BrandedHeader, BrandStrip } from "../src/components";
import { ConfirmDialog } from "../src/components/ui";
import loanService, {
  LoanDirection,
  LoanShare,
  LoanStatement,
} from "../src/services/loanService";
import accountService from "../src/services/accountService";
import categoryService from "../src/services/categoryService";
import DateField from "../src/components/common/DateField";
import { Loan } from "../src/types";
import { formatDate, todayDateInputValue } from "../src/utils/date";

// Helper function to extract detailed validation errors from API response
/**
 * The API wraps payloads as { success, data: { ... } }; apiRequest hands back
 * the whole body, so one more hop is needed to reach the payload.
 */
const unwrapData = <T,>(value: any): T | undefined =>
  (value && typeof value === "object" && "data" in value ? value.data : value) as T | undefined;

const formatApiError = (result: any): string => {
  const errorData = result.data;
  let errorMsg = errorData?.message || result.error || "Request failed";

  // Check for Laravel validation errors
  const validationErrors = errorData?.errors;
  if (validationErrors && typeof validationErrors === "object") {
    const errorDetails = Object.entries(validationErrors)
      .map(
        ([field, msgs]) =>
          `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`,
      )
      .join("\n");
    if (errorDetails) {
      errorMsg = `${errorMsg}\n\n${errorDetails}`;
    }
  }

  return errorMsg;
};

// Must stay in sync with the backend's `in:weeks,months,years` rule and the web
// modal's term_period <select> — "weeks" was missing here.
const termPeriodOptions = [
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
  { value: "years", label: "Years" },
];

type TermPeriod = "weeks" | "months" | "years";

export default function LoansScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [modalVisible, setModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  // 'in' = money arrived, 'out' = money left. Whether that settles or grows
  // the loan depends on loan_type — see LoanLedgerService on the backend.
  const [paymentDirection, setPaymentDirection] = useState<LoanDirection>("in");
  const [statementVisible, setStatementVisible] = useState(false);
  const [statement, setStatement] = useState<LoanStatement | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showPaymentAccountPicker, setShowPaymentAccountPicker] =
    useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [formData, setFormData] = useState({
    loan_name: "",
    original_amount: "",
    interest_rate: "",
    next_payment: "",
    term: "",
    term_period: "years" as TermPeriod,
    start_date: "",
    next_payment_date: "",
    loan_type: "Borrowed" as "Borrowed" | "Lent",
    account_id: "",
    category_id: "",
    notes: "",
  });

  const [paymentData, setPaymentData] = useState({
    payment_amount: "",
    interest_paid: "0",
    account_id: "",
    payment_date: todayDateInputValue(),
    next_payment: "",
    next_payment_date: "",
    notes: "",
  });

  const {
    data: loans,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["loans"],
    queryFn: async () => {
      const result = await loanService.getAll();
      if (result.success && result.data) {
        const responseData = result.data as any;
        return responseData?.data || responseData || [];
      }
      return [];
    },
  });

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const result = await accountService.getAll();
      if (result.success && result.data) {
        const responseData = result.data as any;
        return responseData?.data || responseData || [];
      }
      return [];
    },
  });

  // Load categories based on loan type
  useEffect(() => {
    const loadCategories = async () => {
      if (!modalVisible) return;

      const categoryType =
        formData.loan_type === "Lent" ? "asset" : "liability";
      try {
        const result = await categoryService.getForTransaction({
          type: categoryType,
        });
        if (result.success && result.data) {
          const data = (result.data as any)?.data || result.data;
          setCategories(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        setCategories([]);
      }
    };

    loadCategories();
  }, [formData.loan_type, modalVisible]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        loan_name: data.loan_name,
        original_amount: parseFloat(data.original_amount) || 0,
        interest_rate: parseFloat(data.interest_rate) || 0,
        next_payment: parseFloat(data.next_payment) || 0,
        term: parseInt(data.term) || 0,
        term_period: data.term_period,
        start_date: data.start_date || todayDateInputValue(),
        next_payment_date: data.next_payment_date || undefined,
        loan_type: data.loan_type,
        account_id: parseInt(data.account_id) || undefined,
        category_id: parseInt(data.category_id) || undefined,
        notes: data.notes || undefined,
      };
      const result = await loanService.create(payload);
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      closeModal();
    },
    onError: (error: Error) => notifyToast.error(error.message),
  });

  const paymentMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: typeof paymentData;
    }) => {
      const settling = isRepaymentDirection(selectedLoan, paymentDirection);
      const amount = parseFloat(data.payment_amount) || 0;

      const payload = {
        payment_amount: amount,
        direction: paymentDirection,
        // Money going the other way is fresh principal: no interest split.
        principal_paid: settling
          ? undefined
          : amount,
        interest_paid: settling
          ? (data.interest_paid ? parseFloat(data.interest_paid) : 0)
          : 0,
        account_id: parseInt(data.account_id) || undefined,
        payment_date:
          data.payment_date || todayDateInputValue(),
        next_payment: data.next_payment
          ? parseFloat(data.next_payment)
          : undefined,
        next_payment_date: data.next_payment_date || undefined,
        notes: data.notes || undefined,
      };
      const result = await loanService.makePayment(id, payload);
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      closePaymentModal();
    },
    onError: (error: Error) => notifyToast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await loanService.delete(id);
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
    },
    onError: (error: Error) => notifyToast.error(error.message),
  });

  const openModal = () => {
    const defaultAccountId = accounts?.[0]?.id ? String(accounts[0].id) : "";

    setFormData({
      loan_name: "",
      original_amount: "",
      interest_rate: "",
      next_payment: "",
      term: "",
      term_period: "years",
      start_date: todayDateInputValue(),
      next_payment_date: "",
      loan_type: "Borrowed",
      account_id: defaultAccountId,
      category_id: "",
      notes: "",
    });
    setShowCategoryPicker(false);
    setShowAccountPicker(false);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setShowCategoryPicker(false);
    setShowAccountPicker(false);
  };

  /** Mirrors LoanLedgerService: which direction settles this kind of loan. */
  const isRepaymentDirection = (loan: Loan | null, direction: LoanDirection) =>
    loan?.loan_type === "Borrowed" ? direction === "out" : direction === "in";

  const directionLabels = (loan: Loan | null) =>
    loan?.loan_type === "Borrowed"
      ? { in: "Borrowed more", out: "Repayment sent" }
      : { in: "Payment received", out: "Amount given" };

  /** One word each for the card buttons — the full phrases wrap on narrow phones. */
  const directionShortLabels = (loan: Loan | null) =>
    loan?.loan_type === "Borrowed"
      ? { in: "Borrowed", out: "Repaid" }
      : { in: "Received", out: "Given" };

  const openPaymentModal = (loan: Loan, direction: LoanDirection = "in") => {
    const defaultAccountId = accounts?.[0]?.id ? String(accounts[0].id) : "";

    setPaymentDirection(direction);
    setSelectedLoan(loan);
    setPaymentData({
      payment_amount: "",
        interest_paid: "0",
      account_id: defaultAccountId,
      payment_date: todayDateInputValue(),
      next_payment: "",
      next_payment_date: "",
      notes: "",
    });
    setShowPaymentAccountPicker(false);
    setPaymentModalVisible(true);
  };

  const closePaymentModal = () => {
    setPaymentModalVisible(false);
    setSelectedLoan(null);
    setShowPaymentAccountPicker(false);
  };

  const handleSave = () => {
    if (!formData.loan_name.trim()) {
      notifyToast.error("Please enter a loan name");
      return;
    }
    if (
      !formData.original_amount ||
      parseFloat(formData.original_amount) <= 0
    ) {
      notifyToast.error("Please enter a valid amount");
      return;
    }
    if (!formData.category_id) {
      notifyToast.error("Please select a category");
      return;
    }
    if (!formData.account_id) {
      notifyToast.error("Please select an account");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleMakePayment = () => {
    if (!selectedLoan) return;
    const amount = parseFloat(paymentData.payment_amount);
    const interest = paymentData.interest_paid
      ? parseFloat(paymentData.interest_paid)
      : 0;
    // Principal is no longer asked for: whatever is not interest comes off
    // the balance, which is what everyone meant by the field anyway.
    const principal = amount - interest;
    if (!amount || amount <= 0) {
      notifyToast.error("Please enter a valid payment amount");
      return;
    }
    // The split and the balance ceiling only apply when settling the loan.
    const settlingEntry = isRepaymentDirection(selectedLoan, paymentDirection);
    if (settlingEntry && (!Number.isFinite(interest) || interest < 0 || interest > amount)) {
      notifyToast.error("Interest cannot be negative or larger than the payment.");
      return;
    }
    if (
      settlingEntry &&
      principal > parseFloat(String(selectedLoan.remaining_balance ?? 0)) + 0.009
    ) {
      notifyToast.error("That is more than the outstanding balance.");
      return;
    }
    if (!paymentData.account_id) {
      notifyToast.error("Please select an account");
      return;
    }
    paymentMutation.mutate({ id: selectedLoan.id, data: paymentData });
  };

  const openStatement = async (loan: Loan) => {
    setSelectedLoan(loan);
    setStatement(null);
    setStatementVisible(true);
    setStatementLoading(true);
    try {
      const result = await loanService.getStatement(loan.id);
      if (result.success) setStatement(unwrapData(result.data) as LoanStatement);
      else notifyToast.error("Could not load the statement.");
    } catch {
      notifyToast.error("Could not load the statement.");
    } finally {
      setStatementLoading(false);
    }
  };

  const closeStatement = () => {
    setStatementVisible(false);
    setStatement(null);
    // Otherwise an expanded note stays expanded for whichever loan opens next.
    setNotesExpanded(false);
    setExpandedEntryNotes(new Set());
  };

  // Short enough that the preview plus "See more" stays on one line.
  const ENTRY_NOTE_LIMIT = 45;
  const [expandedEntryNotes, setExpandedEntryNotes] = useState<Set<number>>(
    () => new Set()
  );
  const [notesExpanded, setNotesExpanded] = useState(false);

  const toggleEntryNote = (id: number) => {
    setExpandedEntryNotes((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleShareLink = async (enable: boolean) => {
    if (!selectedLoan || shareBusy) return;
    setShareBusy(true);
    try {
      const result = enable
        ? await loanService.createShareLink(selectedLoan.id)
        : await loanService.revokeShareLink(selectedLoan.id);

      if (!result.success) throw new Error(formatApiError(result));

      const share = unwrapData(result.data) as LoanShare;
      setStatement((prev) => (prev ? { ...prev, share } : prev));

      if (!enable) {
        notifyToast.success("Public link revoked.");
        return;
      }

      // Creating the link is the moment it is wanted on the clipboard; the
      // Copy button stays for later, but is no longer a required second tap.
      if (share?.url) {
        await Clipboard.setStringAsync(share.url);
        notifyToast.success("Public link created and copied.");
      } else {
        notifyToast.success("Public link created.");
      }
    } catch (error) {
      notifyToast.error(error instanceof Error ? error.message : "Could not update the link.");
    } finally {
      setShareBusy(false);
    }
  };

  const shareStatementLink = async () => {
    const url = statement?.share?.url;
    if (!url) return;
    try {
      await Share.share({
        message: `${selectedLoan?.loan_name ?? "Loan"} statement: ${url}`,
        url,
      });
    } catch {
      // The user dismissing the share sheet is not an error.
    }
  };

  const copyStatementLink = async () => {
    const url = statement?.share?.url;
    if (!url) return;
    await Clipboard.setStringAsync(url);
    notifyToast.success("Link copied.");
  };

  /** The PDF opens in the system browser, which handles auth-less download. */
  const openStatementPdf = async () => {
    const url = statement?.share?.pdf_url;
    if (url) {
      await WebBrowser.openBrowserAsync(url);
      return;
    }
    notifyToast.error("Create a share link first to download the PDF.");
  };

  const showLoanActions = (loan: Loan) => {
    setSelectedLoan(loan);
    setShowActionSheet(true);
  };

  const handleDeletePress = () => {
    setShowActionSheet(false);
    setTimeout(() => setShowDeleteConfirm(true), 200);
  };

  const handleConfirmDelete = () => {
    if (selectedLoan) {
      deleteMutation.mutate(selectedLoan.id);
    }
    setShowDeleteConfirm(false);
    setSelectedLoan(null);
  };

  const closeActionSheet = () => {
    setShowActionSheet(false);
    setSelectedLoan(null);
  };

  const getSelectedCategoryName = () => {
    const cat = categories.find(
      (c) => String(c.id) === String(formData.category_id),
    );
    return cat?.name || "";
  };

  const getSelectedAccountName = (accountId: string) => {
    const acc = (accounts || []).find(
      (a: any) => String(a.id) === String(accountId),
    );
    return acc?.account_name || "";
  };

  // Calculate stats
  const viewLoans = loans || [];
  const viewAccounts = accounts || [];
  const activeLoans = viewLoans.filter(
    (loan: Loan) => loan.status === "Active" || !loan.status,
  );

  // Borrowed loans (liability - I owe money)
  const borrowedLoans = activeLoans.filter(
    (loan: Loan) => loan.loan_type === "Borrowed" || !loan.loan_type,
  );
  const totalLoansToPay = borrowedLoans.reduce(
    (sum: number, loan: Loan) =>
      sum + parseFloat(String(loan.remaining_balance ?? loan.principal ?? 0)),
    0,
  );

  // Lent loans (asset - others owe me money)
  const lentLoans = activeLoans.filter(
    (loan: Loan) => loan.loan_type === "Lent",
  );
  const totalLoansToReceive = lentLoans.reduce(
    (sum: number, loan: Loan) =>
      sum + parseFloat(String(loan.remaining_balance ?? loan.principal ?? 0)),
    0,
  );

  // Upcoming installments
  const totalUpcomingInstallments = activeLoans
    .filter(
      (loan: Loan) =>
        loan.next_payment && parseFloat(String(loan.next_payment)) > 0,
    )
    .reduce(
      (sum: number, loan: Loan) =>
        sum +
        parseFloat(String(loan.next_payment ?? loan.monthly_payment ?? 0)),
      0,
    );

  const calculateProgress = (loan: Loan) => {
    const original = parseFloat(
      String(loan.original_amount ?? loan.principal ?? 0),
    );
    const remaining = parseFloat(String(loan.remaining_balance ?? 0));
    if (original <= 0) return 0;
    return ((original - remaining) / original) * 100;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "Active":
        return colors.primary;
      case "Paid Off":
        return colors.tertiary;
      case "Overdue":
        return colors.error;
      default:
        return colors.primary;
    }
  };

  const getDaysUntilPayment = (dateString?: string) => {
    if (!dateString) return null;
    const paymentDate = new Date(dateString);
    const today = new Date();
    const diffTime = paymentDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <BrandStrip />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
          />
        }
      >
        <BrandedHeader
          title="Loans"
          subtitle="Track lending, borrowing, and payments"
          showBack
          showBrand={false}
          inset={false}
        />

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <Surface
            style={[
              styles.statCard,
              { backgroundColor: colors.errorContainer },
            ]}
            elevation={1}
          >
            <MaterialCommunityIcons
              name="hand-coin"
              size={18}
              color={colors.error}
            />
            <View style={styles.statTextCol}>
              <Text
                variant="labelSmall"
                style={{ color: colors.error }}
                numberOfLines={1}
              >
                To Pay
              </Text>
              <Text
                variant="titleSmall"
                style={{ color: colors.error, fontWeight: "bold" }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatAmount(totalLoansToPay)}
              </Text>
              <Text
                variant="labelSmall"
                style={{ color: colors.error }}
                numberOfLines={1}
              >
                {borrowedLoans.length} loans
              </Text>
            </View>
          </Surface>
          <Surface
            style={[
              styles.statCard,
              { backgroundColor: colors.tertiaryContainer },
            ]}
            elevation={1}
          >
            <MaterialCommunityIcons
              name="cash-plus"
              size={18}
              color={colors.tertiary}
            />
            <View style={styles.statTextCol}>
              <Text
                variant="labelSmall"
                style={{ color: colors.tertiary }}
                numberOfLines={1}
              >
                To Receive
              </Text>
              <Text
                variant="titleSmall"
                style={{ color: colors.tertiary, fontWeight: "bold" }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatAmount(totalLoansToReceive)}
              </Text>
              <Text
                variant="labelSmall"
                style={{ color: colors.tertiary }}
                numberOfLines={1}
              >
                {lentLoans.length} loans
              </Text>
            </View>
          </Surface>
          <Surface
            style={[
              styles.statCard,
              { backgroundColor: colors.primaryContainer },
            ]}
            elevation={1}
          >
            <MaterialCommunityIcons
              name="calendar-clock"
              size={18}
              color={colors.primary}
            />
            <View style={styles.statTextCol}>
              <Text
                variant="labelSmall"
                style={{ color: colors.primary }}
                numberOfLines={1}
              >
                Installments
              </Text>
              <Text
                variant="titleSmall"
                style={{ color: colors.primary, fontWeight: "bold" }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatAmount(totalUpcomingInstallments)}
              </Text>
              <Text
                variant="labelSmall"
                style={{ color: colors.primary }}
                numberOfLines={1}
              >
                upcoming
              </Text>
            </View>
          </Surface>
          <Surface
            style={[
              styles.statCard,
              { backgroundColor: colors.surfaceVariant },
            ]}
            elevation={1}
          >
            <MaterialCommunityIcons
              name="format-list-bulleted"
              size={18}
              color={colors.onSurfaceVariant}
            />
            <View style={styles.statTextCol}>
              <Text
                variant="labelSmall"
                style={{ color: colors.onSurfaceVariant }}
                numberOfLines={1}
              >
                Active
              </Text>
              <Text
                variant="titleSmall"
                style={{ color: colors.onSurfaceVariant, fontWeight: "bold" }}
              >
                {activeLoans.length}
              </Text>
              <Text
                variant="labelSmall"
                style={{ color: colors.onSurfaceVariant }}
                numberOfLines={1}
              >
                total loans
              </Text>
            </View>
          </Surface>
        </View>

        {/* Archived Toggle */}
        {viewLoans.length > activeLoans.length && (
          <TouchableOpacity
            style={[
              styles.archivedToggle,
              { backgroundColor: colors.surfaceVariant },
            ]}
            onPress={() => setShowArchived(!showArchived)}
          >
            <MaterialCommunityIcons
              name={showArchived ? "archive-off" : "archive"}
              size={18}
              color={colors.onSurfaceVariant}
            />
            <Text
              variant="bodyMedium"
              style={{ color: colors.onSurfaceVariant, marginLeft: 8 }}
            >
              {showArchived ? "Hide" : "Show"} Archived (
              {viewLoans.length - activeLoans.length})
            </Text>
            <MaterialCommunityIcons
              name={showArchived ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.onSurfaceVariant}
              style={{ marginLeft: "auto" }}
            />
          </TouchableOpacity>
        )}

        {(showArchived ? viewLoans : activeLoans).length > 0 ? (
          (showArchived ? viewLoans : activeLoans).map((loan: Loan) => {
            const progress = calculateProgress(loan);
            const loanName = loan.loan_name || loan.name || "Unnamed Loan";
            const originalAmount = parseFloat(
              String(loan.original_amount ?? loan.principal ?? 0),
            );
            const remainingBalance = parseFloat(
              String(loan.remaining_balance ?? 0),
            );
            const interestRate = loan.interest_rate ?? 0;
            const nextPayment = loan.next_payment ?? loan.monthly_payment ?? 0;
            const loanType = loan.loan_type || "Borrowed";
            const status = loan.status || "Active";
            const daysUntil = getDaysUntilPayment(loan.next_payment_date);
            const statusColor = getStatusColor(status);
            const isLent = loanType === "Lent";

            return (
              <Surface
                key={loan.id}
                style={[styles.loanCard, { backgroundColor: colors.surface }]}
                elevation={1}
              >
                <TouchableOpacity onLongPress={() => showLoanActions(loan)}>
                  <View style={styles.loanHeader}>
                    <View
                      style={[
                        styles.loanIcon,
                        {
                          backgroundColor: `${isLent ? colors.tertiary : colors.error}15`,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={isLent ? "cash-plus" : "hand-coin"}
                        size={24}
                        color={isLent ? colors.tertiary : colors.error}
                      />
                    </View>
                    <View style={styles.loanInfo}>
                      <Text
                        variant="titleMedium"
                        style={{ color: colors.onSurface }}
                      >
                        {loanName}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 4,
                        }}
                      >
                        <View
                          style={{
                            backgroundColor: isLent
                              ? colors.tertiaryContainer
                              : colors.errorContainer,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 12,
                          }}
                        >
                          <Text
                            style={{
                              color: isLent ? colors.tertiary : colors.error,
                              fontSize: 11,
                              fontWeight: "500",
                            }}
                          >
                            {loanType}
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: `${statusColor}20`,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 12,
                          }}
                        >
                          <Text
                            style={{
                              color: statusColor,
                              fontSize: 11,
                              fontWeight: "600",
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            {status}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.loanAmount}>
                      <Text
                        variant="titleMedium"
                        style={{
                          color: isLent ? colors.tertiary : colors.error,
                          fontWeight: "600",
                        }}
                      >
                        {formatAmount(remainingBalance)}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: colors.onSurfaceVariant }}
                      >
                        remaining
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => showLoanActions(loan)}
                      style={styles.menuButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialCommunityIcons
                        name="dots-vertical"
                        size={20}
                        color={colors.onSurfaceVariant}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.loanDetails}>
                    <View style={styles.loanDetailItem}>
                      <Text
                        variant="bodySmall"
                        style={{ color: colors.onSurfaceVariant }}
                      >
                        {loan.loan_type === "Borrowed" ? "Total borrowed" : "Total lent"}
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={{ color: colors.onSurface, fontWeight: "600" }}
                      >
                        {formatAmount(originalAmount)}
                      </Text>
                    </View>
                    <View style={styles.loanDetailItem}>
                      <Text
                        variant="bodySmall"
                        style={{ color: colors.onSurfaceVariant }}
                      >
                        Interest
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={{ color: colors.onSurface, fontWeight: "600" }}
                      >
                        {interestRate}%
                      </Text>
                    </View>
                    <View style={styles.loanDetailItem}>
                      <Text
                        variant="bodySmall"
                        style={{ color: colors.onSurfaceVariant }}
                      >
                        Payment
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={{ color: colors.onSurface, fontWeight: "600" }}
                      >
                        {formatAmount(nextPayment)}
                      </Text>
                    </View>
                  </View>

                  {loan.next_payment_date && (
                    <View style={styles.nextPaymentRow}>
                      <MaterialCommunityIcons
                        name="calendar"
                        size={16}
                        color={colors.onSurfaceVariant}
                      />
                      <Text
                        variant="bodySmall"
                        style={{
                          color: colors.onSurfaceVariant,
                          marginLeft: 4,
                        }}
                      >
                        Next:{" "}
                        {new Date(loan.next_payment_date).toLocaleDateString()}
                        {daysUntil !== null && daysUntil >= 0 && (
                          <Text
                            style={{
                              color:
                                daysUntil <= 7 ? colors.error : colors.primary,
                            }}
                          >
                            {` (${daysUntil} days)`}
                          </Text>
                        )}
                      </Text>
                    </View>
                  )}

                  <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                      <Text
                        variant="bodySmall"
                        style={{ color: colors.onSurfaceVariant }}
                      >
                        Progress
                      </Text>
                      <Text
                        variant="labelSmall"
                        style={{ color: colors.tertiary }}
                      >
                        {progress.toFixed(0)}% paid
                      </Text>
                    </View>
                    <ProgressBar
                      progress={Math.min(progress / 100, 1)}
                      color={colors.tertiary}
                      style={[
                        styles.progressBar,
                        { backgroundColor: `${colors.tertiary}20` },
                      ]}
                    />
                  </View>

                  {/* Both directions on one agreement, plus the statement. */}
                  {status !== "Archived" && (
                    <View style={styles.entryButtonRow}>
                      <TouchableOpacity
                        style={[
                          styles.entryButton,
                          { backgroundColor: colors.primaryContainer },
                        ]}
                        onPress={() =>
                          openPaymentModal(loan, loan.loan_type === "Borrowed" ? "out" : "in")
                        }
                      >
                        <MaterialCommunityIcons
                          name="arrow-bottom-left"
                          size={17}
                          color={colors.primary}
                        />
                        <Text
                          variant="labelMedium"
                          style={{ color: colors.primary, marginLeft: 4 }}
                          numberOfLines={1}
                        >
                          {directionShortLabels(loan)[loan.loan_type === "Borrowed" ? "out" : "in"]}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.entryButton,
                          { backgroundColor: `${colors.tertiary}1f` },
                        ]}
                        onPress={() =>
                          openPaymentModal(loan, loan.loan_type === "Borrowed" ? "in" : "out")
                        }
                      >
                        <MaterialCommunityIcons
                          name="arrow-top-right"
                          size={17}
                          color={colors.tertiary}
                        />
                        <Text
                          variant="labelMedium"
                          style={{ color: colors.tertiary, marginLeft: 4 }}
                          numberOfLines={1}
                        >
                          {directionShortLabels(loan)[loan.loan_type === "Borrowed" ? "in" : "out"]}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.detailsButton,
                      { borderColor: colors.outlineVariant ?? colors.outline },
                    ]}
                    onPress={() => openStatement(loan)}
                  >
                    <MaterialCommunityIcons
                      name="file-document-outline"
                      size={17}
                      color={colors.onSurfaceVariant}
                    />
                    <Text
                      variant="labelMedium"
                      style={{ color: colors.onSurfaceVariant, marginLeft: 5 }}
                    >
                      Statement
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Surface>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="hand-coin-outline"
              size={64}
              color={colors.onSurfaceVariant}
            />
            <Text
              variant="bodyLarge"
              style={{ color: colors.onSurfaceVariant, marginTop: 16 }}
            >
              No active loans
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: colors.onSurfaceVariant, textAlign: "center" }}
            >
              {viewLoans.length > 0
                ? `${viewLoans.length} loan(s) archived/paid off`
                : "Track your loans and payments here"}
            </Text>
          </View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[
          styles.fab,
          { backgroundColor: colors.primary, bottom: 16 + insets.bottom },
        ]}
        color={colors.onPrimary}
        onPress={openModal}
      />

      {/* Add Loan Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={closeModal}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: colors.surface },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text
              variant="titleLarge"
              style={{ color: colors.onSurface, marginBottom: 16 }}
            >
              Add New Loan
            </Text>

            {/* Field order mirrors the web modal (Loans.jsx): name → amounts →
                term → dates → type → category/account → notes. */}
            <TextInput
              label="Loan Name *"
              value={formData.loan_name}
              onChangeText={(text) =>
                setFormData({ ...formData, loan_name: text })
              }
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Original Amount *"
              value={formData.original_amount}
              onChangeText={(text) =>
                setFormData({ ...formData, original_amount: text })
              }
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <TextInput
              label="Interest Rate (%)"
              value={formData.interest_rate}
              onChangeText={(text) =>
                setFormData({ ...formData, interest_rate: text })
              }
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <TextInput
              label="Next Payment Amount"
              value={formData.next_payment}
              onChangeText={(text) =>
                setFormData({ ...formData, next_payment: text })
              }
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <TextInput
              label="Term"
              value={formData.term}
              onChangeText={(text) => setFormData({ ...formData, term: text })}
              mode="outlined"
              keyboardType="number-pad"
              style={styles.input}
            />

            {/* Full width rather than sharing a row with Term — three periods
                don't fit legibly in half a phone screen. */}
            <Text
              variant="bodySmall"
              style={{ color: colors.onSurfaceVariant, marginBottom: 4 }}
            >
              Period
            </Text>
            <SegmentedButtons
              value={formData.term_period}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  term_period: value as TermPeriod,
                })
              }
              buttons={termPeriodOptions}
              density="small"
              style={{ marginBottom: 12 }}
            />

            <DateField
              label="Start Date *"
              value={formData.start_date}
              onChange={(date) =>
                setFormData({ ...formData, start_date: date })
              }
              style={styles.input}
            />

            <DateField
              label="Next Payment Date"
              value={formData.next_payment_date}
              onChange={(date) =>
                setFormData({ ...formData, next_payment_date: date })
              }
              style={styles.input}
            />

            <Text
              variant="bodyMedium"
              style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}
            >
              Loan Type *
            </Text>
            <SegmentedButtons
              value={formData.loan_type}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  loan_type: value as "Borrowed" | "Lent",
                  category_id: "",
                })
              }
              buttons={[
                {
                  value: "Borrowed",
                  label: "Borrowed",
                  icon: "hand-coin",
                },
                {
                  value: "Lent",
                  label: "Lent",
                  icon: "cash-plus",
                },
              ]}
              style={{ marginBottom: 4 }}
            />
            <Text
              variant="bodySmall"
              style={{ color: colors.onSurfaceVariant, marginBottom: 12 }}
            >
              {formData.loan_type === "Borrowed"
                ? "Money you received (Liability)"
                : "Money you gave (Asset)"}
            </Text>

            {/* Category Selection */}
            <Text
              variant="bodyMedium"
              style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}
            >
              Category *
            </Text>
            {formData.category_id && (
              <Chip
                onClose={() => setFormData({ ...formData, category_id: "" })}
                style={{
                  alignSelf: "flex-start",
                  marginBottom: 8,
                  backgroundColor: colors.primaryContainer,
                }}
                textStyle={{ color: colors.primary }}
              >
                {getSelectedCategoryName()}
              </Chip>
            )}
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  borderColor: colors.outline,
                  backgroundColor: colors.surfaceVariant,
                },
              ]}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <Text style={{ color: colors.onSurfaceVariant }}>
                {formData.category_id
                  ? getSelectedCategoryName()
                  : "Select category..."}
              </Text>
              <MaterialCommunityIcons
                name={showCategoryPicker ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.onSurfaceVariant}
              />
            </TouchableOpacity>
            {showCategoryPicker && (
              <Surface
                style={[
                  styles.dropdownList,
                  { backgroundColor: colors.surface },
                ]}
                elevation={2}
              >
                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                  {categories.length === 0 ? (
                    <Text
                      style={{
                        padding: 12,
                        color: colors.onSurfaceVariant,
                        textAlign: "center",
                      }}
                    >
                      No {formData.loan_type === "Lent" ? "asset" : "liability"}{" "}
                      categories
                    </Text>
                  ) : (
                    categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.dropdownItem,
                          String(formData.category_id) === String(cat.id) && {
                            backgroundColor: `${colors.primary}15`,
                          },
                        ]}
                        onPress={() => {
                          setFormData({
                            ...formData,
                            category_id: String(cat.id),
                          });
                          setShowCategoryPicker(false);
                        }}
                      >
                        <Text style={{ color: colors.onSurface }}>
                          {cat.name}
                        </Text>
                        {String(formData.category_id) === String(cat.id) && (
                          <MaterialCommunityIcons
                            name="check"
                            size={18}
                            color={colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </Surface>
            )}

            {/* Account Selection */}
            <Text
              variant="bodyMedium"
              style={{
                color: colors.onSurfaceVariant,
                marginTop: 12,
                marginBottom: 8,
              }}
            >
              Account *
            </Text>
            {formData.account_id && (
              <Chip
                onClose={() => setFormData({ ...formData, account_id: "" })}
                style={{
                  alignSelf: "flex-start",
                  marginBottom: 8,
                  backgroundColor: colors.primaryContainer,
                }}
                textStyle={{ color: colors.primary }}
              >
                {getSelectedAccountName(formData.account_id)}
              </Chip>
            )}
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  borderColor: colors.outline,
                  backgroundColor: colors.surfaceVariant,
                },
              ]}
              onPress={() => setShowAccountPicker(!showAccountPicker)}
            >
              <Text style={{ color: colors.onSurfaceVariant }}>
                {formData.account_id
                  ? getSelectedAccountName(formData.account_id)
                  : "Select account..."}
              </Text>
              <MaterialCommunityIcons
                name={showAccountPicker ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.onSurfaceVariant}
              />
            </TouchableOpacity>
            {showAccountPicker && (
              <Surface
                style={[
                  styles.dropdownList,
                  { backgroundColor: colors.surface },
                ]}
                elevation={2}
              >
                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                  {viewAccounts.length === 0 ? (
                    <Text
                      style={{
                        padding: 12,
                        color: colors.onSurfaceVariant,
                        textAlign: "center",
                      }}
                    >
                      No accounts available
                    </Text>
                  ) : (
                    viewAccounts.map((acc: any) => (
                      <TouchableOpacity
                        key={acc.id}
                        style={[
                          styles.dropdownItem,
                          String(formData.account_id) === String(acc.id) && {
                            backgroundColor: `${colors.primary}15`,
                          },
                        ]}
                        onPress={() => {
                          setFormData({
                            ...formData,
                            account_id: String(acc.id),
                          });
                          setShowAccountPicker(false);
                        }}
                      >
                        <View>
                          <Text style={{ color: colors.onSurface }}>
                            {acc.account_name}
                          </Text>
                          <Text
                            style={{
                              color: colors.onSurfaceVariant,
                              fontSize: 12,
                            }}
                          >
                            {formatAmount(
                              parseFloat(
                                String(acc.current_balance ?? acc.balance ?? 0),
                              ),
                            )}
                          </Text>
                        </View>
                        {String(formData.account_id) === String(acc.id) && (
                          <MaterialCommunityIcons
                            name="check"
                            size={18}
                            color={colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </Surface>
            )}

            <TextInput
              label="Notes"
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={[styles.input, { marginTop: 12 }]}
            />

            <View style={styles.modalButtons}>
              <Button mode="text" onPress={closeModal}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={createMutation.isPending}
              >
                Create Loan
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Statement — the running two-way ledger, PDF and share link */}
      <Portal>
        <Modal
          visible={statementVisible}
          onDismiss={closeStatement}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: colors.surface },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="titleLarge" style={{ color: colors.onSurface }}>
              {selectedLoan?.loan_name || selectedLoan?.name}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: colors.onSurfaceVariant, marginBottom: 16 }}
            >
              {selectedLoan?.loan_type === "Borrowed" ? "Money borrowed" : "Money lent"}
              {selectedLoan?.start_date ? ` · opened ${formatDate(selectedLoan.start_date)}` : ""}
            </Text>

            {statementLoading && (
              <ActivityIndicator style={{ marginVertical: 32 }} color={colors.primary} />
            )}

            {!statementLoading && statement && (
              <>
                <View style={styles.statementCards}>
                  <Surface
                    style={[styles.statementCard, { backgroundColor: colors.surfaceVariant }]}
                    elevation={0}
                  >
                    <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                      {statement.summary.labels.given}
                    </Text>
                    <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: "700" }}>
                      {formatAmount(statement.summary.total_principal)}
                    </Text>
                  </Surface>

                  <Surface
                    style={[styles.statementCard, { backgroundColor: colors.surfaceVariant }]}
                    elevation={0}
                  >
                    <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                      {statement.summary.labels.settled}
                    </Text>
                    <Text variant="titleMedium" style={{ color: colors.tertiary, fontWeight: "700" }}>
                      {formatAmount(statement.summary.total_settled)}
                    </Text>
                  </Surface>

                  <Surface
                    style={[styles.statementCard, { backgroundColor: colors.surfaceVariant }]}
                    elevation={0}
                  >
                    <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                      {statement.summary.labels.outstanding}
                    </Text>
                    <Text variant="titleMedium" style={{ color: colors.error, fontWeight: "700" }}>
                      {formatAmount(statement.summary.outstanding)}
                    </Text>
                  </Surface>

                  {statement.summary.total_interest > 0 && (
                    <Surface
                      style={[styles.statementCard, { backgroundColor: colors.surfaceVariant }]}
                      elevation={0}
                    >
                      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                        Interest
                      </Text>
                      <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: "700" }}>
                        {formatAmount(statement.summary.total_interest)}
                      </Text>
                    </Surface>
                  )}
                </View>

                <View
                  style={[
                    styles.statementBarTrack,
                    { backgroundColor: `${colors.tertiary}25` },
                  ]}
                >
                  <View
                    style={[
                      styles.statementBarFill,
                      {
                        width: `${statement.summary.progress_percent}%`,
                        backgroundColor: colors.tertiary,
                      },
                    ]}
                  />
                </View>
                <Text
                  variant="bodySmall"
                  style={{ color: colors.onSurfaceVariant, marginTop: 6, marginBottom: 16 }}
                >
                  {statement.summary.progress_percent}% settled · opened at{" "}
                  {formatAmount(statement.summary.opening_amount)}
                  {statement.summary.additional_amount > 0
                    ? ` · ${formatAmount(statement.summary.additional_amount)} added later`
                    : ""}
                </Text>

                {!!selectedLoan?.notes && (
                  <Surface
                    style={[styles.shareBox, { backgroundColor: colors.surfaceVariant }]}
                    elevation={0}
                  >
                    <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                      NOTES
                    </Text>
                    <Text
                      variant="bodyMedium"
                      numberOfLines={notesExpanded ? undefined : 8}
                      style={{ color: colors.onSurface, marginTop: 4 }}
                    >
                      {selectedLoan.notes}
                    </Text>
                    {selectedLoan.notes.length > ENTRY_NOTE_LIMIT && (
                      <Text
                        variant="bodySmall"
                        onPress={() => setNotesExpanded((open) => !open)}
                        style={{ color: colors.primary, fontWeight: "600", marginTop: 6 }}
                      >
                        {notesExpanded ? "See less" : "See more"}
                      </Text>
                    )}
                  </Surface>
                )}

                <View style={styles.statementToolbar}>
                  <Button
                    mode={statement.share?.is_shared ? "outlined" : "contained"}
                    icon={statement.share?.is_shared ? "link-off" : "link-variant"}
                    loading={shareBusy}
                    disabled={shareBusy}
                    onPress={() => toggleShareLink(!statement.share?.is_shared)}
                    style={{ flex: 1 }}
                    compact
                  >
                    {statement.share?.is_shared ? "Revoke link" : "Share link"}
                  </Button>
                  <Button
                    mode="outlined"
                    icon="file-pdf-box"
                    onPress={openStatementPdf}
                    style={{ flex: 1 }}
                    compact
                  >
                    PDF
                  </Button>
                </View>

                {statement.share?.is_shared && (
                  <Surface
                    style={[styles.shareBox, { backgroundColor: colors.surfaceVariant }]}
                    elevation={0}
                  >
                    <Text variant="labelMedium" style={{ color: colors.onSurface }}>
                      Anyone with this link can view the statement
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ color: colors.onSurfaceVariant, marginTop: 3 }}
                    >
                      It shows live figures and the PDF, but never your notes.
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ color: colors.primary, marginTop: 8 }}
                      numberOfLines={2}
                    >
                      {statement.share.url}
                    </Text>
                    <View style={styles.shareActions}>
                      <Button mode="contained-tonal" icon="share-variant" onPress={shareStatementLink} compact>
                        Share
                      </Button>
                      <Button mode="outlined" icon="content-copy" onPress={copyStatementLink} compact>
                        Copy
                      </Button>
                    </View>
                  </Surface>
                )}

                <Text
                  variant="titleSmall"
                  style={{ color: colors.onSurface, marginBottom: 4 }}
                >
                  Statement
                </Text>

                {/* Opening row, then every entry with its balance after. */}
                <View
                  style={[
                    styles.statementRow,
                    { borderBottomColor: colors.outlineVariant ?? colors.outline },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <View
                      style={[styles.entryPill, { backgroundColor: `${colors.error}1f` }]}
                    >
                      <Text variant="labelSmall" style={{ color: colors.error }}>
                        Opening
                      </Text>
                    </View>
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                      {selectedLoan?.start_date ? formatDate(selectedLoan.start_date) : "-"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
                      {formatAmount(statement.summary.opening_amount)}
                    </Text>
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                      bal {formatAmount(statement.summary.opening_amount)}
                    </Text>
                  </View>
                </View>

                {statement.entries.map((entry) => (
                  <View
                    key={entry.id}
                    style={[
                      styles.statementRow,
                      { borderBottomColor: colors.outlineVariant ?? colors.outline },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View
                        style={[
                          styles.entryPill,
                          {
                            backgroundColor: entry.is_repayment
                              ? `${colors.tertiary}1f`
                              : `${colors.error}1f`,
                          },
                        ]}
                      >
                        <Text
                          variant="labelSmall"
                          style={{ color: entry.is_repayment ? colors.tertiary : colors.error }}
                        >
                          {entry.label}
                        </Text>
                      </View>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                        {entry.date ? formatDate(entry.date) : "-"}
                        {entry.interest > 0 ? ` · int ${formatAmount(entry.interest)}` : ""}
                      </Text>
                      {!!entry.notes && (
                        <>
                          <Text
                            variant="bodySmall"
                            style={{ color: colors.onSurfaceVariant, marginTop: 2 }}
                          >
                            {expandedEntryNotes.has(entry.id) ||
                            entry.notes.length <= ENTRY_NOTE_LIMIT
                              ? entry.notes
                              : entry.notes.slice(0, ENTRY_NOTE_LIMIT).trimEnd() + "…"}
                          </Text>
                          {entry.notes.length > ENTRY_NOTE_LIMIT && (
                            <Text
                              variant="bodySmall"
                              onPress={() => toggleEntryNote(entry.id)}
                              style={{ color: colors.primary, fontWeight: "600", marginTop: 2 }}
                            >
                              {expandedEntryNotes.has(entry.id) ? "See less" : "See more"}
                            </Text>
                          )}
                        </>
                      )}
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
                        {entry.is_repayment ? "-" : "+"}
                        {formatAmount(entry.amount)}
                      </Text>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                        bal {formatAmount(entry.balance_after)}
                      </Text>
                    </View>
                  </View>
                ))}

                {statement.entries.length === 0 && (
                  <Text
                    variant="bodyMedium"
                    style={{ color: colors.onSurfaceVariant, paddingVertical: 20, textAlign: "center" }}
                  >
                    Nothing recorded on this loan yet.
                  </Text>
                )}
              </>
            )}

            <View style={styles.modalButtons}>
              <Button mode="text" onPress={closeStatement}>
                Close
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Make Payment Modal */}
      <Portal>
        <Modal
          visible={paymentModalVisible}
          onDismiss={closePaymentModal}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: colors.surface },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text
              variant="titleLarge"
              style={{ color: colors.onSurface, marginBottom: 8 }}
            >
              {directionLabels(selectedLoan)[paymentDirection]}
            </Text>
            {selectedLoan && (
              <Text
                variant="bodyMedium"
                style={{ color: colors.onSurfaceVariant, marginBottom: 12 }}
              >
                {selectedLoan.loan_name || selectedLoan.name}
              </Text>
            )}

            {/* Switch direction without leaving the form. */}
            <View
              style={[
                styles.directionSwitch,
                { backgroundColor: colors.surfaceVariant },
              ]}
            >
              {(["in", "out"] as LoanDirection[]).map((option) => {
                const active = paymentDirection === option;
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setPaymentDirection(option)}
                    style={[
                      styles.directionOption,
                      active && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      variant="labelMedium"
                      style={{ color: active ? "#ffffff" : colors.onSurfaceVariant }}
                      numberOfLines={1}
                    >
                      {directionLabels(selectedLoan)[option]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text
              variant="bodySmall"
              style={{ color: colors.onSurfaceVariant, marginBottom: 14 }}
            >
              {isRepaymentDirection(selectedLoan, paymentDirection)
                ? "This reduces the outstanding balance."
                : "This adds to the same agreement — the balance goes up."}
            </Text>

            {selectedLoan && (
              <Surface
                style={[
                  styles.loanInfoCard,
                  { backgroundColor: colors.surfaceVariant },
                ]}
                elevation={0}
              >
                <View style={styles.loanInfoRow}>
                  <Text
                    variant="bodySmall"
                    style={{ color: colors.onSurfaceVariant }}
                  >
                    Remaining Balance:
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={{ color: colors.error, fontWeight: "600" }}
                  >
                    {formatAmount(
                      parseFloat(String(selectedLoan.remaining_balance ?? 0)),
                    )}
                  </Text>
                </View>
                <View style={styles.loanInfoRow}>
                  <Text
                    variant="bodySmall"
                    style={{ color: colors.onSurfaceVariant }}
                  >
                    Suggested Payment:
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={{ color: colors.onSurface, fontWeight: "600" }}
                  >
                    {formatAmount(
                      parseFloat(
                        String(
                          selectedLoan.next_payment ??
                            selectedLoan.monthly_payment ??
                            0,
                        ),
                      ),
                    )}
                  </Text>
                </View>
              </Surface>
            )}

            <TextInput
              label="Amount *"
              value={paymentData.payment_amount}
              onChangeText={(text) =>
                setPaymentData({ ...paymentData, payment_amount: text })
              }
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
            />

            {/* Interest only means anything when the entry settles the loan;
                the rest of the payment comes off the balance automatically. */}
            {isRepaymentDirection(selectedLoan, paymentDirection) && (
              <TextInput
                label="Interest"
                value={paymentData.interest_paid}
                onChangeText={(text) =>
                  setPaymentData({ ...paymentData, interest_paid: text })
                }
                mode="outlined"
                keyboardType="decimal-pad"
                style={styles.input}
              />
            )}

            {/* Account Selection for Payment */}
            <Text
              variant="bodyMedium"
              style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}
            >
              {paymentDirection === "in" ? "Into account *" : "From account *"}
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  borderColor: colors.outline,
                  backgroundColor: colors.surfaceVariant,
                },
              ]}
              onPress={() =>
                setShowPaymentAccountPicker(!showPaymentAccountPicker)
              }
            >
              <Text style={{ color: colors.onSurfaceVariant }}>
                {paymentData.account_id
                  ? getSelectedAccountName(paymentData.account_id)
                  : "Select account..."}
              </Text>
              <MaterialCommunityIcons
                name={showPaymentAccountPicker ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.onSurfaceVariant}
              />
            </TouchableOpacity>
            {showPaymentAccountPicker && (
              <Surface
                style={[
                  styles.dropdownList,
                  { backgroundColor: colors.surface },
                ]}
                elevation={2}
              >
                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                  {viewAccounts.map((acc: any) => (
                    <TouchableOpacity
                      key={acc.id}
                      style={[
                        styles.dropdownItem,
                        String(paymentData.account_id) === String(acc.id) && {
                          backgroundColor: `${colors.primary}15`,
                        },
                      ]}
                      onPress={() => {
                        setPaymentData({
                          ...paymentData,
                          account_id: String(acc.id),
                        });
                        setShowPaymentAccountPicker(false);
                      }}
                    >
                      <View>
                        <Text style={{ color: colors.onSurface }}>
                          {acc.account_name}
                        </Text>
                        <Text
                          style={{
                            color: colors.onSurfaceVariant,
                            fontSize: 12,
                          }}
                        >
                          {formatAmount(
                            parseFloat(
                              String(acc.current_balance ?? acc.balance ?? 0),
                            ),
                          )}
                        </Text>
                      </View>
                      {String(paymentData.account_id) === String(acc.id) && (
                        <MaterialCommunityIcons
                          name="check"
                          size={18}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Surface>
            )}

            <DateField
              label="Payment Date *"
              value={paymentData.payment_date}
              onChange={(date) =>
                setPaymentData({ ...paymentData, payment_date: date })
              }
              style={[styles.input, { marginTop: 12 }]}
            />

            <TextInput
              label="Next Payment Amount"
              value={paymentData.next_payment}
              onChangeText={(text) =>
                setPaymentData({ ...paymentData, next_payment: text })
              }
              mode="outlined"
              keyboardType="decimal-pad"
              placeholder="Optional"
              style={styles.input}
            />

            <DateField
              label="Next Payment Date"
              value={paymentData.next_payment_date}
              onChange={(date) =>
                setPaymentData({ ...paymentData, next_payment_date: date })
              }
              placeholder="YYYY-MM-DD (Optional)"
              style={styles.input}
            />

            <TextInput
              label="Notes"
              value={paymentData.notes}
              onChangeText={(text) =>
                setPaymentData({ ...paymentData, notes: text })
              }
              mode="outlined"
              multiline
              numberOfLines={2}
              placeholder="Optional"
              style={styles.input}
            />

            <View style={styles.modalButtons}>
              <Button mode="text" onPress={closePaymentModal}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleMakePayment}
                loading={paymentMutation.isPending}
              >
                Make Payment
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Action Sheet Modal */}
      <Portal>
        <Modal
          visible={showActionSheet}
          onDismiss={closeActionSheet}
          contentContainerStyle={[
            styles.actionSheetContainer,
            { backgroundColor: colors.surface },
          ]}
        >
          {selectedLoan && (
            <>
              <View style={styles.actionSheetHeader}>
                <View
                  style={[
                    styles.actionSheetIcon,
                    {
                      backgroundColor: `${selectedLoan.loan_type === "Lent" ? colors.tertiary : colors.error}20`,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={
                      selectedLoan.loan_type === "Lent"
                        ? "cash-plus"
                        : "hand-coin"
                    }
                    size={28}
                    color={
                      selectedLoan.loan_type === "Lent"
                        ? colors.tertiary
                        : colors.error
                    }
                  />
                </View>
                <View style={styles.actionSheetInfo}>
                  <Text
                    variant="titleMedium"
                    style={{ color: colors.onSurface }}
                    numberOfLines={1}
                  >
                    {selectedLoan.loan_name ||
                      selectedLoan.name ||
                      "Unnamed Loan"}
                  </Text>
                  <Text
                    variant="titleLarge"
                    style={{
                      color:
                        selectedLoan.loan_type === "Lent"
                          ? colors.tertiary
                          : colors.error,
                      fontWeight: "bold",
                    }}
                  >
                    {formatAmount(
                      parseFloat(
                        String(
                          selectedLoan.remaining_balance ??
                            selectedLoan.principal ??
                            0,
                        ),
                      ),
                    )}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: colors.onSurfaceVariant }}
                  >
                    {selectedLoan.loan_type || "Borrowed"} •{" "}
                    {selectedLoan.status || "Active"}
                  </Text>
                </View>
              </View>

              <Divider style={{ marginVertical: 16 }} />

              {selectedLoan.status === "Active" && (
                <TouchableOpacity
                  style={styles.actionSheetButton}
                  onPress={() => {
                    setShowActionSheet(false);
                    openPaymentModal(selectedLoan);
                  }}
                >
                  <MaterialCommunityIcons
                    name="cash"
                    size={24}
                    color={colors.primary}
                  />
                  <Text
                    variant="bodyLarge"
                    style={[
                      styles.actionSheetButtonText,
                      { color: colors.onSurface },
                    ]}
                  >
                    Make Payment
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color={colors.onSurfaceVariant}
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.actionSheetButton}
                onPress={handleDeletePress}
              >
                <MaterialCommunityIcons
                  name="delete"
                  size={24}
                  color={colors.error}
                />
                <Text
                  variant="bodyLarge"
                  style={[
                    styles.actionSheetButtonText,
                    { color: colors.error },
                  ]}
                >
                  Delete Loan
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={colors.error}
                />
              </TouchableOpacity>

              <Button
                mode="outlined"
                onPress={closeActionSheet}
                style={styles.actionSheetCancel}
              >
                Cancel
              </Button>
            </>
          )}
        </Modal>
      </Portal>

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete loan?"
        message="This action cannot be undone. The loan and all payment history will be permanently removed."
        icon={TriangleAlert}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontWeight: "bold",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "47%",
    padding: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statTextCol: {
    flex: 1,
    minWidth: 0,
  },
  loanCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  loanHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  loanIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  loanInfo: {
    flex: 1,
  },
  loanAmount: {
    alignItems: "flex-end",
  },
  loanDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  loanDetailItem: {
    alignItems: "center",
  },
  nextPaymentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  makePaymentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  // Two-way ledger: one button per direction, side by side.
  entryButtonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  entryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  directionSwitch: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 999,
    gap: 4,
    marginBottom: 12,
  },
  directionOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  // ---- statement modal ----
  statementCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  statementCard: {
    flexGrow: 1,
    flexBasis: "47%",
    padding: 12,
    borderRadius: 12,
  },
  statementBarTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  statementBarFill: {
    height: "100%",
    borderRadius: 999,
  },
  statementRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  entryPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 3,
  },
  shareBox: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  shareActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  statementToolbar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 64,
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxHeight: "70%",
  },
  input: {
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  loanInfoCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  loanInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dropdownList: {
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 8,
    padding: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 6,
  },
  archivedToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  menuButton: {
    padding: 8,
    marginLeft: 4,
    marginRight: -8,
  },
  actionSheetContainer: {
    margin: 16,
    marginTop: "auto",
    borderRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  actionSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionSheetIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  actionSheetInfo: {
    flex: 1,
  },
  actionSheetButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  actionSheetButtonText: {
    flex: 1,
    marginLeft: 16,
  },
  actionSheetCancel: {
    marginTop: 16,
    borderRadius: 12,
  },
  deleteConfirmContainer: {
    margin: 24,
    borderRadius: 20,
    padding: 24,
  },
  deleteConfirmTitle: {
    textAlign: "center",
    marginTop: 16,
    fontWeight: "bold",
  },
  deleteConfirmText: {
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  deleteConfirmButtons: {
    flexDirection: "row",
    gap: 12,
  },
  deleteConfirmButton: {
    flex: 1,
    borderRadius: 12,
  },
});

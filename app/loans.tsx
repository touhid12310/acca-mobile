import React, { useState, useEffect } from "react";
import {
  Share,
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from "react-native";
import {
  Text,
  Surface,
  FAB,
  ActivityIndicator,
  Portal,
  Button,
  ProgressBar,
  Chip,
  SegmentedButtons,
  Divider,
} from "react-native-paper";
import DialogModal from "../src/components/common/DialogModal";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { Link2Off, TriangleAlert } from "lucide-react-native";

import { useTheme } from "../src/contexts/ThemeContext";
import { useCurrency } from "../src/contexts/CurrencyContext";
import { notifyToast } from "../src/contexts/NotificationContext";
import { BrandedHeader, BrandStrip } from "../src/components";
import { ConfirmDialog } from "../src/components/ui";
import loanService, {
  LoanDirection,
  LoanRecord,
  LoanShare,
  LoanStatement,
  LoanStatementEntry,
} from "../src/services/loanService";
import { invalidateMoneyQueries } from "../src/services/moneyQueries";
import { apiErrorMessage } from "../src/utils/apiError";
import accountService from "../src/services/accountService";
import categoryService from "../src/services/categoryService";
import DateField from "../src/components/common/DateField";
import { Loan } from "../src/types";
import {
  formatDate,
  parseCalendarDate,
  toDateInputValue,
  todayDateInputValue,
} from "../src/utils/date";
import { parseDecimalInput, toDecimalInput } from "../src/utils/number";
import { maybeAskForReview } from "../src/services/appReviewService";
import { PaperTextInput as TextInput } from "../src/components/ui/SafeTextInput";

/** Inline edit of one statement entry; strings while the user types. */
type EntryDraft = {
  id: number;
  is_repayment: boolean;
  amount: string;
  interest_paid: string;
  payment_date: string;
  account_id: string;
  notes: string;
};

/**
 * The API wraps payloads as { success, data: { ... } }; apiRequest hands back
 * the whole body, so one more hop is needed to reach the payload.
 */
const unwrapData = <T,>(value: any): T | undefined =>
  (value && typeof value === "object" && "data" in value ? value.data : value) as T | undefined;

/** "1 loan", "2 loans" (QA AE-40). */
const loanCount = (count: number) => `${count} ${count === 1 ? "loan" : "loans"}`;

/** A stored number for an edit box: empty for null / 0 (a term of 0 means "no term"). */
const numberInputValue = (value: unknown): string => {
  const num = parseFloat(String(value ?? ""));
  return Number.isFinite(num) && num !== 0 ? String(num) : "";
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

/**
 * The first advance, without later top-ups. Newer API builds send it as
 * `opening_amount` (QA C5); older ones only for loans that changed sides, so
 * the total stands in.
 */
const openingAmountOf = (loan: LoanRecord): number => {
  const opening = parseFloat(String(loan.opening_amount ?? ""));
  if (Number.isFinite(opening) && opening > 0) return opening;
  return parseFloat(String(loan.original_amount ?? loan.principal ?? 0)) || 0;
};

/** Which side a changed-sides loan started on, from whatever the API sent. */
const openingSideOf = (
  loan: LoanRecord | null,
  summary?: LoanStatement["summary"],
): "Borrowed" | "Lent" | null => {
  if (summary?.opening_type) return summary.opening_type;
  if (loan?.opening_type === "Borrowed" || loan?.opening_type === "Lent") {
    return loan.opening_type;
  }
  if (summary?.opening_label === "you owe") return "Borrowed";
  if (summary?.opening_label === "owed to you") return "Lent";
  return null;
};

/**
 * Start and next-payment dates arrive as UTC midnight; show that calendar
 * day, not the local time of the instant (a day early west of UTC).
 */
const formatCalendarDate = (value: string) =>
  formatDate(toDateInputValue(parseCalendarDate(value)));

// Plain words only: the field messages, never "Validation failed / field: …".
const formatApiError = (result: any): string => apiErrorMessage(result);

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
  const [editingEntry, setEditingEntry] = useState<EntryDraft | null>(null);
  const [entryBusy, setEntryBusy] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<LoanStatementEntry | null>(null);
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
  // The loan the form is editing, or null while it creates one (QA AE-19).
  const [editingLoan, setEditingLoan] = useState<LoanRecord | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

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
        original_amount: parseDecimalInput(data.original_amount),
        interest_rate: parseDecimalInput(data.interest_rate),
        next_payment: parseDecimalInput(data.next_payment),
        // Term is optional: an empty box sends no term, not 0.
        term: parseInt(data.term) || undefined,
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
      // The opening transaction moves an account and shows on Activity,
      // Home and Reports too (QA AE-07).
      void invalidateMoneyQueries(queryClient);
      closeModal();
    },
    onError: (error: Error) => notifyToast.error(error.message),
  });

  // Edit Loan (QA AE-19, contract C5): sends the opening amount; the server
  // keeps top-ups and repayments and rewrites the opening row in place.
  const updateMutation = useMutation({
    mutationFn: async ({ loan, data }: { loan: LoanRecord; data: typeof formData }) => {
      const opening = roundMoney(parseDecimalInput(data.original_amount));
      const total = parseFloat(String(loan.original_amount ?? 0)) || 0;
      const openingBefore = openingAmountOf(loan);
      // Top-ups stay on the loan, so older API builds (which read only the
      // total) get the opening plus whatever was added later. An untouched
      // opening sends the total back unchanged — a loan that changed sides
      // refuses any other total on those builds.
      const topUps = Math.max(0, roundMoney(total - openingBefore));
      const openingChanged = Math.abs(opening - openingBefore) > 0.009;
      const term = parseInt(data.term, 10);
      const result = await loanService.update(loan.id, {
        loan_name: data.loan_name.trim(),
        opening_amount: opening,
        original_amount: openingChanged ? roundMoney(opening + topUps) : total,
        interest_rate: parseDecimalInput(data.interest_rate),
        next_payment: parseDecimalInput(data.next_payment),
        term: term > 0 ? term : null,
        term_period: data.term_period,
        start_date: data.start_date || todayDateInputValue(),
        next_payment_date: data.next_payment_date || null,
        loan_type: loan.loan_type || data.loan_type,
        account_id: parseInt(data.account_id, 10),
        category_id: parseInt(data.category_id, 10) || null,
        notes: data.notes.trim() || null,
      });
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: () => {
      void invalidateMoneyQueries(queryClient);
      closeModal();
      notifyToast.success("Loan updated");
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
      const amount = parseDecimalInput(data.payment_amount);

      const payload = {
        payment_amount: amount,
        direction: paymentDirection,
        // Money going the other way is fresh principal: no interest split.
        principal_paid: settling
          ? undefined
          : amount,
        interest_paid: settling
          ? (data.interest_paid ? parseDecimalInput(data.interest_paid) : 0)
          : 0,
        account_id: parseInt(data.account_id) || undefined,
        payment_date:
          data.payment_date || todayDateInputValue(),
        next_payment: data.next_payment
          ? parseDecimalInput(data.next_payment)
          : undefined,
        next_payment_date: data.next_payment_date || undefined,
        notes: data.notes || undefined,
      };
      const result = await loanService.makePayment(id, payload);
      if (!result.success) throw new Error(formatApiError(result));
      return result;
    },
    onSuccess: (result) => {
      // Activity "All" / Liabilities, Home and the accounts all show the new
      // entry straight away (QA AE-07).
      void invalidateMoneyQueries(queryClient);
      closePaymentModal();
      // Settling a loan in full is one of the app's real "done" moments.
      type Outcome = { loan?: { status?: string }; changed_sides?: boolean };
      const body = result?.data as (Outcome & { data?: Outcome; message?: string }) | undefined;
      const outcome = body?.data ?? body;
      // Paid more than was owed: say who owes whom now.
      if (outcome?.changed_sides) {
        notifyToast.success(body?.message ?? "Settled. The loan changed sides.");
      }
      if (outcome?.loan?.status === "Paid Off") void maybeAskForReview("loan_paid_off");
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
      // Every transaction on the loan was archived, so balances, Activity and
      // Home change too (QA AE-122, AE-07).
      void invalidateMoneyQueries(queryClient);
      notifyToast.success("Loan deleted. Its transactions are in Archived.");
    },
    onError: (error: Error) => notifyToast.error(error.message),
  });

  const openModal = () => {
    const defaultAccountId = accounts?.[0]?.id ? String(accounts[0].id) : "";

    setEditingLoan(null);
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

  // The calendar day of a stored date ("2026-11-19T00:00:00Z" → "2026-11-19").
  const toDateField = (value?: string | null) =>
    value ? toDateInputValue(parseCalendarDate(value)) : "";

  const openEditModal = (loan: LoanRecord) => {
    setEditingLoan(loan);
    setFormData({
      loan_name: loan.loan_name || loan.name || "",
      // The box edits the opening amount; top-ups stay as recorded.
      original_amount: String(openingAmountOf(loan) || ""),
      interest_rate: numberInputValue(loan.interest_rate),
      next_payment: numberInputValue(loan.next_payment),
      term: numberInputValue(loan.term),
      term_period: (["weeks", "months", "years"].includes(String(loan.term_period))
        ? loan.term_period
        : "years") as TermPeriod,
      start_date: toDateField(loan.start_date) || todayDateInputValue(),
      next_payment_date: toDateField(loan.next_payment_date),
      loan_type: loan.loan_type === "Lent" ? "Lent" : "Borrowed",
      account_id: loan.account_id ? String(loan.account_id) : "",
      category_id: loan.category_id ? String(loan.category_id) : "",
      notes: loan.notes || "",
    });
    setShowCategoryPicker(false);
    setShowAccountPicker(false);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingLoan(null);
    setShowCategoryPicker(false);
    setShowAccountPicker(false);
  };

  /** Mirrors LoanLedgerService: which direction settles this kind of loan. */
  const isRepaymentDirection = (loan: Loan | null, direction: LoanDirection) =>
    loan?.loan_type === "Borrowed" ? direction === "out" : direction === "in";

  /**
   * How far a repayment goes past what is owed. The backend settles the loan
   * and carries the extra over to the other side, so it is shown, not refused.
   */
  const overpaymentExtra = (
    loan: Loan | null,
    direction: LoanDirection,
    data: { payment_amount: string; interest_paid?: string },
  ) => {
    if (!loan || !isRepaymentDirection(loan, direction)) return 0;
    const total = parseDecimalInput(data.payment_amount, NaN);
    if (!Number.isFinite(total)) return 0;
    const interest = parseDecimalInput(data.interest_paid ?? "");
    const extra = total - interest - parseFloat(String(loan.remaining_balance ?? 0));
    return extra > 0.009 ? Math.round(extra * 100) / 100 : 0;
  };

  const directionLabels = (loan: Loan | null) =>
    loan?.loan_type === "Borrowed"
      ? { in: "Borrowed more", out: "Repayment sent" }
      : { in: "Payment received", out: "Amount given" };

  /** One word each for the card buttons — the full phrases wrap on narrow phones. */
  const directionShortLabels = (loan: Loan | null) =>
    loan?.loan_type === "Borrowed"
      ? { in: "Borrowed", out: "Repaid" }
      : { in: "Received", out: "Given" };

  // Defaults to the direction that pays the loan down: "out" on a Borrowed
  // loan ("in" there would be borrowing more), "in" on a Lent one.
  const openPaymentModal = (
    loan: Loan,
    direction: LoanDirection = loan.loan_type === "Borrowed" ? "out" : "in",
  ) => {
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
      parseDecimalInput(formData.original_amount) <= 0
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
    if (editingLoan) {
      // Same rule as the web form: the loan can't end up smaller than what
      // has already been repaid. A loan that changed sides is checked by the
      // server, which replays its whole ledger.
      if (!editingLoan.opening_type) {
        const total = parseFloat(String(editingLoan.original_amount ?? 0)) || 0;
        const remaining = parseFloat(String(editingLoan.remaining_balance ?? 0)) || 0;
        const repaid = Math.max(0, roundMoney(total - remaining));
        const topUps = Math.max(0, roundMoney(total - openingAmountOf(editingLoan)));
        const opening = parseDecimalInput(formData.original_amount);
        if (opening + topUps < repaid - 0.009) {
          notifyToast.error(
            `The opening amount can't be less than ${formatAmount(Math.max(0, repaid - topUps))} — that much has already been repaid.`,
          );
          return;
        }
      }
      updateMutation.mutate({ loan: editingLoan, data: formData });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleMakePayment = () => {
    if (!selectedLoan) return;
    const amount = parseDecimalInput(paymentData.payment_amount);
    const interest = paymentData.interest_paid
      ? parseDecimalInput(paymentData.interest_paid, NaN)
      : 0;
    if (!amount || amount <= 0) {
      notifyToast.error("Please enter a valid payment amount");
      return;
    }
    // The interest split only applies when settling the loan. More than is
    // owed is fine: the backend settles it and carries the extra over to the
    // other side (see overpaymentExtra).
    const settlingEntry = isRepaymentDirection(selectedLoan, paymentDirection);
    if (settlingEntry && (!Number.isFinite(interest) || interest < 0 || interest > amount)) {
      notifyToast.error("Interest cannot be negative or larger than the payment.");
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

  // Archived loans are read-only; the server refuses changes too.
  const entriesEditable = selectedLoan?.status !== "Archived";

  // Overpaying a loan moves the balance to the other side. The statement then
  // has to say where it started, or it reads as money given (QA AE-126).
  const statementChangedSides =
    !!statement &&
    (statement.summary.changed_sides === true ||
      !!(selectedLoan as LoanRecord | null)?.opening_type);
  const statementOpeningSide = statementChangedSides
    ? openingSideOf(selectedLoan as LoanRecord | null, statement?.summary)
    : null;

  // An entry change rewrites its transaction and the loan balance, so the
  // statement, loan cards, accounts and transactions all refetch.
  const afterEntryChange = async (result: any) => {
    const payload: any = unwrapData(result.data);
    const loan = payload?.loan ?? payload?.data?.loan;
    if (loan) setSelectedLoan((prev) => (prev ? { ...prev, ...loan } : prev));
    if (selectedLoan) {
      try {
        const fresh = await loanService.getStatement(selectedLoan.id);
        if (fresh.success) setStatement(unwrapData(fresh.data) as LoanStatement);
      } catch {
        // The toast below still confirms the change; a reopen will refresh.
      }
    }
    void invalidateMoneyQueries(queryClient);
  };

  const startEditEntry = (entry: LoanStatementEntry) =>
    setEditingEntry({
      id: entry.id,
      is_repayment: entry.is_repayment,
      amount: String(entry.amount ?? ""),
      interest_paid: String(entry.interest || 0),
      payment_date: entry.date || "",
      account_id: entry.account_id ? String(entry.account_id) : "",
      notes: entry.notes || "",
    });

  const setEntryField = (key: keyof EntryDraft, value: string) =>
    setEditingEntry((prev) => (prev ? { ...prev, [key]: value } : prev));

  const saveEntry = async () => {
    const draft = editingEntry;
    if (!draft || !selectedLoan) return;
    const amount = parseDecimalInput(draft.amount, NaN);
    const interest = draft.is_repayment ? parseDecimalInput(draft.interest_paid) : 0;
    if (!(amount > 0)) return notifyToast.error("Enter an amount above zero.");
    if (interest < 0 || interest > amount) {
      return notifyToast.error("Interest must be between 0 and the amount.");
    }
    if (!draft.payment_date) return notifyToast.error("Pick a date.");
    if (!draft.account_id) return notifyToast.error("Pick an account.");

    setEntryBusy(true);
    try {
      const result = await loanService.updateEntry(selectedLoan.id, draft.id, {
        amount,
        interest_paid: interest,
        payment_date: draft.payment_date,
        account_id: Number(draft.account_id),
        notes: draft.notes.trim() || null,
      });
      if (result.success) {
        setEditingEntry(null);
        await afterEntryChange(result);
        notifyToast.success("Entry updated — transaction and balances adjusted.");
      } else {
        notifyToast.error(formatApiError(result) || "Could not update the entry.");
      }
    } catch (error: any) {
      notifyToast.error(error?.message || "Could not update the entry.");
    } finally {
      setEntryBusy(false);
    }
  };

  const deleteEntry = async () => {
    const entry = entryToDelete;
    if (!entry || !selectedLoan) return;
    setEntryBusy(true);
    try {
      const result = await loanService.deleteEntry(selectedLoan.id, entry.id);
      if (result.success) {
        setEntryToDelete(null);
        await afterEntryChange(result);
        notifyToast.success("Entry deleted — its transaction was moved to Archived.");
      } else {
        notifyToast.error(formatApiError(result) || "Could not delete the entry.");
      }
    } catch (error: any) {
      notifyToast.error(error?.message || "Could not delete the entry.");
    } finally {
      setEntryBusy(false);
    }
  };

  const closeStatement = () => {
    setStatementVisible(false);
    setStatement(null);
    setEditingEntry(null);
    setEntryToDelete(null);
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

  // Revoking can't be undone (sharing again makes a new link), so it asks
  // first (QA AE-67); creating a link needs no confirmation.
  const handleShareButton = () => {
    if (statement?.share?.is_shared) {
      setShowRevokeConfirm(true);
      return;
    }
    void toggleShareLink(true);
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
        setShowRevokeConfirm(false);
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
      setShowRevokeConfirm(false);
      notifyToast.error(error instanceof Error ? error.message : "Could not update the link.");
    } finally {
      setShareBusy(false);
    }
  };

  const shareStatementLink = async () => {
    const url = statement?.share?.url;
    if (!url) return;
    const name = selectedLoan?.loan_name ?? "Loan";
    try {
      // iOS shares message and url as separate items, so a url inside the
      // message would arrive twice; Android only sends the message.
      await Share.share(
        Platform.OS === "ios"
          ? { message: `${name} statement`, url }
          : { message: `${name} statement: ${url}` },
      );
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

  const handleEditPress = () => {
    const loan = selectedLoan;
    setShowActionSheet(false);
    setSelectedLoan(null);
    // Let the sheet close first (same pause as Delete) so the form opens on top.
    if (loan) setTimeout(() => openEditModal(loan), 200);
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
    // Whole calendar days between local midnights (round absorbs DST hours).
    const paymentDate = parseCalendarDate(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = paymentDate.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  // Only a pull shows the spinner; refetches after a save stay silent (on iOS
  // a programmatic refresh would also push the list down).
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const handlePullRefresh = async () => {
    setPullRefreshing(true);
    try {
      await refetch();
    } finally {
      setPullRefreshing(false);
    }
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
            refreshing={pullRefreshing}
            onRefresh={handlePullRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
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
                {loanCount(borrowedLoans.length)}
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
                {loanCount(lentLoans.length)}
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
                {activeLoans.length === 1 ? "loan" : "loans"}
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
                        {formatCalendarDate(loan.next_payment_date)}
                        {daysUntil !== null && daysUntil >= 0 && (
                          <Text
                            style={{
                              color:
                                daysUntil <= 7 ? colors.error : colors.primary,
                            }}
                          >
                            {daysUntil === 0
                              ? " (today)"
                              : ` (${daysUntil} ${daysUntil === 1 ? "day" : "days"})`}
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
                ? `${loanCount(viewLoans.length)} archived or paid off`
                : "Track your loans and payments here"}
            </Text>
            <TouchableOpacity
              style={[
                styles.createFirstButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => openModal()}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              <Text style={styles.createFirstButtonText}>Add Loan</Text>
            </TouchableOpacity>
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
        <DialogModal
          visible={modalVisible}
          onDismiss={closeModal}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: colors.surface },
          ]}
        >
          {/* automaticallyAdjustKeyboardInsets: on iOS the keyboard covers the
              lower part of this centred sheet; the inset lets the focused
              field and the buttons scroll above it. */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
          >
            <Text
              variant="titleLarge"
              style={{ color: colors.onSurface, marginBottom: 16 }}
            >
              {editingLoan ? "Edit Loan" : "Add New Loan"}
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
              label={editingLoan ? "Opening Amount *" : "Original Amount *"}
              value={formData.original_amount}
              onChangeText={(text) =>
                setFormData({ ...formData, original_amount: toDecimalInput(text) })
              }
              mode="outlined"
              keyboardType="decimal-pad"
              returnKeyType="done"
              style={editingLoan ? styles.inputWithHint : styles.input}
            />
            {editingLoan && (
              <Text
                variant="bodySmall"
                style={{ color: colors.onSurfaceVariant, marginBottom: 12 }}
              >
                {(() => {
                  const topUps = Math.max(
                    0,
                    roundMoney(
                      (parseFloat(String(editingLoan.original_amount ?? 0)) || 0) -
                        openingAmountOf(editingLoan),
                    ),
                  );
                  return topUps > 0
                    ? `The first amount ${editingLoan.loan_type === "Lent" ? "lent" : "borrowed"}. ${formatAmount(topUps)} added later and every repayment stay as recorded.`
                    : `The first amount ${editingLoan.loan_type === "Lent" ? "lent" : "borrowed"}. Repayments stay as recorded.`;
                })()}
              </Text>
            )}

            <TextInput
              label="Interest Rate (%)"
              value={formData.interest_rate}
              onChangeText={(text) =>
                setFormData({ ...formData, interest_rate: toDecimalInput(text) })
              }
              mode="outlined"
              keyboardType="decimal-pad"
              returnKeyType="done"
              style={styles.input}
            />

            <TextInput
              label="Next Payment Amount"
              value={formData.next_payment}
              onChangeText={(text) =>
                setFormData({ ...formData, next_payment: toDecimalInput(text) })
              }
              mode="outlined"
              keyboardType="decimal-pad"
              returnKeyType="done"
              style={styles.input}
            />

            <TextInput
              label="Term"
              value={formData.term}
              onChangeText={(text) => setFormData({ ...formData, term: text })}
              mode="outlined"
              keyboardType="number-pad"
              returnKeyType="done"
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
              Loan Type{editingLoan ? "" : " *"}
            </Text>
            {/* The side is fixed once the loan exists: its entries were
                recorded against it. Only a new loan picks one. */}
            {editingLoan ? (
              <Text
                variant="bodyLarge"
                style={{ color: colors.onSurface, marginBottom: 4 }}
              >
                {formData.loan_type}
              </Text>
            ) : (
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
            )}
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
                loading={createMutation.isPending || updateMutation.isPending}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingLoan ? "Save changes" : "Create loan"}
              </Button>
            </View>
          </ScrollView>
        </DialogModal>
      </Portal>

      {/* Statement — the running two-way ledger, PDF and share link */}
      <Portal>
        <DialogModal
          visible={statementVisible}
          onDismiss={closeStatement}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: colors.surface },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
          >
            <Text variant="titleLarge" style={{ color: colors.onSurface }}>
              {selectedLoan?.loan_name || selectedLoan?.name}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: colors.onSurfaceVariant, marginBottom: 16 }}
            >
              {/* A loan that changed sides started the other way round: say
                  both, or "Money lent" reads as if money was given (AE-126). */}
              {statementOpeningSide && statementOpeningSide !== selectedLoan?.loan_type
                ? `Started as money ${statementOpeningSide === "Borrowed" ? "borrowed" : "lent"} · now ${selectedLoan?.loan_type === "Borrowed" ? "you owe" : "owed to you"}`
                : selectedLoan?.loan_type === "Borrowed"
                  ? "Money borrowed"
                  : "Money lent"}
              {selectedLoan?.start_date ? ` · opened ${formatCalendarDate(selectedLoan.start_date)}` : ""}
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
                  {statementChangedSides && statementOpeningSide
                    ? // "added later" would count the overpayment as fresh
                      // money; spell out what happened instead (AE-126).
                      `${statementOpeningSide === "Borrowed" ? "You borrowed" : "You lent"} ${formatAmount(statement.summary.opening_amount)}. ` +
                      `More was paid back than was owed, so the loan changed sides` +
                      (statement.summary.outstanding > 0
                        ? selectedLoan?.loan_type === "Borrowed"
                          ? `: you now owe ${formatAmount(statement.summary.outstanding)}.`
                          : `: they now owe you ${formatAmount(statement.summary.outstanding)}.`
                        : ".")
                    : `${statement.summary.progress_percent}% settled · opened at ${formatAmount(statement.summary.opening_amount)}` +
                      (statement.summary.additional_amount > 0
                        ? ` · ${formatAmount(statement.summary.additional_amount)} added later`
                        : "")}
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
                    onPress={handleShareButton}
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

                {/* Oldest first with the Opening on top, the same order as the
                    PDF and the share page (QA AE-85). The API sends entries
                    oldest-first with a running balance_after. Change the
                    opening with the loan's Edit. */}
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
                        {statementOpeningSide
                          ? `Opening · ${statementOpeningSide === "Borrowed" ? "borrowed" : "lent"}`
                          : "Opening"}
                      </Text>
                    </View>
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                      {selectedLoan?.start_date ? formatCalendarDate(selectedLoan.start_date) : "-"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
                      {formatAmount(statement.summary.opening_amount)}
                    </Text>
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                      bal {formatAmount(statement.summary.opening_amount)}
                      {statementOpeningSide
                        ? ` · ${statement.summary.opening_label || (statementOpeningSide === "Borrowed" ? "you owe" : "owed to you")}`
                        : ""}
                    </Text>
                  </View>
                </View>

                {statement.entries.map((entry, entryIndex) =>
                  editingEntry?.id === entry.id ? (
                  <View
                    key={entry.id}
                    style={[
                      styles.entryEditCard,
                      { borderColor: colors.primary, backgroundColor: colors.surfaceVariant },
                    ]}
                  >
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
                    <DateField
                      label="Date *"
                      value={editingEntry.payment_date}
                      onChange={(date) => setEntryField("payment_date", date)}
                      style={styles.input}
                    />
                    <TextInput
                      label="Amount *"
                      value={editingEntry.amount}
                      onChangeText={(text) => setEntryField("amount", toDecimalInput(text))}
                      mode="outlined"
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      style={styles.input}
                    />
                    {entry.is_repayment && (
                      <TextInput
                        label="Interest"
                        value={editingEntry.interest_paid}
                        onChangeText={(text) =>
                          setEntryField("interest_paid", toDecimalInput(text))
                        }
                        mode="outlined"
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        style={styles.input}
                      />
                    )}
                    <Text
                      variant="bodySmall"
                      style={{ color: colors.onSurfaceVariant, marginBottom: 6 }}
                    >
                      Account *
                    </Text>
                    <View style={styles.entryAccountChips}>
                      {viewAccounts.map((acc: any) => {
                        const active = editingEntry.account_id === String(acc.id);
                        return (
                          <TouchableOpacity
                            key={acc.id}
                            activeOpacity={0.8}
                            onPress={() => setEntryField("account_id", String(acc.id))}
                            style={[
                              styles.entryAccountChip,
                              {
                                backgroundColor: active ? `${colors.primary}20` : colors.surface,
                                borderColor: active ? colors.primary : colors.outline,
                              },
                            ]}
                          >
                            <Text
                              variant="labelMedium"
                              numberOfLines={1}
                              style={{ color: active ? colors.primary : colors.onSurfaceVariant }}
                            >
                              {acc.account_name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <TextInput
                      label="Notes"
                      value={editingEntry.notes}
                      onChangeText={(text) => setEntryField("notes", text)}
                      mode="outlined"
                      multiline
                      style={styles.input}
                    />
                    <View style={styles.entryEditButtons}>
                      <Button
                        mode="text"
                        onPress={() => setEditingEntry(null)}
                        disabled={entryBusy}
                      >
                        Cancel
                      </Button>
                      <Button
                        mode="contained"
                        onPress={saveEntry}
                        loading={entryBusy}
                        disabled={entryBusy}
                      >
                        Save
                      </Button>
                    </View>
                  </View>
                  ) : (
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
                            backgroundColor:
                              entry.is_repayment || entry.crossed_over
                                ? `${colors.tertiary}1f`
                                : `${colors.error}1f`,
                          },
                        ]}
                      >
                        <Text
                          variant="labelSmall"
                          style={{
                            color:
                              entry.is_repayment || entry.crossed_over
                                ? colors.tertiary
                                : colors.error,
                          }}
                        >
                          {entry.label}
                        </Text>
                      </View>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                        {entry.date ? formatDate(entry.date) : "-"}
                        {entry.interest > 0 ? ` · int ${formatAmount(entry.interest)}` : ""}
                      </Text>
                      {/* The row where an overpayment moved the balance across:
                          the server's own wording when it sends one. */}
                      {entry.detail ? (
                        <Text
                          variant="bodySmall"
                          style={[styles.sideChangeNote, { color: colors.primary }]}
                        >
                          {entry.detail}
                        </Text>
                      ) : (
                        (() => {
                          const before =
                            entryIndex === 0
                              ? statementOpeningSide
                              : statement.entries[entryIndex - 1]?.balance_side;
                          return !!before && !!entry.balance_side && entry.balance_side !== before;
                        })() && (
                          <Text
                            variant="bodySmall"
                            style={[styles.sideChangeNote, { color: colors.primary }]}
                          >
                            {entry.balance_side === "Lent"
                              ? "Paid back more than was owed: the rest is now owed to you"
                              : "Paid back more than was owed: you now owe the rest"}
                          </Text>
                        )
                      )}
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
                        {entry.is_repayment || entry.crossed_over ? "-" : "+"}
                        {formatAmount(entry.amount)}
                      </Text>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                        bal {formatAmount(entry.balance_after)}
                        {entry.balance_label ? ` · ${entry.balance_label}` : ""}
                      </Text>
                      {entriesEditable && (
                        <View style={styles.entryActions}>
                          <TouchableOpacity
                            onPress={() => startEditEntry(entry)}
                            disabled={entryBusy || !!editingEntry}
                            hitSlop={8}
                            style={[styles.entryActionBtn, { borderColor: colors.outline }]}
                            accessibilityLabel="Edit entry"
                          >
                            <MaterialCommunityIcons
                              name="pencil-outline"
                              size={16}
                              color={colors.onSurfaceVariant}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setEntryToDelete(entry)}
                            disabled={entryBusy || !!editingEntry}
                            hitSlop={8}
                            style={[styles.entryActionBtn, { borderColor: colors.outline }]}
                            accessibilityLabel="Delete entry"
                          >
                            <MaterialCommunityIcons
                              name="delete-outline"
                              size={16}
                              color={colors.error}
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                  )
                )}

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
        </DialogModal>
      </Portal>

      {/* Make Payment Modal */}
      <Portal>
        <DialogModal
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
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
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
                setPaymentData({ ...paymentData, payment_amount: toDecimalInput(text) })
              }
              mode="outlined"
              keyboardType="decimal-pad"
              returnKeyType="done"
              style={styles.input}
            />

            {/* Interest only means anything when the entry settles the loan;
                the rest of the payment comes off the balance automatically. */}
            {isRepaymentDirection(selectedLoan, paymentDirection) && (
              <TextInput
                label="Interest"
                value={paymentData.interest_paid}
                onChangeText={(text) =>
                  setPaymentData({ ...paymentData, interest_paid: toDecimalInput(text) })
                }
                mode="outlined"
                keyboardType="decimal-pad"
                returnKeyType="done"
                style={styles.input}
              />
            )}

            {selectedLoan &&
              (() => {
                const extra = overpaymentExtra(selectedLoan, paymentDirection, paymentData);
                if (!extra) return null;
                const who =
                  selectedLoan.loan_type === "Borrowed"
                    ? `${selectedLoan.loan_name} will owe you ${formatAmount(extra)}`
                    : `you will owe ${selectedLoan.loan_name} ${formatAmount(extra)}`;
                return (
                  <Text variant="bodySmall" style={{ color: colors.primary, marginBottom: 12 }}>
                    That is {formatAmount(extra)} more than is owed. The loan will be settled and
                    change sides — {who}.
                  </Text>
                );
              })()}

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
                setPaymentData({ ...paymentData, next_payment: toDecimalInput(text) })
              }
              mode="outlined"
              keyboardType="decimal-pad"
              returnKeyType="done"
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
        </DialogModal>
      </Portal>

      {/* Action Sheet Modal */}
      <Portal>
        <DialogModal
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

              {/* Archived loans are read-only (the server refuses edits). */}
              {selectedLoan.status !== "Archived" && (
                <TouchableOpacity
                  style={styles.actionSheetButton}
                  onPress={handleEditPress}
                >
                  <MaterialCommunityIcons
                    name="pencil"
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
                    Edit Loan
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
        </DialogModal>
      </Portal>

      {/* Says what really happens (QA AE-122): nothing is wiped, every
          transaction on the loan moves to Archived and the balances go back. */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete loan?"
        message={
          "The loan is removed and all of its transactions — the opening amount and every payment or top-up recorded on it — move to Archived. " +
          "Your account balances go back to how they were without this loan. " +
          "The loan can't be brought back, and its archived transactions can't be restored on their own."
        }
        icon={TriangleAlert}
        confirmLabel="Delete loan"
        loading={deleteMutation.isPending}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
      />

      <ConfirmDialog
        visible={showRevokeConfirm}
        title="Revoke the public link?"
        message="Anyone who opens the current link will see that it was revoked. If you share the statement again, you'll get a new link — this one won't work again."
        icon={Link2Off}
        confirmLabel="Revoke link"
        loading={shareBusy}
        onCancel={() => setShowRevokeConfirm(false)}
        onConfirm={() => void toggleShareLink(false)}
      />

      <ConfirmDialog
        visible={!!entryToDelete}
        title="Delete this entry?"
        message={
          entryToDelete
            ? `${entryToDelete.label} of ${formatAmount(entryToDelete.amount)}` +
              (entryToDelete.date ? ` on ${formatDate(entryToDelete.date)}` : "") +
              ". Its transaction will be moved to Archived, the account balance adjusted, and the loan balance recalculated."
            : ""
        }
        icon={TriangleAlert}
        confirmLabel="Delete"
        loading={entryBusy}
        onCancel={() => setEntryToDelete(null)}
        onConfirm={deleteEntry}
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
  // Two tiles a row. Paper's Surface on iOS keeps only some layout props
  // (width, flexGrow…) on its outer shadow view, so a minWidth never reached
  // the row there and all four tiles squeezed onto one line.
  statCard: {
    flexGrow: 1,
    width: "47%",
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
  createFirstButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    minHeight: 44,
    marginTop: 20,
  },
  createFirstButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: 20,
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
  // A field with a hint line under it; the hint carries the gap.
  inputWithHint: {
    marginBottom: 4,
  },
  sideChangeNote: {
    marginTop: 4,
    fontStyle: "italic",
  },
  entryActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  entryActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  entryEditCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    gap: 4,
  },
  entryAccountChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  entryAccountChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: "100%",
  },
  entryEditButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
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

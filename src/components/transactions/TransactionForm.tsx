import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  SegmentedButtons,
  Portal,
  Modal,
  List,
  Divider,
  IconButton,
  ActivityIndicator,
  Surface,
  Chip,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useQuery } from '@tanstack/react-query';

import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import categoryService from '../../services/categoryService';
import accountService from '../../services/accountService';
import { Transaction, TransactionType, Category, Account, AccountType } from '../../types';
import { formatDate } from '../../utils/date';

// Helper to categorize account type as Asset or Liability
const ASSET_ACCOUNT_TYPES: AccountType[] = ['checking', 'savings', 'cash', 'investment'];
const LIABILITY_ACCOUNT_TYPES: AccountType[] = ['credit', 'loan'];

const getAccountCategory = (accountType?: AccountType): string => {
  if (!accountType) return '';
  if (ASSET_ACCOUNT_TYPES.includes(accountType)) return 'Asset';
  if (LIABILITY_ACCOUNT_TYPES.includes(accountType)) return 'Liability';
  return accountType;
};

const formatAccountType = (accountType?: AccountType): string => {
  if (!accountType) return '';
  const category = getAccountCategory(accountType);
  const typeLabel = accountType.charAt(0).toUpperCase() + accountType.slice(1);
  return `${category} • ${typeLabel}`;
};

type TransactionFormData = {
  type: TransactionType;
  amount: string;
  date: Date;
  merchant_name: string;
  description: string;
  category_id: number | null;
  subcategory_id: number | null;
  account_id: number | null;
  to_account_id: number | null; // For transfers
  notes: string;
  receipt?: {
    uri: string;
    type: string;
    name: string;
  } | null;
};

type Props = {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  initialData?: Partial<Transaction>;
  isLoading?: boolean;
  title?: string;
};

export default function TransactionForm({
  visible,
  onDismiss,
  onSubmit,
  initialData,
  isLoading = false,
  title = 'Add Transaction',
}: Props) {
  const { colors } = useTheme();
  const { currency, currencySymbol } = useCurrency();

  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'expense',
    amount: '',
    date: new Date(),
    merchant_name: '',
    description: '',
    category_id: null,
    subcategory_id: null,
    account_id: null,
    to_account_id: null,
    notes: '',
    receipt: null,
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showToAccountPicker, setShowToAccountPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch categories based on transaction type
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', formData.type],
    queryFn: async () => {
      const result = await categoryService.getForTransaction({ type: formData.type });
      if (result.success && result.data) {
        // Handle nested response structure
        const payload = result.data as any;
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.data)) return payload.data;
        if (Array.isArray(payload.data?.data)) return payload.data.data;
      }
      return [];
    },
  });

  // Fetch accounts
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const result = await accountService.getAll();
      if (result.success && result.data) {
        // Handle nested response structure
        const payload = result.data as any;
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.data)) return payload.data;
        if (Array.isArray(payload.data?.data)) return payload.data.data;
      }
      return [];
    },
  });

  const categories: Category[] = categoriesData || [];
  const accounts: Account[] = accountsData || [];

  // Initialize form with initial data
  useEffect(() => {
    if (initialData) {
      // Normalize type to lowercase
      const normalizedType = (initialData.type?.toLowerCase() || 'expense') as TransactionType;
      setFormData({
        type: normalizedType,
        amount: initialData.amount?.toString() || '',
        date: initialData.date ? new Date(initialData.date) : new Date(),
        merchant_name: initialData.merchant_name || '',
        description: initialData.description || '',
        category_id: initialData.category_id || null,
        subcategory_id: initialData.subcategory_id || null,
        account_id: initialData.account_id || null,
        to_account_id: initialData.to_account_id || null,
        notes: initialData.notes || '',
        receipt: null,
      });
    } else {
      // Reset form
      setFormData({
        type: 'expense',
        amount: '',
        date: new Date(),
        merchant_name: '',
        description: '',
        category_id: null,
        subcategory_id: null,
        account_id: null,
        to_account_id: null,
        notes: '',
        receipt: null,
      });
    }
    setErrors({});
  }, [initialData, visible]);

  const updateField = <K extends keyof TransactionFormData>(
    field: K,
    value: TransactionFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleTypeChange = (type: string) => {
    updateField('type', type as TransactionType);
    // Reset category when type changes
    updateField('category_id', null);
    updateField('subcategory_id', null);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      updateField('date', selectedDate);
    }
  };

  const handlePickReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      updateField('receipt', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || 'receipt.jpg',
      });
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      updateField('receipt', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: 'receipt.jpg',
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }

    if (!formData.category_id && formData.type !== 'transfer') {
      newErrors.category_id = 'Please select a category';
    }

    if (!formData.account_id) {
      newErrors.account_id = 'Please select an account';
    }

    if (formData.type === 'transfer' && !formData.to_account_id) {
      newErrors.to_account_id = 'Please select destination account';
    }

    if (formData.type === 'transfer' && formData.account_id === formData.to_account_id) {
      newErrors.to_account_id = 'Source and destination must be different';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit(formData);
  };

  const getSelectedCategory = () => {
    if (!formData.category_id) return null;
    return categories.find((c) => c.id === formData.category_id);
  };

  const getSelectedSubcategory = () => {
    const category = getSelectedCategory();
    if (!category || !formData.subcategory_id) return null;
    return category.subcategories?.find((s) => s.id === formData.subcategory_id);
  };

  const getSelectedAccount = (accountId: number | null) => {
    if (!accountId) return null;
    return accounts.find((a) => a.id === accountId);
  };

  const getTypeIcon = (type: TransactionType) => {
    switch (type) {
      case 'income':
        return 'arrow-down-circle';
      case 'expense':
        return 'arrow-up-circle';
      case 'transfer':
        return 'bank-transfer';
      default:
        return 'cash';
    }
  };

  const getTypeColor = (type: TransactionType) => {
    switch (type) {
      case 'income':
        return colors.tertiary;
      case 'expense':
        return colors.error;
      case 'transfer':
        return colors.primary;
      default:
        return colors.onSurfaceVariant;
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text variant="titleLarge" style={{ color: colors.onSurface }}>
              {title}
            </Text>
            <IconButton icon="close" onPress={onDismiss} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Transaction Type */}
            <View style={styles.section}>
              <Text variant="labelLarge" style={[styles.label, { color: colors.onSurfaceVariant }]}>
                Type
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.typeChips}>
                  <Chip
                    selected={formData.type === 'expense'}
                    onPress={() => handleTypeChange('expense')}
                    icon="arrow-up-circle"
                    style={styles.typeChip}
                    showSelectedCheck={false}
                    mode={formData.type === 'expense' ? 'flat' : 'outlined'}
                  >
                    Expense
                  </Chip>
                  <Chip
                    selected={formData.type === 'income'}
                    onPress={() => handleTypeChange('income')}
                    icon="arrow-down-circle"
                    style={styles.typeChip}
                    showSelectedCheck={false}
                    mode={formData.type === 'income' ? 'flat' : 'outlined'}
                  >
                    Income
                  </Chip>
                  <Chip
                    selected={formData.type === 'asset'}
                    onPress={() => handleTypeChange('asset')}
                    icon="wallet"
                    style={styles.typeChip}
                    showSelectedCheck={false}
                    mode={formData.type === 'asset' ? 'flat' : 'outlined'}
                  >
                    Asset
                  </Chip>
                  <Chip
                    selected={formData.type === 'liability'}
                    onPress={() => handleTypeChange('liability')}
                    icon="credit-card"
                    style={styles.typeChip}
                    showSelectedCheck={false}
                    mode={formData.type === 'liability' ? 'flat' : 'outlined'}
                  >
                    Liability
                  </Chip>
                  <Chip
                    selected={formData.type === 'transfer'}
                    onPress={() => handleTypeChange('transfer')}
                    icon="bank-transfer"
                    style={styles.typeChip}
                    showSelectedCheck={false}
                    mode={formData.type === 'transfer' ? 'flat' : 'outlined'}
                  >
                    Transfer
                  </Chip>
                </View>
              </ScrollView>
            </View>

            {/* Amount */}
            <View style={styles.section}>
              <Text variant="labelLarge" style={[styles.label, { color: colors.onSurfaceVariant }]}>
                Amount
              </Text>
              <TextInput
                mode="outlined"
                value={formData.amount}
                onChangeText={(text) => updateField('amount', text.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                left={<TextInput.Affix text={currencySymbol} />}
                error={!!errors.amount}
                style={[
                  styles.amountInput,
                  { color: getTypeColor(formData.type) },
                ]}
              />
              {errors.amount && (
                <Text variant="bodySmall" style={{ color: colors.error }}>
                  {errors.amount}
                </Text>
              )}
            </View>

            {/* Date */}
            <View style={styles.section}>
              <Text variant="labelLarge" style={[styles.label, { color: colors.onSurfaceVariant }]}>
                Date
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { borderColor: colors.outline }]}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialCommunityIcons
                  name="calendar"
                  size={20}
                  color={colors.onSurfaceVariant}
                />
                <Text style={{ color: colors.onSurface, marginLeft: 12, flex: 1 }}>
                  {formatDate(formData.date.toISOString(), {
                    weekday: 'short',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={20}
                  color={colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={formData.date}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}

            {/* Merchant/Description */}
            <View style={styles.section}>
              <Text variant="labelLarge" style={[styles.label, { color: colors.onSurfaceVariant }]}>
                {formData.type === 'transfer' ? 'Description' : 'Merchant / Payee'}
              </Text>
              <TextInput
                mode="outlined"
                value={formData.merchant_name}
                onChangeText={(text) => updateField('merchant_name', text)}
                placeholder={formData.type === 'transfer' ? 'Transfer description' : 'e.g., Grocery Store'}
              />
            </View>

            {/* Category (not for transfers) */}
            {formData.type !== 'transfer' && (
              <View style={styles.section}>
                <Text variant="labelLarge" style={[styles.label, { color: colors.onSurfaceVariant }]}>
                  Category
                </Text>
                <TouchableOpacity
                  style={[
                    styles.pickerButton,
                    { borderColor: errors.category_id ? colors.error : colors.outline },
                  ]}
                  onPress={() => setShowCategoryPicker(true)}
                >
                  <MaterialCommunityIcons
                    name="tag"
                    size={20}
                    color={colors.onSurfaceVariant}
                  />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    {getSelectedCategory() ? (
                      <View style={styles.selectedCategory}>
                        <Text style={{ color: colors.onSurface }}>
                          {getSelectedCategory()?.name}
                        </Text>
                        {getSelectedSubcategory() && (
                          <Chip compact style={styles.subcategoryChip}>
                            {getSelectedSubcategory()?.name}
                          </Chip>
                        )}
                      </View>
                    ) : (
                      <Text style={{ color: colors.onSurfaceVariant }}>
                        Select category
                      </Text>
                    )}
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={20}
                    color={colors.onSurfaceVariant}
                  />
                </TouchableOpacity>
                {errors.category_id && (
                  <Text variant="bodySmall" style={{ color: colors.error }}>
                    {errors.category_id}
                  </Text>
                )}
              </View>
            )}

            {/* Account */}
            <View style={styles.section}>
              <Text variant="labelLarge" style={[styles.label, { color: colors.onSurfaceVariant }]}>
                {formData.type === 'transfer' ? 'From Account' : 'Account'}
              </Text>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  { borderColor: errors.account_id ? colors.error : colors.outline },
                ]}
                onPress={() => setShowAccountPicker(true)}
              >
                <MaterialCommunityIcons
                  name="wallet"
                  size={20}
                  color={colors.onSurfaceVariant}
                />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ color: getSelectedAccount(formData.account_id) ? colors.onSurface : colors.onSurfaceVariant }}>
                    {getSelectedAccount(formData.account_id)?.account_name || 'Select account'}
                  </Text>
                  {getSelectedAccount(formData.account_id) && (
                    <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                      {formatAccountType(getSelectedAccount(formData.account_id)?.account_type)}
                    </Text>
                  )}
                </View>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={20}
                  color={colors.onSurfaceVariant}
                />
              </TouchableOpacity>
              {errors.account_id && (
                <Text variant="bodySmall" style={{ color: colors.error }}>
                  {errors.account_id}
                </Text>
              )}
            </View>

            {/* To Account (for transfers) */}
            {formData.type === 'transfer' && (
              <View style={styles.section}>
                <Text variant="labelLarge" style={[styles.label, { color: colors.onSurfaceVariant }]}>
                  To Account
                </Text>
                <TouchableOpacity
                  style={[
                    styles.pickerButton,
                    { borderColor: errors.to_account_id ? colors.error : colors.outline },
                  ]}
                  onPress={() => setShowToAccountPicker(true)}
                >
                  <MaterialCommunityIcons
                    name="wallet"
                    size={20}
                    color={colors.onSurfaceVariant}
                  />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={{ color: getSelectedAccount(formData.to_account_id) ? colors.onSurface : colors.onSurfaceVariant }}>
                      {getSelectedAccount(formData.to_account_id)?.account_name || 'Select destination'}
                    </Text>
                    {getSelectedAccount(formData.to_account_id) && (
                      <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                        {formatAccountType(getSelectedAccount(formData.to_account_id)?.account_type)}
                      </Text>
                    )}
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={20}
                    color={colors.onSurfaceVariant}
                  />
                </TouchableOpacity>
                {errors.to_account_id && (
                  <Text variant="bodySmall" style={{ color: colors.error }}>
                    {errors.to_account_id}
                  </Text>
                )}
              </View>
            )}

            {/* Notes */}
            <View style={styles.section}>
              <Text variant="labelLarge" style={[styles.label, { color: colors.onSurfaceVariant }]}>
                Notes (Optional)
              </Text>
              <TextInput
                mode="outlined"
                value={formData.notes}
                onChangeText={(text) => updateField('notes', text)}
                placeholder="Add any additional notes..."
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Receipt */}
            <View style={styles.section}>
              <Text variant="labelLarge" style={[styles.label, { color: colors.onSurfaceVariant }]}>
                Receipt (Optional)
              </Text>
              {formData.receipt ? (
                <Surface style={[styles.receiptPreview, { backgroundColor: colors.surfaceVariant }]} elevation={1}>
                  <MaterialCommunityIcons
                    name="file-image"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={{ color: colors.onSurface, flex: 1, marginLeft: 12 }} numberOfLines={1}>
                    {formData.receipt.name}
                  </Text>
                  <IconButton
                    icon="close"
                    size={20}
                    onPress={() => updateField('receipt', null)}
                  />
                </Surface>
              ) : (
                <View style={styles.receiptButtons}>
                  <Button
                    mode="outlined"
                    icon="image"
                    onPress={handlePickReceipt}
                    style={styles.receiptButton}
                  >
                    Gallery
                  </Button>
                  <Button
                    mode="outlined"
                    icon="camera"
                    onPress={handleTakePhoto}
                    style={styles.receiptButton}
                  >
                    Camera
                  </Button>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isLoading}
              style={styles.submitButton}
            >
              {initialData?.id ? 'Update Transaction' : 'Save Transaction'}
            </Button>
          </View>
        </KeyboardAvoidingView>

        {/* Category Picker Modal */}
        <Modal
          visible={showCategoryPicker}
          onDismiss={() => setShowCategoryPicker(false)}
          contentContainerStyle={[styles.pickerModal, { backgroundColor: colors.surface }]}
        >
          <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 16 }}>
            Select Category
          </Text>
          <ScrollView style={styles.pickerList}>
            {categories.map((category) => (
              <React.Fragment key={category.id}>
                <List.Item
                  title={category.name}
                  left={(props) => (
                    <View
                      style={[
                        styles.categoryIcon,
                        { backgroundColor: `${category.color || colors.primary}20` },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={(category.icon as any) || 'tag'}
                        size={20}
                        color={category.color || colors.primary}
                      />
                    </View>
                  )}
                  right={() =>
                    formData.category_id === category.id && !formData.subcategory_id ? (
                      <MaterialCommunityIcons name="check" size={24} color={colors.primary} />
                    ) : null
                  }
                  onPress={() => {
                    updateField('category_id', category.id);
                    updateField('subcategory_id', null);
                    if (!category.subcategories?.length) {
                      setShowCategoryPicker(false);
                    }
                  }}
                />
                {category.subcategories?.map((sub) => (
                  <List.Item
                    key={sub.id}
                    title={sub.name}
                    style={{ paddingLeft: 32 }}
                    right={() =>
                      formData.subcategory_id === sub.id ? (
                        <MaterialCommunityIcons name="check" size={24} color={colors.primary} />
                      ) : null
                    }
                    onPress={() => {
                      updateField('category_id', category.id);
                      updateField('subcategory_id', sub.id);
                      setShowCategoryPicker(false);
                    }}
                  />
                ))}
                <Divider />
              </React.Fragment>
            ))}
          </ScrollView>
          <Button mode="text" onPress={() => setShowCategoryPicker(false)}>
            Cancel
          </Button>
        </Modal>

        {/* Account Picker Modal */}
        <Modal
          visible={showAccountPicker}
          onDismiss={() => setShowAccountPicker(false)}
          contentContainerStyle={[styles.pickerModal, { backgroundColor: colors.surface }]}
        >
          <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 16 }}>
            Select Account
          </Text>
          <ScrollView style={styles.pickerList}>
            {accounts.map((account) => (
              <React.Fragment key={account.id}>
                <List.Item
                  title={account.account_name}
                  description={formatAccountType(account.account_type)}
                  left={(props) => (
                    <View
                      style={[
                        styles.categoryIcon,
                        { backgroundColor: `${colors.primary}20` },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="wallet"
                        size={20}
                        color={colors.primary}
                      />
                    </View>
                  )}
                  right={() =>
                    formData.account_id === account.id ? (
                      <MaterialCommunityIcons name="check" size={24} color={colors.primary} />
                    ) : null
                  }
                  onPress={() => {
                    updateField('account_id', account.id);
                    setShowAccountPicker(false);
                  }}
                />
                <Divider />
              </React.Fragment>
            ))}
          </ScrollView>
          <Button mode="text" onPress={() => setShowAccountPicker(false)}>
            Cancel
          </Button>
        </Modal>

        {/* To Account Picker Modal */}
        <Modal
          visible={showToAccountPicker}
          onDismiss={() => setShowToAccountPicker(false)}
          contentContainerStyle={[styles.pickerModal, { backgroundColor: colors.surface }]}
        >
          <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 16 }}>
            Select Destination Account
          </Text>
          <ScrollView style={styles.pickerList}>
            {accounts
              .filter((a) => a.id !== formData.account_id)
              .map((account) => (
                <React.Fragment key={account.id}>
                  <List.Item
                    title={account.account_name}
                    description={formatAccountType(account.account_type)}
                    left={(props) => (
                      <View
                        style={[
                          styles.categoryIcon,
                          { backgroundColor: `${colors.primary}20` },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="wallet"
                          size={20}
                          color={colors.primary}
                        />
                      </View>
                    )}
                    right={() =>
                      formData.to_account_id === account.id ? (
                        <MaterialCommunityIcons name="check" size={24} color={colors.primary} />
                      ) : null
                    }
                    onPress={() => {
                      updateField('to_account_id', account.id);
                      setShowToAccountPicker(false);
                    }}
                  />
                  <Divider />
                </React.Fragment>
              ))}
          </ScrollView>
          <Button mode="text" onPress={() => setShowToAccountPicker(false)}>
            Cancel
          </Button>
        </Modal>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 16,
    borderRadius: 16,
    maxHeight: '90%',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  typeChips: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  typeChip: {
    height: 36,
  },
  label: {
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountInput: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subcategoryChip: {
    height: 24,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  receiptPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  receiptButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  receiptButton: {
    flex: 1,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  submitButton: {
    borderRadius: 8,
  },
  pickerModal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxHeight: '70%',
  },
  pickerList: {
    maxHeight: 400,
  },
});

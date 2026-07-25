import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
  ActivityIndicator,
  Modal as RNModal,
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
  Surface,
  Chip,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedDatePicker } from '../ui/ThemedDatePicker';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useToast } from '../../contexts/NotificationContext';
import { WebView } from 'react-native-webview';

import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import categoryService from '../../services/categoryService';
import accountService from '../../services/accountService';
import transactionService from '../../services/transactionService';
import { buildFileUrl } from '../../config/api';
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

// Categories are picked per item row, matching the web TransactionManager.
// Flip to true only if the single transaction-level picker ever comes back —
// having both on screen is what produced the duplicate category field.
const SHOW_TRANSACTION_LEVEL_CATEGORY = false;

export type TransactionItemData = {
  id?: number;
  name: string;
  quantity: string;
  price: string;
  total: string;
  category_id: number | null;
  subcategory_id: number | null;
};

const makeEmptyItem = (): TransactionItemData => ({
  name: '',
  quantity: '1',
  price: '0',
  total: '0',
  category_id: null,
  subcategory_id: null,
});

export type TransactionFormData = {
  type: TransactionType;
  amount: string;
  date: Date;
  merchant_name: string;
  description: string;
  category_id: number | null;
  subcategory_id: number | null;
  account_id: number | null;
  to_account_id: number | null;
  notes: string;
  items: TransactionItemData[];
  receipt?: {
    uri: string;
    type: string;
    name: string;
  } | null;
  receipt_path?: string; // URL of existing receipt (from chat or API)
  receipt_type?: string; // 'image', 'pdf', 'csv', etc
  receipt_name?: string; // Filename for display
};

type Props = {
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<Transaction>;
  isLoading?: boolean;
  title?: string;
  autoScanMode?: 'camera' | 'gallery';
};

export default function TransactionFormContent({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  title = 'Add Transaction',
  autoScanMode,
}: Props) {
  const { colors } = useTheme();
  const { currencySymbol } = useCurrency();

  // Convert API items to form items. Always yields at least one row — the grid
  // opens with an editable line instead of an empty "no items" state, so a
  // transaction with no saved items is immediately typeable. A pristine row is
  // dropped on save (see the name filter in transaction-modal).
  // `fallbackCategory` backfills rows that have no category of their own from
  // the transaction-level one. Records saved before categories moved onto the
  // item rows (and chat prefills that only carry a single category) would
  // otherwise open with empty, unsaveable rows.
  const convertApiItemsToFormItems = (
    apiItems?: any[],
    fallbackCategory?: { category_id: number | null; subcategory_id: number | null },
  ): TransactionItemData[] => {
    if (!apiItems || apiItems.length === 0) return [makeEmptyItem()];
    return apiItems.map(item => {
      const ownCategoryId = item.category_id ?? null;
      return {
        id: item.id,
        name: item.name || '',
        quantity: item.quantity?.toString() || '1',
        price: item.price?.toString() || '0',
        total: item.total?.toString() || '0',
        category_id: ownCategoryId ?? fallbackCategory?.category_id ?? null,
        subcategory_id: ownCategoryId
          ? item.subcategory_id ?? null
          : fallbackCategory?.subcategory_id ?? null,
      };
    });
  };

  // Initialize with initialData values if available to avoid unnecessary refetches
  const [formData, setFormData] = useState<TransactionFormData>(() => {
    if (initialData) {
      const normalizedType = (initialData.type?.toLowerCase() || 'expense') as TransactionType;
      return {
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
        items: convertApiItemsToFormItems(initialData.items, {
          category_id: initialData.category_id || null,
          subcategory_id: initialData.subcategory_id || null,
        }),
        receipt: null,
        receipt_path: (initialData as any).receipt_path || initialData.receipt_file || undefined,
        receipt_type: (initialData as any).receipt_type || 'image',
        receipt_name: (initialData as any).receipt_name || 'receipt',
      };
    }
    // New transactions start with one blank item row (web parity).
    return {
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
      items: [makeEmptyItem()],
      receipt: null,
    };
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  // The shared category picker modal serves both the transaction-level field
  // ('transaction') and per-item pickers (item index).
  const [categoryPickerTarget, setCategoryPickerTarget] = useState<'transaction' | number>('transaction');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [merchantSuggestions, setMerchantSuggestions] = useState<string[]>([]);
  const [isLoadingMerchants, setIsLoadingMerchants] = useState(false);
  const [showMerchantSuggestions, setShowMerchantSuggestions] = useState(false);
  const [showToAccountPicker, setShowToAccountPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const autoScanTriggeredRef = useRef(false);
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');

  const queryClient = useQueryClient();
  const toast = useToast();

  // Fetch categories based on transaction type
  // Pass the actual type to the API (asset, liability, income, expense)
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

  // Inline-create a category from the picker search
  const createInlineCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const trimmed = String(name || '').trim();
      if (!trimmed) throw new Error('Please type a category name');
      const result = await categoryService.create({
        name: trimmed,
        type: formData.type as any,
        is_active: 1,
      } as any);
      if (!result.success) {
        throw new Error((result as any)?.error || 'Could not create category');
      }
      return result;
    },
    onSuccess: async (result) => {
      const created: any =
        (result as any)?.data?.data || (result as any)?.data || {};
      await queryClient.invalidateQueries({
        queryKey: ['categories', formData.type],
      });
      if (created?.id) {
        applyCategorySelection(created.id, null);
      }
      setCategorySearchQuery('');
      setShowCategoryPicker(false);
      toast.success(`Category "${created?.name || 'new'}" created`);
    },
    onError: (err: Error) =>
      toast.error(err?.message || 'Could not create category'),
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
  const filteredCategories: Category[] = (() => {
    const query = categorySearchQuery.trim().toLowerCase();
    if (!query) return categories;
    return categories
      .map((category: any) => {
        const nameMatches = String(category?.name || '')
          .toLowerCase()
          .includes(query);
        const subs = Array.isArray(category?.subcategories)
          ? category.subcategories
          : [];
        const matchingSubs = subs.filter((sub: any) =>
          String(sub?.name || '')
            .toLowerCase()
            .includes(query),
        );
        if (nameMatches) return category;
        if (matchingSubs.length > 0) {
          return { ...category, subcategories: matchingSubs };
        }
        return null;
      })
      .filter(Boolean) as Category[];
  })();
  const accounts: Account[] = accountsData || [];

  useEffect(() => {
    if (initialData || formData.account_id || accounts.length === 0) return;

    setFormData((prev) => ({
      ...prev,
      account_id: accounts[0].id,
    }));
  }, [accounts, formData.account_id, initialData]);

  // Initialize form with initial data - only once when data first becomes available
  useEffect(() => {
    // Skip if already initialized to prevent overwriting user edits
    if (isInitialized) return;

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
        items: convertApiItemsToFormItems(initialData.items, {
          category_id: initialData.category_id || null,
          subcategory_id: initialData.subcategory_id || null,
        }),
        receipt: null,
        // Preserve receipt fields from initialData
        receipt_path: (initialData as any).receipt_path || initialData.receipt_file || undefined,
        receipt_type: (initialData as any).receipt_type || 'image',
        receipt_name: (initialData as any).receipt_name || 'receipt',
      });
      setIsInitialized(true); // Mark as initialized
    }
    setErrors({});
  }, [initialData, isInitialized]);

  const updateField = <K extends keyof TransactionFormData>(
    field: K,
    value: TransactionFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleTypeChange = (newType: string) => {
    updateField('type', newType as TransactionType);
    // Clear category when changing type since different types have different categories
    updateField('category_id', null);
    updateField('subcategory_id', null);
    // Item categories are type-scoped too. Now that the rows are the only place
    // a category is picked, leaving stale ids here would submit e.g. an expense
    // category on an income transaction — the label just renders blank because
    // the id isn't in the newly fetched list.
    updateField(
      'items',
      formData.items.map((item) => ({
        ...item,
        category_id: null,
        subcategory_id: null,
      })),
    );
  };

  const handleDateConfirm = (selectedDate: Date) => {
    setShowDatePicker(false);
    updateField('date', selectedDate);
  };

  // Process receipt with AI
  const processReceiptWithAI = async (file: { uri: string; name: string; type: string }) => {
    setIsProcessingReceipt(true);
    setProcessingStage('Uploading receipt...');

    try {
      setProcessingStage('Analyzing with AI...');
      const result = await transactionService.processReceipt(file);

      if (result.success && result.data) {
        const responseData = result.data as any;

        // Handle different response structures
        const data = responseData.data || responseData;

        // Extract items from response
        const items = data.items || data.expense_candidates?.[0]?.items || [];
        const formItems: TransactionItemData[] = items.map((item: any) => ({
          name: item.name || '',
          quantity: item.quantity?.toString() || '1',
          price: item.price?.toString() || '0',
          total: item.total?.toString() || (parseFloat(item.quantity || 1) * parseFloat(item.price || 0)).toFixed(2),
          category_id: null,
          subcategory_id: null,
        }));

        // Update form with extracted data
        if (formItems.length > 0) {
          updateField('items', formItems);
          // Calculate total amount from items
          const totalAmount = formItems.reduce((sum, item) => {
            return sum + (parseFloat(item.total) || 0);
          }, 0);
          updateField('amount', totalAmount.toFixed(2));
        } else if (data.amount) {
          updateField('amount', data.amount.toString());
        }

        // Set merchant name (could be in merchant_name or item field)
        if (data.merchant_name) {
          updateField('merchant_name', data.merchant_name);
        } else if (data.item) {
          updateField('merchant_name', data.item);
        }

        // Set date
        if (data.date) {
          updateField('date', new Date(data.date));
        }

        // Set type first (needed for category matching)
        const transactionType = data.type?.toLowerCase() as TransactionType || 'expense';
        updateField('type', transactionType);

        // Match AI category names to IDs (transaction-level + per-item).
        // Fetch categories for the new type directly since the query might not have updated yet
        const itemsHaveCategoryNames = items.some(
          (item: any) => item.category || item.subcategory,
        );
        if (data.category || itemsHaveCategoryNames) {
          try {
            const categoryResult = await categoryService.getForTransaction({ type: transactionType });
            if (categoryResult.success && categoryResult.data) {
              const categoryPayload = categoryResult.data as any;
              let typeCategories: Category[] = [];
              if (Array.isArray(categoryPayload)) typeCategories = categoryPayload;
              else if (Array.isArray(categoryPayload.data)) typeCategories = categoryPayload.data;
              else if (Array.isArray(categoryPayload.data?.data)) typeCategories = categoryPayload.data.data;

              // Fuzzy name matching (case-insensitive, partial both ways).
              const matchByName = <T extends { name: string }>(
                list: T[] | undefined,
                rawName: unknown,
              ): T | undefined => {
                if (!list?.length || typeof rawName !== 'string' || !rawName.trim()) {
                  return undefined;
                }
                const needle = rawName.toLowerCase().trim();
                return list.find(entry =>
                  entry.name.toLowerCase().trim() === needle ||
                  entry.name.toLowerCase().includes(needle) ||
                  needle.includes(entry.name.toLowerCase())
                );
              };

              let matchedCategory: Category | undefined;
              let matchedSubcategoryId: number | null = null;
              if (typeCategories.length > 0 && data.category) {
                matchedCategory = matchByName(typeCategories, data.category);
                if (matchedCategory) {
                  updateField('category_id', matchedCategory.id);
                  const matchedSubcategory = matchByName(
                    matchedCategory.subcategories,
                    data.subcategory,
                  );
                  if (matchedSubcategory) {
                    matchedSubcategoryId = matchedSubcategory.id;
                    updateField('subcategory_id', matchedSubcategory.id);
                  }
                }
              }

              // Resolve each item's own AI-picked category; items without one
              // inherit the transaction-level match (web parity).
              if (typeCategories.length > 0 && formItems.length > 0) {
                const resolvedItems = formItems.map((formItem, index) => {
                  const raw = items[index] || {};
                  const ownCategory = matchByName(typeCategories, raw.category);
                  if (ownCategory) {
                    const ownSub = matchByName(ownCategory.subcategories, raw.subcategory);
                    return {
                      ...formItem,
                      category_id: ownCategory.id,
                      subcategory_id: ownSub ? ownSub.id : null,
                    };
                  }
                  if (!raw.category && matchedCategory) {
                    return {
                      ...formItem,
                      category_id: matchedCategory.id,
                      subcategory_id: matchedSubcategoryId,
                    };
                  }
                  return formItem;
                });
                updateField('items', resolvedItems);
              }
            }
          } catch (e) {
            // Category matching failed, user can select manually
          }
        }

        // Store the receipt path from server if available
        if (data.receipt_path) {
          updateField('receipt_path', data.receipt_path);
          updateField('receipt_type', 'image');
          updateField('receipt_name', file.name);
        }

        toast.success(
          formItems.length > 0
            ? `Found ${formItems.length} item(s) totaling ${currencySymbol}${formItems.reduce((sum, item) => sum + parseFloat(item.total), 0).toFixed(2)}`
            : 'Transaction details extracted successfully',
          { title: 'Receipt processed' },
        );
      } else {
        toast.error(result.error || 'Could not extract data from receipt', {
          title: 'Processing failed',
        });
      }
    } catch (error) {
      toast.error('Failed to process receipt. Please try again.');
    } finally {
      setIsProcessingReceipt(false);
      setProcessingStage('');
    }
  };

  // Handle receipt selection for AI processing
  const handleScanReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const file = {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || 'receipt.jpg',
      };

      // Store the receipt for display
      updateField('receipt', file);

      // Process with AI
      await processReceiptWithAI(file);
    }
  };

  const handleOpenCamera = async () => {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        toast.warning('Camera permission is needed to capture receipts', {
          title: 'Permission required',
        });
        return;
      }
    }

    setCameraFacing('back');
    setCameraVisible(true);
  };

  const handleCaptureReceipt = async () => {
    try {
      const captured = await cameraRef.current?.takePictureAsync({
        quality: 0.8,
      });

      if (!captured?.uri) {
        return;
      }

      const file = {
        uri: captured.uri,
        type: 'image/jpeg',
        name: 'receipt.jpg',
      };

      setCameraVisible(false);
      updateField('receipt', file);
      await processReceiptWithAI(file);
    } catch (error) {
      toast.error('Failed to capture photo. Please try again.');
    }
  };

  // Fetch merchant suggestions while user types
  useEffect(() => {
    if (formData.type === 'transfer') return;
    if (!showMerchantSuggestions) return;

    const query = String(formData.merchant_name || '').trim();
    if (!query) {
      setMerchantSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setIsLoadingMerchants(true);
        const response = await transactionService.searchMerchants(query);
        const data: any = response?.data || {};
        const list: string[] =
          (Array.isArray(data?.merchants) && data.merchants) ||
          (Array.isArray(data?.data?.merchants) && data.data.merchants) ||
          (Array.isArray(data) && data) ||
          [];
        if (!cancelled) setMerchantSuggestions(list);
      } catch {
        if (!cancelled) setMerchantSuggestions([]);
      } finally {
        if (!cancelled) setIsLoadingMerchants(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [formData.merchant_name, showMerchantSuggestions, formData.type]);

  // A pristine default row (no name, price 0) doesn't count as user content.
  const hasMeaningfulItems = formData.items.some(
    (item) => item.name.trim() !== '' || (parseFloat(item.price) || 0) > 0,
  );

  useEffect(() => {
    if (autoScanTriggeredRef.current) return;
    if (!autoScanMode || initialData?.id) return;
    if (formData.receipt || formData.receipt_path || hasMeaningfulItems) return;

    autoScanTriggeredRef.current = true;
    if (autoScanMode === 'camera') {
      void handleOpenCamera();
      return;
    }
    void handleScanReceipt();
  }, [
    autoScanMode,
    initialData?.id,
    formData.receipt,
    formData.receipt_path,
    hasMeaningfulItems,
  ]);

  // Item management functions
  const addItem = () => {
    // Inherit the previous row's category so single-category receipts
    // don't need re-selection on every row (web parity).
    const lastItem = formData.items[formData.items.length - 1];
    const newItem: TransactionItemData = {
      ...makeEmptyItem(),
      category_id: lastItem?.category_id ?? null,
      subcategory_id: lastItem?.subcategory_id ?? null,
    };
    updateField('items', [...formData.items, newItem]);
  };

  const updateItemCategory = (
    index: number,
    categoryId: number | null,
    subcategoryId: number | null,
  ) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      category_id: categoryId,
      subcategory_id: subcategoryId,
    };
    updateField('items', updatedItems);
  };

  // Route a picker selection to whichever field opened the modal.
  const applyCategorySelection = (
    categoryId: number,
    subcategoryId: number | null,
  ) => {
    if (categoryPickerTarget === 'transaction') {
      updateField('category_id', categoryId);
      updateField('subcategory_id', subcategoryId);
    } else {
      updateItemCategory(categoryPickerTarget, categoryId, subcategoryId);
    }
  };

  // The pair currently selected for the picker's active target (drives the
  // check marks in the modal).
  const pickerSelection =
    categoryPickerTarget === 'transaction'
      ? {
          category_id: formData.category_id,
          subcategory_id: formData.subcategory_id,
        }
      : {
          category_id: formData.items[categoryPickerTarget]?.category_id ?? null,
          subcategory_id: formData.items[categoryPickerTarget]?.subcategory_id ?? null,
        };

  const updateItem = (index: number, field: keyof TransactionItemData, value: string) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Auto-calculate total when quantity or price changes
    if (field === 'quantity' || field === 'price') {
      const qty = parseFloat(updatedItems[index].quantity) || 0;
      const price = parseFloat(updatedItems[index].price) || 0;
      updatedItems[index].total = (qty * price).toFixed(2);
    }

    updateField('items', updatedItems);

    // Auto-update total amount from items if there are items
    if (updatedItems.length > 0) {
      const totalAmount = updatedItems.reduce((sum, item) => {
        return sum + (parseFloat(item.total) || 0);
      }, 0);
      updateField('amount', totalAmount.toFixed(2));
    }
  };

  const removeItem = (index: number) => {
    const remaining = formData.items.filter((_, i) => i !== index);
    // Removing the last row leaves a fresh blank one so the grid never collapses
    // to an empty state.
    const updatedItems = remaining.length > 0 ? remaining : [makeEmptyItem()];
    updateField('items', updatedItems);

    // Update total amount
    const totalAmount = updatedItems.reduce((sum, item) => {
      return sum + (parseFloat(item.total) || 0);
    }, 0);
    updateField('amount', totalAmount.toFixed(2));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }

    // Web parity (TransactionManager.validateTransactionForm): categories are
    // per item now, so validate the rows instead of a transaction-level field.
    // Blank rows are ignored here the same way the payload builder drops them.
    if (formData.type !== 'transfer') {
      const filledItems = formData.items.filter((item) => item.name.trim() !== '');

      if (filledItems.length === 0) {
        newErrors.items = 'Add at least one item';
      }

      formData.items.forEach((item, index) => {
        if (item.name.trim() === '') return;
        if (!item.category_id) {
          newErrors[`item_${index}_category`] = 'Category is required';
        }
      });
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

    // The form no longer asks for a transaction-level category, so derive it
    // from the first categorised item — same as the web app, which builds the
    // transaction's categories out of the item rows on submit.
    const firstCategorised = formData.items.find(
      (item) => item.name.trim() !== '' && item.category_id,
    );

    if (formData.type === 'transfer' || !firstCategorised) {
      await onSubmit(formData);
      return;
    }

    await onSubmit({
      ...formData,
      category_id: firstCategorised.category_id,
      subcategory_id: firstCategorised.subcategory_id,
    });
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

  const getItemCategoryLabel = (item: TransactionItemData): string => {
    if (!item.category_id) return '';
    const category = categories.find((c) => c.id === item.category_id);
    if (!category) return '';
    const sub = item.subcategory_id
      ? category.subcategories?.find((s) => s.id === item.subcategory_id)
      : null;
    return sub ? `${category.name} › ${sub.name}` : category.name;
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
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.outlineVariant }]}>
          <Text variant="titleLarge" style={{ color: colors.onSurface }}>
            {title}
          </Text>
          <IconButton icon="close" onPress={onCancel} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Scan Receipt with AI - Only show when no data entered yet.
              Transfers have no receipt/items (web parity), so hide it. */}
          {formData.type !== 'transfer' && !initialData?.id && !formData.receipt && !formData.receipt_path && !hasMeaningfulItems && (
            <View style={styles.section}>
              <Text variant="labelLarge" style={[styles.label, { color: colors.onSurfaceVariant }]}>
                Scan Receipt (Optional)
              </Text>
              <Surface style={[styles.scanReceiptContainer, { backgroundColor: colors.surfaceVariant }]} elevation={1}>
                <MaterialCommunityIcons
                  name="receipt"
                  size={32}
                  color={colors.primary}
                  style={styles.scanReceiptIcon}
                />
                <Text style={[styles.scanReceiptText, { color: colors.onSurface }]}>
                  Upload a receipt image to auto-fill transaction details
                </Text>
                {isProcessingReceipt ? (
                  <View style={styles.processingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.processingText, { color: colors.primary }]}>
                      {processingStage}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.scanReceiptButtons}>
                    <Button
                      mode="contained"
                      icon="image"
                      onPress={handleScanReceipt}
                      style={styles.scanButton}
                      compact
                    >
                      Gallery
                    </Button>
                    <Button
                      mode="contained"
                      icon="camera"
                      onPress={handleOpenCamera}
                      style={styles.scanButton}
                      compact
                    >
                      Camera
                    </Button>
                  </View>
                )}
              </Surface>
            </View>
          )}

          {/* Processing Overlay - Show when processing receipt with existing data */}
          {isProcessingReceipt && (formData.receipt || hasMeaningfulItems) && (
            <View style={styles.section}>
              <Surface style={[styles.processingOverlay, { backgroundColor: colors.primaryContainer }]} elevation={1}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.processingText, { color: colors.onPrimaryContainer, marginLeft: 12 }]}>
                  {processingStage}
                </Text>
              </Surface>
            </View>
          )}

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

          {/* Receipt Preview - Show after type when available (from scan or chat) */}
          {formData.type !== 'transfer' && (formData.receipt_path || formData.receipt) && (
            <View style={styles.section}>
              <Text variant="labelLarge" style={[styles.label, { color: colors.onSurfaceVariant }]}>
                Attached Receipt
              </Text>
              {/* Open in Browser Button - only show for remote paths (not local camera/gallery images) */}
              {formData.receipt_path && !formData.receipt_path.startsWith('file://') && !formData.receipt_path.startsWith('content://') && (
                <TouchableOpacity
                  style={[styles.openBrowserButtonTop, { backgroundColor: colors.primary }]}
                  onPress={async () => {
                    if (formData.receipt_path) {
                      try {
                        const fullUrl = buildFileUrl(formData.receipt_path);
                        if (fullUrl) {
                          const canOpen = await Linking.canOpenURL(fullUrl);
                          if (canOpen) {
                            await Linking.openURL(fullUrl);
                          } else {
                            toast.error('Unable to open this file.', { title: 'Cannot open' });
                          }
                        }
                      } catch (error) {
                        toast.error('Failed to open file.');
                      }
                    }
                  }}
                >
                  <MaterialCommunityIcons name="open-in-new" size={20} color="#fff" />
                  <Text style={{ color: '#fff', marginLeft: 8, fontWeight: '600' }}>
                    Open in Browser
                  </Text>
                </TouchableOpacity>
              )}

              <Surface
                style={[styles.receiptImageContainer, { backgroundColor: colors.surfaceVariant }]}
                elevation={1}
              >
                {/* Show image preview - prefer local receipt, fallback to remote path */}
                {/* Default to image type if not specified */}
                {(formData.receipt?.uri || ((!formData.receipt_type || formData.receipt_type === 'image') && formData.receipt_path)) && (
                  <Image
                    source={{ uri: formData.receipt?.uri || buildFileUrl(formData.receipt_path) || '' }}
                    style={styles.receiptImage}
                    resizeMode="cover"
                  />
                )}

                {/* Show PDF inline using WebView with Google Docs viewer */}
                {formData.receipt_type === 'pdf' && formData.receipt_path && (
                  <View style={styles.pdfContainer}>
                    <WebView
                      source={{
                        uri: `https://docs.google.com/viewer?url=${encodeURIComponent(buildFileUrl(formData.receipt_path) || '')}&embedded=true`,
                      }}
                      style={styles.pdfWebView}
                      startInLoadingState={true}
                      scalesPageToFit={true}
                    />
                  </View>
                )}

                {/* Show file info for CSV and other non-image/non-pdf types */}
                {formData.receipt_type && formData.receipt_type !== 'image' && formData.receipt_type !== 'pdf' && (
                  <View style={styles.receiptFileInfo}>
                    <MaterialCommunityIcons
                      name="file-document"
                      size={48}
                      color={colors.primary}
                    />
                    <Text style={{ color: colors.onSurface, marginTop: 8 }} numberOfLines={1}>
                      {formData.receipt_name}
                    </Text>
                  </View>
                )}

                {/* Remove button - top right corner */}
                <IconButton
                  icon="close-circle"
                  size={28}
                  iconColor="#fff"
                  style={styles.receiptRemoveButton}
                  onPress={() => {
                    updateField('receipt', null);
                    updateField('receipt_path', undefined as any);
                    updateField('receipt_type', undefined as any);
                    updateField('receipt_name', undefined as any);
                  }}
                />
              </Surface>
            </View>
          )}

          {/* Transfer amount — a transfer moves one amount between accounts, so
              it uses a direct amount field instead of the items grid (matches
              the web app, which shows no items/receipt for transfers). */}
          {formData.type === 'transfer' && (
            <View style={styles.section}>
              <Text variant="labelLarge" style={[styles.label, { color: colors.onSurfaceVariant }]}>
                Amount
              </Text>
              <TextInput
                mode="outlined"
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={formData.amount}
                onChangeText={(v) => updateField('amount', v.replace(/[^0-9.]/g, ''))}
                left={<TextInput.Affix text={currencySymbol} />}
              />
              {errors.amount && (
                <Text variant="bodySmall" style={{ color: colors.error, marginTop: 4 }}>
                  {errors.amount}
                </Text>
              )}
            </View>
          )}

          {/* Items Section - hidden for transfers (web parity) */}
          {formData.type !== 'transfer' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="labelLarge" style={[styles.label, { color: colors.onSurfaceVariant }]}>
                Items
              </Text>
              <Button
                mode="text"
                icon="plus"
                compact
                onPress={addItem}
              >
                Add Item
              </Button>
            </View>

            <Surface style={[styles.itemsContainer, { backgroundColor: colors.surfaceVariant }]} elevation={1}>
              {formData.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemInputs}>
                    <TextInput
                      mode="outlined"
                      label="Item Name"
                      value={item.name}
                      onChangeText={(text) => updateItem(index, 'name', text)}
                      style={styles.itemNameInput}
                      dense
                    />
                    <View style={styles.itemNumberInputs}>
                      <TextInput
                        mode="outlined"
                        label="Qty"
                        value={item.quantity}
                        onChangeText={(text) => updateItem(index, 'quantity', text.replace(/[^0-9.]/g, ''))}
                        keyboardType="decimal-pad"
                        style={styles.itemQtyInput}
                        dense
                      />
                      <TextInput
                        mode="outlined"
                        label="Price"
                        value={item.price}
                        onChangeText={(text) => updateItem(index, 'price', text.replace(/[^0-9.]/g, ''))}
                        keyboardType="decimal-pad"
                        style={styles.itemPriceInput}
                        left={<TextInput.Affix text={currencySymbol} />}
                        dense
                      />
                      <Text style={[styles.itemTotal, { color: colors.onSurface }]}>
                        {currencySymbol}{item.total}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.itemCategoryButton,
                        {
                          borderColor: errors[`item_${index}_category`]
                            ? colors.error
                            : colors.outline,
                        },
                      ]}
                      onPress={() => {
                        setCategoryPickerTarget(index);
                        setShowCategoryPicker(true);
                      }}
                    >
                      <MaterialCommunityIcons
                        name="tag-outline"
                        size={16}
                        color={colors.onSurfaceVariant}
                      />
                      <Text
                        style={{
                          marginLeft: 8,
                          flex: 1,
                          fontSize: 13,
                          color: getItemCategoryLabel(item)
                            ? colors.onSurface
                            : colors.onSurfaceVariant,
                        }}
                        numberOfLines={1}
                      >
                        {getItemCategoryLabel(item) || 'Select category'}
                      </Text>
                      <MaterialCommunityIcons
                        name="chevron-down"
                        size={16}
                        color={colors.onSurfaceVariant}
                      />
                    </TouchableOpacity>
                    {errors[`item_${index}_category`] && (
                      <Text
                        variant="bodySmall"
                        style={{ color: colors.error, marginTop: 4 }}
                      >
                        {errors[`item_${index}_category`]}
                      </Text>
                    )}
                  </View>
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => removeItem(index)}
                    iconColor={colors.error}
                  />
                </View>
              ))}
              <View style={styles.itemsTotalRow}>
                <Text variant="titleMedium" style={{ color: colors.onSurface }}>
                  Total:
                </Text>
                <Text variant="titleMedium" style={{ color: colors.primary, fontWeight: 'bold' }}>
                  {currencySymbol}{formData.amount || '0.00'}
                </Text>
              </View>
            </Surface>
            {errors.items && (
              <Text variant="bodySmall" style={{ color: colors.error, marginTop: 4 }}>
                {errors.items}
              </Text>
            )}
            {errors.amount && (
              <Text variant="bodySmall" style={{ color: colors.error, marginTop: 4 }}>
                {errors.amount}
              </Text>
            )}
          </View>
          )}

          {/* Date */}
          <View style={styles.section}>
            <Text variant="labelLarge" style={[styles.label, { color: colors.onSurfaceVariant }]}>
              Date
            </Text>
            <TouchableOpacity
              style={[styles.pickerButton, { borderColor: colors.outline }]}
              onPress={() => setShowDatePicker(true)}
            >
              <MaterialCommunityIcons name="calendar" size={20} color={colors.onSurfaceVariant} />
              <Text style={{ color: colors.onSurface, marginLeft: 12, flex: 1 }}>
                {formatDate(formData.date.toISOString(), {
                  weekday: 'short',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ThemedDatePicker
            visible={showDatePicker}
            value={formData.date}
            title="Transaction date"
            onCancel={() => setShowDatePicker(false)}
            onConfirm={handleDateConfirm}
          />

          {/* Merchant/Description */}
          <View style={styles.section}>
            <Text variant="labelLarge" style={[styles.label, { color: colors.onSurfaceVariant }]}>
              {formData.type === 'transfer' ? 'Description' : 'Merchant / Payee'}
            </Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                mode="outlined"
                value={formData.merchant_name}
                onChangeText={(text) => {
                  updateField('merchant_name', text);
                  if (formData.type !== 'transfer') {
                    setShowMerchantSuggestions(true);
                  }
                }}
                onFocus={() => {
                  if (formData.type !== 'transfer') {
                    setShowMerchantSuggestions(true);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setShowMerchantSuggestions(false), 150);
                }}
                placeholder={formData.type === 'transfer' ? 'Transfer description' : 'e.g., Grocery Store'}
                autoComplete="off"
              />
              {showMerchantSuggestions &&
                formData.type !== 'transfer' &&
                String(formData.merchant_name || '').trim().length > 0 && (
                  <Surface
                    style={[
                      styles.merchantSuggestions,
                      { backgroundColor: colors.surface, borderColor: colors.outline },
                    ]}
                    elevation={3}
                  >
                    {isLoadingMerchants ? (
                      <View style={styles.merchantSuggestion}>
                        <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>
                          Searching…
                        </Text>
                      </View>
                    ) : merchantSuggestions.length > 0 ? (
                      merchantSuggestions.map((name) => (
                        <TouchableOpacity
                          key={name}
                          style={styles.merchantSuggestion}
                          onPress={() => {
                            updateField('merchant_name', name);
                            setShowMerchantSuggestions(false);
                          }}
                        >
                          <Text style={{ color: colors.onSurface, fontSize: 14 }}>
                            {name}
                          </Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.merchantSuggestion}>
                        <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>
                          No matches found
                        </Text>
                      </View>
                    )}
                  </Surface>
                )}
            </View>
          </View>

          {/* Transaction-level category — RETIRED, kept for back-compat.
              Web parity: categories live on the item rows only (see
              TransactionManager's items grid). Rendering both meant a
              single-item transaction showed the same category twice.
              The state, the `categoryPickerTarget === 'transaction'` branch and
              the getters below stay wired because the chat prefill path and
              older records still populate formData.category_id. */}
          {SHOW_TRANSACTION_LEVEL_CATEGORY && formData.type !== 'transfer' && (
            <View style={styles.section}>
              <Text variant="labelLarge" style={[styles.label, { color: colors.onSurfaceVariant }]}>
                Category
              </Text>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  { borderColor: errors.category_id ? colors.error : colors.outline },
                ]}
                onPress={() => {
                  setCategoryPickerTarget('transaction');
                  setShowCategoryPicker(true);
                }}
              >
                <MaterialCommunityIcons name="tag" size={20} color={colors.onSurfaceVariant} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  {getSelectedCategory() ? (
                    <View style={styles.selectedCategory}>
                      <Text style={{ color: colors.onSurface }}>{getSelectedCategory()?.name}</Text>
                      {getSelectedSubcategory() && (
                        <Chip compact style={styles.subcategoryChip}>
                          {getSelectedSubcategory()?.name}
                        </Chip>
                      )}
                    </View>
                  ) : (
                    <Text style={{ color: colors.onSurfaceVariant }}>Select category</Text>
                  )}
                </View>
                <MaterialCommunityIcons name="chevron-down" size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
              {errors.category_id && (
                <Text variant="bodySmall" style={{ color: colors.error, marginTop: 4 }}>
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
              <MaterialCommunityIcons name="wallet" size={20} color={colors.onSurfaceVariant} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text
                  style={{
                    color: getSelectedAccount(formData.account_id)
                      ? colors.onSurface
                      : colors.onSurfaceVariant,
                  }}
                >
                  {getSelectedAccount(formData.account_id)?.account_name || 'Select account'}
                </Text>
                {!!formatAccountType(getSelectedAccount(formData.account_id)?.account_type) && (
                  <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                    {formatAccountType(getSelectedAccount(formData.account_id)?.account_type)}
                  </Text>
                )}
              </View>
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
            {errors.account_id && (
              <Text variant="bodySmall" style={{ color: colors.error, marginTop: 4 }}>
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
                <MaterialCommunityIcons name="wallet" size={20} color={colors.onSurfaceVariant} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text
                    style={{
                      color: getSelectedAccount(formData.to_account_id)
                        ? colors.onSurface
                        : colors.onSurfaceVariant,
                    }}
                  >
                    {getSelectedAccount(formData.to_account_id)?.account_name || 'Select destination'}
                  </Text>
                  {!!formatAccountType(getSelectedAccount(formData.to_account_id)?.account_type) && (
                    <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                      {formatAccountType(getSelectedAccount(formData.to_account_id)?.account_type)}
                    </Text>
                  )}
                </View>
                <MaterialCommunityIcons name="chevron-down" size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
              {errors.to_account_id && (
                <Text variant="bodySmall" style={{ color: colors.error, marginTop: 4 }}>
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
              style={styles.notesInput}
              contentStyle={styles.notesInputContent}
            />
          </View>

        </ScrollView>

        {/* Submit Button */}
        <View style={[styles.footer, { borderTopColor: colors.outlineVariant }]}>
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

      <RNModal
        visible={cameraVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setCameraVisible(false)}
      >
        <View style={styles.cameraOverlay}>
          <CameraView
            ref={cameraRef}
            style={styles.cameraView}
            facing={cameraFacing}
          />

          <TouchableOpacity
            style={styles.cameraCloseButton}
            onPress={() => setCameraVisible(false)}
          >
            <MaterialCommunityIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.cameraBottomBar}>
            <TouchableOpacity
              style={styles.cameraActionButton}
              onPress={async () => {
                setCameraVisible(false);
                await handleScanReceipt();
              }}
            >
              <MaterialCommunityIcons name="image-multiple" size={24} color="#fff" />
              <Text style={styles.cameraActionLabel}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleCaptureReceipt}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cameraActionButton}
              onPress={() =>
                setCameraFacing((prev) => (prev === 'back' ? 'front' : 'back'))
              }
            >
              <MaterialCommunityIcons name="camera-flip" size={24} color="#fff" />
              <Text style={styles.cameraActionLabel}>Flip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </RNModal>

      {/* Category Picker Modal */}
      <Portal>
        <Modal
          visible={showCategoryPicker}
          onDismiss={() => {
            setShowCategoryPicker(false);
            setCategorySearchQuery('');
          }}
          contentContainerStyle={[styles.pickerModal, { backgroundColor: colors.surface }]}
        >
          <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 12 }}>
            Select Category
          </Text>
          <TextInput
            value={categorySearchQuery}
            onChangeText={setCategorySearchQuery}
            placeholder="Search category or subcategory..."
            mode="outlined"
            dense
            left={<TextInput.Icon icon="magnify" />}
            style={{ marginBottom: 8 }}
          />
          <ScrollView style={styles.pickerList}>
            {filteredCategories.length === 0 ? (
              <View style={{ padding: 16, gap: 10, alignItems: 'center' }}>
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 13, textAlign: 'center' }}>
                  {categorySearchQuery.trim()
                    ? `No category matches "${categorySearchQuery.trim()}"`
                    : `No ${formData.type} categories yet`}
                </Text>
                {categorySearchQuery.trim() ? (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: colors.primary,
                    }}
                    disabled={createInlineCategoryMutation.isPending}
                    onPress={() =>
                      createInlineCategoryMutation.mutate(categorySearchQuery)
                    }
                  >
                    <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
                    <Text
                      style={{
                        color: colors.primary,
                        fontWeight: '600',
                        marginLeft: 4,
                        fontSize: 13,
                      }}
                    >
                      {createInlineCategoryMutation.isPending
                        ? 'Creating…'
                        : `Create "${categorySearchQuery.trim()}"`}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: colors.primary,
                    }}
                    onPress={() => {
                      setShowCategoryPicker(false);
                      router.push('/categories');
                    }}
                  >
                    <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
                    <Text
                      style={{
                        color: colors.primary,
                        fontWeight: '600',
                        marginLeft: 4,
                        fontSize: 13,
                      }}
                    >
                      Create your first category
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => {
                    setShowCategoryPicker(false);
                    router.push('/categories');
                  }}
                >
                  <Text
                    style={{
                      color: colors.onSurfaceVariant,
                      fontSize: 12,
                      textDecorationLine: 'underline',
                    }}
                  >
                    Manage categories →
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredCategories.map((category) => {
                const isCategorySelected =
                  pickerSelection.category_id === category.id &&
                  !pickerSelection.subcategory_id;
                const subcategories = category.subcategories ?? [];
                return (
                  <View key={category.id} style={styles.categoryOption}>
                    <List.Item
                      title={category.name}
                      titleStyle={[
                        styles.categoryParentTitle,
                        isCategorySelected && { color: colors.primary },
                      ]}
                      style={
                        isCategorySelected
                          ? { backgroundColor: `${colors.primary}1F` }
                          : undefined
                      }
                      left={() => (
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
                        isCategorySelected ? (
                          <MaterialCommunityIcons name="check" size={24} color={colors.primary} />
                        ) : null
                      }
                      onPress={() => {
                        applyCategorySelection(category.id, null);
                        if (!subcategories.length) {
                          setShowCategoryPicker(false);
                        }
                      }}
                    />
                    {subcategories.length > 0 && (
                      <View
                        style={[
                          styles.subcategoryList,
                          { borderTopColor: colors.outlineVariant },
                        ]}
                      >
                        {subcategories.map((sub) => {
                          const isSubSelected = pickerSelection.subcategory_id === sub.id;
                          return (
                            <TouchableOpacity
                              key={sub.id}
                              style={[
                                styles.subcategoryRow,
                                isSubSelected && {
                                  backgroundColor: `${colors.primary}1F`,
                                },
                              ]}
                              onPress={() => {
                                applyCategorySelection(category.id, sub.id);
                                setShowCategoryPicker(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.subcategoryBullet,
                                  { color: colors.onSurfaceVariant },
                                ]}
                              >
                                ›
                              </Text>
                              <Text
                                style={[
                                  styles.subcategoryLabel,
                                  {
                                    color: isSubSelected
                                      ? colors.primary
                                      : colors.onSurface,
                                  },
                                  isSubSelected && { fontWeight: '600' },
                                ]}
                                numberOfLines={1}
                              >
                                {sub.name}
                              </Text>
                              {isSubSelected && (
                                <MaterialCommunityIcons
                                  name="check"
                                  size={20}
                                  color={colors.primary}
                                />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                    <Divider />
                  </View>
                );
              })
            )}
          </ScrollView>
          <Button
            mode="text"
            onPress={() => {
              setShowCategoryPicker(false);
              setCategorySearchQuery('');
            }}
          >
            Cancel
          </Button>
        </Modal>
      </Portal>

      {/* Account Picker Modal */}
      <Portal>
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
                  left={() => (
                    <View style={[styles.categoryIcon, { backgroundColor: `${colors.primary}20` }]}>
                      <MaterialCommunityIcons name="wallet" size={20} color={colors.primary} />
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
      </Portal>

      {/* To Account Picker Modal */}
      <Portal>
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
                    left={() => (
                      <View style={[styles.categoryIcon, { backgroundColor: `${colors.primary}20` }]}>
                        <MaterialCommunityIcons name="wallet" size={20} color={colors.primary} />
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
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
  },
  merchantSuggestions: {
    position: 'absolute',
    top: 'auto' as any,
    bottom: 0,
    left: 0,
    right: 0,
    transform: [{ translateY: 0 }],
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 4,
    maxHeight: 220,
    zIndex: 10,
  },
  merchantSuggestion: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  keyboardView: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraView: {
    flex: 1,
  },
  cameraCloseButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  cameraBottomBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cameraActionButton: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraActionLabel: {
    color: '#fff',
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  captureButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  captureButtonInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
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
    fontSize: 20,
  },
  notesInput: {
    minHeight: 96,
  },
  notesInputContent: {
    paddingTop: 12,
    textAlignVertical: 'top',
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
  // Category picker rows mirror the web dropdown (TransactionManager.css):
  // bold parent, tinted indented subcategory group with a "›" bullet.
  categoryOption: {
    overflow: 'hidden',
  },
  categoryParentTitle: {
    fontWeight: '600',
  },
  subcategoryList: {
    borderTopWidth: 1,
    backgroundColor: 'rgba(127, 127, 127, 0.06)',
  },
  subcategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingRight: 16,
    paddingLeft: 32,
  },
  subcategoryBullet: {
    fontSize: 20,
    lineHeight: 22,
    marginRight: 10,
  },
  subcategoryLabel: {
    flex: 1,
    fontSize: 15,
  },
  receiptPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  receiptThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  receiptInfo: {
    flex: 1,
    marginLeft: 12,
  },
  receiptActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  receiptImageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  pdfContainer: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
  },
  pdfWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  receiptTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  openBrowserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  openBrowserButtonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  receiptRemoveButtonInline: {
    margin: 0,
  },
  receiptRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    margin: 0,
  },
  receiptFileInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  previewFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginHorizontal: 8,
    marginBottom: 8,
  },
  previewFileButtonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginHorizontal: 8,
    marginBottom: 12,
  },
  scanReceiptContainer: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  scanReceiptIcon: {
    marginBottom: 12,
  },
  scanReceiptText: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  scanReceiptButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  scanButton: {
    minWidth: 100,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  processingText: {
    fontSize: 14,
  },
  processingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemsContainer: {
    borderRadius: 8,
    padding: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInputs: {
    flex: 1,
  },
  itemNameInput: {
    marginBottom: 8,
  },
  itemNumberInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemQtyInput: {
    width: 70,
  },
  itemPriceInput: {
    flex: 1,
  },
  itemTotal: {
    minWidth: 70,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  itemCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  itemsTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    marginTop: 4,
  },
});

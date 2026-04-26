import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
  Keyboard,
} from "react-native";
import {
  Text,
  Surface,
  IconButton,
  ActivityIndicator,
  Button,
  Portal,
  Modal,
  Divider,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { ThemedDatePicker } from "../../src/components/ui/ThemedDatePicker";

import { useTheme } from "../../src/contexts/ThemeContext";
import { useCurrency } from "../../src/contexts/CurrencyContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { BrandedHeader } from "../../src/components";
import chatService from "../../src/services/chatService";
import categoryService from "../../src/services/categoryService";
import accountService from "../../src/services/accountService";
import { buildFileUrl } from "../../src/config/api";
import {
  ChatMessage,
  ExpenseCandidate,
  Category,
  Account,
} from "../../src/types";
import {
  formatDate,
  toDateInputValue,
  todayDateInputValue,
} from "../../src/utils/date";

type SpeechRecognitionModuleType = {
  addListener: (
    eventName: string,
    listener: (event: any) => void,
  ) => { remove: () => void };
  abort: () => void;
  stop: () => void;
  start: (options: Record<string, unknown>) => void;
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
};

let SpeechRecognitionModule: SpeechRecognitionModuleType | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const speechRecognitionPackage = require("expo-speech-recognition");
  SpeechRecognitionModule =
    (speechRecognitionPackage?.ExpoSpeechRecognitionModule as SpeechRecognitionModuleType | null) ??
    null;
} catch (error) {
  SpeechRecognitionModule = null;
}

// Helper to ensure absolute URL for images - converts localhost to CDN URL
const ensureAbsoluteUrl = (value?: string): string | null => {
  if (!value || typeof value !== "string") return null;
  // Return local URIs as-is (file://, content://, blob:, data:)
  if (
    value.startsWith("blob:") ||
    value.startsWith("data:") ||
    value.startsWith("file:") ||
    value.startsWith("content:") ||
    value.startsWith("ph://") ||
    value.startsWith("assets-library:")
  ) {
    return value;
  }

  return buildFileUrl(value);
};

// Helper to extract attachment from a message
const getMessageAttachment = (
  message: ChatMessage,
): { url: string; name: string; isImage: boolean } | null => {
  const metadata = message.metadata || {};

  // Try different paths for image/file URL
  const candidates = [
    message.image_path,
    (metadata as any).receipt_path,
    message.file_url,
    (metadata as any).receipt_url,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const url = ensureAbsoluteUrl(candidate);
    if (url) {
      const fileName =
        message.file_name || (metadata as any).receipt_name || "attachment";
      const mimeType = (
        message.file_mime ||
        (metadata as any).receipt_mime ||
        ""
      ).toLowerCase();
      const normalizedUrl = url.split("?")[0];
      const isImage =
        mimeType.startsWith("image/") ||
        /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(fileName) ||
        /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(normalizedUrl);
      return { url, name: fileName, isImage };
    }
  }
  return null;
};

// Helper to find related attachment for an assistant message (looks at preceding user messages)
const findRelatedAttachment = (
  targetMessage: ChatMessage,
  allMessages: ChatMessage[],
): { url: string; name: string; isImage: boolean } | null => {
  // First check if the target message itself has an attachment
  const directAttachment = getMessageAttachment(targetMessage);
  if (directAttachment) return directAttachment;

  // Find the index of the target message
  const targetIndex = allMessages.findIndex((m) => m.id === targetMessage.id);
  if (targetIndex === -1) return null;

  // Look backwards for user messages with attachments (like web version)
  let encounteredUser = false;
  for (let i = targetIndex - 1; i >= 0; i--) {
    const msg = allMessages[i];
    if (msg.is_user) {
      encounteredUser = true;
      const attachment = getMessageAttachment(msg);
      if (attachment) return attachment;
      // Continue looking at older messages (don't break)
      continue;
    }
    // If we've seen a user message and now hit an assistant message, stop
    if (encounteredUser) {
      break;
    }
  }

  return null;
};

const normalizeTranscriptText = (value?: string): string => {
  if (!value) {
    return "";
  }
  return value.replace(/\s+/g, " ").trim();
};

const mergeTranscriptText = (
  existingText: string,
  incomingText: string,
): string => {
  const existing = normalizeTranscriptText(existingText);
  const incoming = normalizeTranscriptText(incomingText);

  if (!incoming) {
    return existing;
  }

  if (!existing) {
    return incoming;
  }

  if (existing === incoming || existing.endsWith(incoming)) {
    return existing;
  }

  if (incoming.startsWith(existing)) {
    return incoming;
  }

  const existingWords = existing.split(" ");
  const incomingWords = incoming.split(" ");
  const maxOverlap = Math.min(existingWords.length, incomingWords.length);

  for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
    const tail = existingWords.slice(-overlap).join(" ").toLowerCase();
    const head = incomingWords.slice(0, overlap).join(" ").toLowerCase();

    if (tail === head) {
      const suffix = incomingWords.slice(overlap).join(" ");
      return normalizeTranscriptText(`${existing} ${suffix}`);
    }
  }

  return normalizeTranscriptText(`${existing} ${incoming}`);
};

const combineInputAndTranscript = (
  baseText: string,
  transcriptText: string,
): string => {
  const base = normalizeTranscriptText(baseText);
  const transcript = normalizeTranscriptText(transcriptText);

  if (!base) {
    return transcript;
  }

  if (!transcript) {
    return base;
  }

  return `${base} ${transcript}`;
};

const getCandidateIdentity = (candidate: ExpenseCandidate): string => {
  const merchant = (candidate.merchant_name || "").trim().toLowerCase();
  const date = (candidate.date || "").trim().toLowerCase();
  const type = (candidate.type || "").trim().toLowerCase();
  const category = (candidate.category || "").trim().toLowerCase();
  const paymentMethod = (
    candidate.payment_method_label ||
    candidate.payment_method ||
    ""
  )
    .toString()
    .trim()
    .toLowerCase();
  const notes = (candidate.notes || "").trim().toLowerCase();
  const numericAmount =
    typeof candidate.amount === "string"
      ? parseFloat(candidate.amount)
      : candidate.amount;
  const amount =
    typeof numericAmount === "number" && Number.isFinite(numericAmount)
      ? numericAmount.toFixed(2)
      : "0.00";

  const semanticIdentity = [
    merchant,
    amount,
    date,
    type,
    category,
    paymentMethod,
    notes,
  ]
    .filter(Boolean)
    .join("|");

  // Use semantic fields for dedupe. Fall back to id only if everything is empty.
  if (semanticIdentity) {
    return semanticIdentity;
  }

  return candidate.id ? `id:${candidate.id}` : "";
};

const normalizeChatMessageResponse = (payload: any): ChatMessage[] => {
  if (!payload) return [];

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.messages)) return payload.messages;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data?.messages)) return payload.data.messages;
  if (Array.isArray(payload?.data?.data?.data)) return payload.data.data.data;

  const queue: any[] = [payload];
  const visited = new Set<any>();

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || visited.has(current)) {
      continue;
    }
    visited.add(current);

    if (Array.isArray(current)) {
      return current;
    }

    Object.values(current).forEach((value) => {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    });
  }

  return [];
};

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  is_user: false,
  message:
    "Hello! I'm your finance assistant. You can upload receipts, CSVs, or ask me for quick reports.",
  metadata: {
    suggested_actions: [
      "Show me a report for the last 3 days",
      "Help me record a new expense",
    ],
  },
};

export default function ChatScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<RNTextInput>(null);
  const voiceBaseInputRef = useRef("");
  const voiceFinalTranscriptRef = useRef("");
  const voiceInterimTranscriptRef = useRef("");
  const voiceStopRequestedRef = useRef(false);
  const previewTapLockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lastHistoryErrorRef = useRef<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    DEFAULT_WELCOME_MESSAGE,
  ]);
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewCandidate, setPreviewCandidate] =
    useState<ExpenseCandidate | null>(null);
  const [isOpeningTransactionModal, setIsOpeningTransactionModal] =
    useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [selectedChatDate, setSelectedChatDate] = useState<string>(
    todayDateInputValue(),
  );
  const [showChatDatePicker, setShowChatDatePicker] = useState(false);

  const applyVoiceTextToInput = useCallback(() => {
    const voiceText = mergeTranscriptText(
      voiceFinalTranscriptRef.current,
      voiceInterimTranscriptRef.current,
    );
    setInputText(
      combineInputAndTranscript(voiceBaseInputRef.current, voiceText),
    );
  }, []);

  useEffect(() => {
    if (!SpeechRecognitionModule) {
      return;
    }

    const startSub = SpeechRecognitionModule.addListener("start", () => {
      setIsRecording(true);
      setIsTranscribing(false);
    });

    const resultSub = SpeechRecognitionModule.addListener(
      "result",
      (event: any) => {
        const transcript = normalizeTranscriptText(
          event?.results?.[0]?.transcript,
        );
        if (!transcript) {
          return;
        }

        if (event?.isFinal) {
          voiceFinalTranscriptRef.current = mergeTranscriptText(
            voiceFinalTranscriptRef.current,
            transcript,
          );
          voiceInterimTranscriptRef.current = "";
        } else {
          voiceInterimTranscriptRef.current = transcript;
        }

        applyVoiceTextToInput();
      },
    );

    const endSub = SpeechRecognitionModule.addListener("end", () => {
      setIsRecording(false);
      setIsTranscribing(false);
      voiceFinalTranscriptRef.current = mergeTranscriptText(
        voiceFinalTranscriptRef.current,
        voiceInterimTranscriptRef.current,
      );
      voiceInterimTranscriptRef.current = "";
      applyVoiceTextToInput();
      voiceStopRequestedRef.current = false;
    });

    const errorSub = SpeechRecognitionModule.addListener(
      "error",
      (event: any) => {
        setIsRecording(false);
        setIsTranscribing(false);
        voiceFinalTranscriptRef.current = mergeTranscriptText(
          voiceFinalTranscriptRef.current,
          voiceInterimTranscriptRef.current,
        );
        voiceInterimTranscriptRef.current = "";
        applyVoiceTextToInput();

        if (
          !voiceStopRequestedRef.current &&
          event?.error !== "aborted" &&
          event?.error !== "no-speech"
        ) {
          Alert.alert(
            "Voice input error",
            event?.message || "Unable to transcribe your speech right now.",
          );
        }

        voiceStopRequestedRef.current = false;
      },
    );

    return () => {
      startSub.remove();
      resultSub.remove();
      endSub.remove();
      errorSub.remove();
    };
  }, [applyVoiceTextToInput]);

  useEffect(() => {
    return () => {
      if (previewTapLockTimeoutRef.current) {
        clearTimeout(previewTapLockTimeoutRef.current);
        previewTapLockTimeoutRef.current = null;
      }
      try {
        SpeechRecognitionModule?.abort();
      } catch (error) {
        // no-op
      }
    };
  }, []);

  // Handle keyboard show/hide for Android
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to bottom when keyboard shows
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Helper function to prepare transaction params for navigation (like web app)
  const prepareTransactionParams = (
    candidate: ExpenseCandidate,
    receiptUri?: string,
  ) => {
    const merchantName = candidate.merchant_name || "Unknown";
    const amount = candidate.amount || 0;
    const transactionType = candidate.type || "expense";
    const date = candidate.date || selectedChatDate;
    const notes = candidate.notes || "";

    // Get IDs directly from candidate if available
    let categoryId = candidate.category_id;
    let subcategoryId = candidate.subcategory_id;
    let accountId = candidate.payment_method_id;

    // If category_id not provided but category name is, try to match from loaded categories
    if (!categoryId && candidate.category && categoriesData) {
      const categoryName = candidate.category.toLowerCase().trim();
      for (const cat of categoriesData) {
        if (cat.name.toLowerCase().trim() === categoryName) {
          categoryId = cat.id;
          break;
        }
        // Also check subcategories
        if (cat.subcategories) {
          for (const sub of cat.subcategories) {
            if (sub.name.toLowerCase().trim() === categoryName) {
              categoryId = cat.id;
              subcategoryId = sub.id;
              break;
            }
          }
        }
        if (categoryId) break;
      }
    }

    // If payment_method_id not provided but payment_method name is, try to match from loaded accounts
    if (!accountId && candidate.payment_method && paymentMethodsData) {
      const paymentName = (candidate.payment_method as string)
        .toLowerCase()
        .trim();
      for (const acc of paymentMethodsData) {
        if (acc.account_name.toLowerCase().trim() === paymentName) {
          accountId = acc.id;
          break;
        }
      }
    }

    // Prepare items - if candidate has items, use them; otherwise create a default item
    let itemsToSend: Array<{
      name: string;
      quantity: number;
      price: number;
      total: number;
    }> = [];

    if (Array.isArray(candidate.items) && candidate.items.length > 0) {
      itemsToSend = candidate.items.map((item, index) => {
        const quantity = item.quantity || 1;
        const price = item.price || 0;
        const total = item.total || quantity * price;
        return {
          name: item.name || merchantName || `Item ${index + 1}`,
          quantity,
          price,
          total,
        };
      });
    } else {
      // Create a single default item for simple transactions (like web app)
      itemsToSend = [
        {
          name: merchantName,
          quantity: 1,
          price: amount,
          total: amount,
        },
      ];
    }

    // Determine file type from URI
    let receiptType = "";
    let receiptName = "receipt";
    if (receiptUri) {
      const lowerUri = receiptUri.toLowerCase();
      if (lowerUri.includes(".pdf")) {
        receiptType = "pdf";
        receiptName = "receipt.pdf";
      } else if (lowerUri.includes(".csv")) {
        receiptType = "csv";
        receiptName = "receipt.csv";
      } else if (lowerUri.match(/\.(jpg|jpeg|png|gif|webp|heic)/)) {
        receiptType = "image";
        receiptName = "receipt.jpg";
      } else {
        receiptType = "image"; // Default to image for most cases
        receiptName = "receipt.jpg";
      }
    }

    return {
      type: transactionType,
      amount: amount.toString(),
      merchant_name: merchantName,
      description: "",
      date: date,
      category_id: categoryId?.toString() || "",
      subcategory_id: subcategoryId?.toString() || "",
      account_id: accountId?.toString() || "",
      notes: notes,
      items: JSON.stringify(itemsToSend),
      receipt_uri: receiptUri || "",
      receipt_type: receiptType,
      receipt_name: receiptName,
    };
  };

  // Fetch categories for context
  const { data: categoriesData } = useQuery({
    queryKey: ["categories", "forChat"],
    queryFn: async () => {
      const result = await categoryService.getAll(undefined, true);
      if (result.success && result.data) {
        // Handle nested response structure
        const payload = result.data as any;
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.data)) return payload.data;
        if (Array.isArray(payload.data?.data)) return payload.data.data;
      }
      return [];
    },
    enabled: !!token,
  });

  // Fetch payment methods for context
  const { data: paymentMethodsData } = useQuery({
    queryKey: ["paymentMethods", "forChat"],
    queryFn: async () => {
      const result = await accountService.getPaymentMethods();
      if (result.success && result.data) {
        // Handle nested response structure
        const payload = result.data as any;
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.data)) return payload.data;
        if (Array.isArray(payload.data?.data)) return payload.data.data;
      }
      return [];
    },
    enabled: !!token,
  });

  // Fetch chat history
  const {
    data: messagesData,
    isLoading: isLoadingHistory,
    isFetching: isFetchingHistory,
    error: messagesHistoryError,
  } = useQuery({
    queryKey: ["chat", "messages", selectedChatDate],
    retry: false,
    queryFn: async () => {
      const result = await chatService.getMessages(selectedChatDate);
      const payload = result.data as any;
      if (!result.success || payload?.success === false) {
        throw new Error(
          payload?.message ||
            result.error ||
            "Unable to load chat history for this date.",
        );
      }

      return normalizeChatMessageResponse(payload);
    },
    enabled: !!token,
  });

  // Update messages when history loads
  useEffect(() => {
    if (!messagesData) {
      return;
    }

    if (messagesData.length > 0) {
      setMessages(messagesData);
      return;
    }

    setMessages([DEFAULT_WELCOME_MESSAGE]);
  }, [messagesData]);

  useEffect(() => {
    if (!messagesHistoryError) {
      lastHistoryErrorRef.current = null;
      return;
    }

    const message =
      messagesHistoryError instanceof Error
        ? messagesHistoryError.message
        : "Unable to load chat history for this date.";

    if (lastHistoryErrorRef.current === message) {
      return;
    }

    lastHistoryErrorRef.current = message;
    Alert.alert("Chat date error", message);
  }, [messagesHistoryError]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      message,
      file,
      chatDate,
    }: {
      message?: string;
      file?: { uri: string; name: string; type: string };
      chatDate?: string;
    }) => {
      const categoryContext = categoriesData?.map((cat: Category) => ({
        id: cat.id,
        name: cat.name,
        type: cat.type,
        subcategories: cat.subcategories?.map(
          (sub: { id: number; name: string }) => ({
            id: sub.id,
            name: sub.name,
          }),
        ),
      }));

      const paymentMethodContext = paymentMethodsData?.map((acc: Account) => ({
        id: acc.id,
        name: acc.account_name,
      }));

      return chatService.sendMessage({
        message,
        file,
        chatDate,
        categories: categoryContext,
        paymentMethods: paymentMethodContext,
      });
    },
    onSuccess: (result, variables) => {
      if (result.success && result.data) {
        const data = result.data as {
          success?: boolean;
          data?: { user?: ChatMessage; assistant?: ChatMessage };
        };
        if (data.success && data.data?.user && data.data?.assistant) {
          setMessages((prev) => [
            ...prev,
            data.data!.user!,
            data.data!.assistant!,
          ]);
        }
      }
      queryClient.invalidateQueries({
        queryKey: [
          "chat",
          "messages",
          variables.chatDate || todayDateInputValue(),
        ],
      });
    },
  });

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle sending message
  const handleSend = async () => {
    if (isSending || (!inputText.trim() && !selectedFile)) return;

    setIsSending(true);
    const messageText = inputText.trim();
    const file = selectedFile;

    // Track uploaded file URI for receipt (any file type)
    if (file) {
      setLastUploadedFileUri(file.uri);
    }

    setInputText("");
    setSelectedFile(null);

    // Add optimistic user message with file info
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      is_user: true,
      message: messageText,
      file_url: file?.uri,
      file_name: file?.name,
      file_mime: file?.type,
      created_at: `${selectedChatDate}T${new Date().toTimeString().slice(0, 8)}`,
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      await sendMessageMutation.mutateAsync({
        message: messageText || undefined,
        file: file || undefined,
        chatDate: selectedChatDate,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Handle image picker
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please grant camera roll access to upload images.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: asset.fileName || `image-${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      });
    }
  };

  // Handle camera
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please grant camera access to take photos.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: asset.fileName || `photo-${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      });
    }
  };

  // Handle document picker
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "text/csv", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
        });
      }
    } catch (error) {
      // Document picker cancelled or failed
    }
  };

  // Handle voice recording
  const startRecording = async () => {
    try {
      if (!SpeechRecognitionModule) {
        Alert.alert(
          "Voice unavailable",
          "Speech recognition needs a development build. Run npx expo run:android or npx expo run:ios.",
        );
        return;
      }

      if (!SpeechRecognitionModule.isRecognitionAvailable()) {
        Alert.alert(
          "Not available",
          "Speech recognition is not available on this device.",
        );
        return;
      }

      const permission =
        await SpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Please grant microphone and speech recognition permissions.",
        );
        return;
      }

      voiceBaseInputRef.current = normalizeTranscriptText(inputText);
      voiceFinalTranscriptRef.current = "";
      voiceInterimTranscriptRef.current = "";
      voiceStopRequestedRef.current = false;

      setIsRecording(true);
      setIsTranscribing(false);

      SpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: true,
        maxAlternatives: 1,
        addsPunctuation: true,
      });
    } catch (error) {
      setIsRecording(false);
      setIsTranscribing(false);
      Alert.alert("Error", "Failed to start voice transcription.");
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    try {
      voiceStopRequestedRef.current = true;
      setIsTranscribing(true);
      SpeechRecognitionModule?.stop();
    } catch (error) {
      voiceStopRequestedRef.current = false;
      setIsRecording(false);
      setIsTranscribing(false);
      Alert.alert("Error", "Failed to stop voice transcription.");
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Handle quick action
  const handleQuickAction = (action: string) => {
    setInputText(action);
    inputRef.current?.focus();
  };

  const isTodayChatDate = selectedChatDate === todayDateInputValue();
  const selectedChatDateLabel = isTodayChatDate
    ? `Today - ${formatDate(selectedChatDate)}`
    : formatDate(selectedChatDate);

  const handleOpenChatDatePicker = () => {
    setShowChatDatePicker(true);
  };

  const handleChatDateConfirm = (date: Date) => {
    setShowChatDatePicker(false);
    setSelectedChatDate(toDateInputValue(date));
  };

  const handleResetChatDateToToday = () => {
    setSelectedChatDate(todayDateInputValue());
  };

  // Track receipt for preview modal
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<
    string | undefined
  >();

  // Track the last uploaded file URI (to use as fallback for receipt)
  const [lastUploadedFileUri, setLastUploadedFileUri] = useState<
    string | undefined
  >();

  // Handle preview candidate
  const openPreview = (candidate: ExpenseCandidate, receiptUrl?: string) => {
    setPreviewCandidate(candidate);
    setPreviewReceiptUrl(receiptUrl);
    setPreviewVisible(true);
  };

  // Parse expense candidates from message metadata
  const getExpenseCandidates = (message: ChatMessage): ExpenseCandidate[] => {
    if (!message.metadata?.expense_candidates) return [];
    const rawCandidates = Array.isArray(message.metadata.expense_candidates)
      ? message.metadata.expense_candidates
      : [];

    const seen = new Set<string>();
    const uniqueCandidates: ExpenseCandidate[] = [];

    for (const candidate of rawCandidates) {
      const identity = getCandidateIdentity(candidate);
      if (seen.has(identity)) {
        continue;
      }
      seen.add(identity);
      uniqueCandidates.push(candidate);
    }

    return uniqueCandidates;
  };

  const getCandidateReceiptUri = (
    messageId: string | number,
  ): string | undefined => {
    const msgIndex = messages.findIndex((msg) => msg.id === messageId);
    if (msgIndex > 0) {
      for (let i = msgIndex - 1; i >= 0; i -= 1) {
        const prevMsg = messages[i];

        if (prevMsg.is_user) {
          const fileUrl =
            prevMsg.file_url ||
            prevMsg.image_path ||
            (prevMsg.metadata as any)?.receipt_path ||
            (prevMsg.metadata as any)?.receipt_url ||
            (prevMsg.metadata as any)?.image_url ||
            (prevMsg as any).image ||
            (prevMsg as any).attachment_url;

          if (fileUrl) {
            return ensureAbsoluteUrl(fileUrl) || fileUrl;
          }
        }
      }
    }

    return lastUploadedFileUri;
  };

  const lockPreviewTap = () => {
    setIsOpeningTransactionModal(true);
    if (previewTapLockTimeoutRef.current) {
      clearTimeout(previewTapLockTimeoutRef.current);
    }
    previewTapLockTimeoutRef.current = setTimeout(() => {
      setIsOpeningTransactionModal(false);
      previewTapLockTimeoutRef.current = null;
    }, 900);
  };

  // Render message
  const renderMessage = ({ item: message }: { item: ChatMessage }) => {
    const isUser = message.is_user;
    const candidates = getExpenseCandidates(message);
    const suggestedActions = message.metadata?.suggested_actions || [];
    const attachment = getMessageAttachment(message);
    // For assistant messages with candidates, find the related user attachment
    const relatedAttachment =
      !isUser && candidates.length > 0
        ? findRelatedAttachment(message, messages)
        : null;
    const displayAttachment = attachment || relatedAttachment;
    const hasImageAttachment = Boolean(displayAttachment?.isImage);

    return (
      <View
        style={[
          styles.messageContainer,
          isUser
            ? styles.userMessageContainer
            : styles.assistantMessageContainer,
        ]}
      >
        {/* Avatar */}
        {!isUser && (
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.primaryContainer },
            ]}
          >
            <MaterialCommunityIcons
              name="robot"
              size={20}
              color={colors.primary}
            />
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            hasImageAttachment && styles.imageMessageBubble,
            isUser
              ? [styles.userBubble, { backgroundColor: colors.primary }]
              : [
                  styles.assistantBubble,
                  { backgroundColor: colors.surfaceVariant },
                ],
          ]}
        >
          {/* Attachment preview (for user messages with images) */}
          {displayAttachment && displayAttachment.isImage && (
            <Image
              source={{ uri: displayAttachment.url }}
              style={[
                styles.messageImage,
                !message.message ? { marginBottom: 0 } : null,
              ]}
              resizeMode="cover"
            />
          )}

          {/* Non-image attachment */}
          {displayAttachment && !displayAttachment.isImage && (
            <View
              style={[
                styles.fileAttachment,
                {
                  backgroundColor: isUser
                    ? "rgba(255,255,255,0.2)"
                    : colors.surface,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="file-document"
                size={20}
                color={isUser ? "#ffffff" : colors.primary}
              />
              <Text
                style={{
                  color: isUser ? "#ffffff" : colors.onSurface,
                  marginLeft: 8,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {displayAttachment.name}
              </Text>
            </View>
          )}

          {/* Message text */}
          {message.message && (
            <Text
              style={[
                styles.messageText,
                { color: isUser ? "#ffffff" : colors.onSurface },
              ]}
            >
              {message.message}
            </Text>
          )}

          {/* Expense candidates */}
          {candidates.length > 0 && (
            <View style={styles.candidatesContainer}>
              {candidates.map((candidate, index) => (
                <Surface
                  key={candidate.id || index}
                  style={[
                    styles.candidateCard,
                    { backgroundColor: colors.surface },
                  ]}
                  elevation={1}
                >
                  <View style={styles.candidateHeader}>
                    <MaterialCommunityIcons
                      name={
                        candidate.type === "income"
                          ? "arrow-down-circle"
                          : "arrow-up-circle"
                      }
                      size={24}
                      color={
                        candidate.type === "income"
                          ? colors.tertiary
                          : colors.error
                      }
                    />
                    <View style={styles.candidateInfo}>
                      <Text
                        variant="titleSmall"
                        style={{ color: colors.onSurface }}
                      >
                        {candidate.merchant_name || "Transaction"}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: colors.onSurfaceVariant }}
                      >
                        {candidate.date || selectedChatDate}
                        {candidate.category && ` • ${candidate.category}`}
                      </Text>
                    </View>
                    <Text
                      variant="titleMedium"
                      style={{
                        color:
                          candidate.type === "income"
                            ? colors.tertiary
                            : colors.error,
                        fontWeight: "600",
                      }}
                    >
                      {formatAmount(candidate.amount || 0)}
                    </Text>
                  </View>
                  <Button
                    mode="contained"
                    compact
                    onPress={() => {
                      if (isOpeningTransactionModal) {
                        return;
                      }
                      lockPreviewTap();

                      const receiptUri = getCandidateReceiptUri(message.id);
                      const params = prepareTransactionParams(
                        candidate,
                        receiptUri,
                      );

                      router.push({
                        pathname: "/transaction-modal",
                        params,
                      });
                    }}
                    style={styles.previewButton}
                    disabled={isOpeningTransactionModal}
                  >
                    {isOpeningTransactionModal
                      ? "Opening..."
                      : "Preview & Save"}
                  </Button>
                </Surface>
              ))}
            </View>
          )}

          {/* Suggested actions */}
          {!isUser && suggestedActions.length > 0 && (
            <View style={styles.suggestedActions}>
              {suggestedActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.suggestedAction,
                    { backgroundColor: colors.primaryContainer },
                  ]}
                  onPress={() => handleQuickAction(action)}
                >
                  <Text style={{ color: colors.primary, fontSize: 13 }}>
                    {action}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* User avatar */}
        {isUser && (
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.secondaryContainer },
            ]}
          >
            <MaterialCommunityIcons
              name="account"
              size={20}
              color={colors.secondary}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <BrandedHeader
        title="Finance Assistant"
        subtitle="Ask about expenses, reports, or scan receipts"
        right={
          <View style={[styles.statusDot, { backgroundColor: "#34a853" }]} />
        }
      />

      <View
        style={[
          styles.chatDateRow,
          { borderBottomColor: colors.outlineVariant },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.chatDateButton,
            { backgroundColor: colors.surfaceVariant },
          ]}
          onPress={handleOpenChatDatePicker}
        >
          <MaterialCommunityIcons
            name="calendar-month-outline"
            size={18}
            color={colors.primary}
          />
          <Text style={[styles.chatDateText, { color: colors.onSurface }]}>
            {selectedChatDateLabel}
          </Text>
        </TouchableOpacity>

        {!isTodayChatDate && (
          <TouchableOpacity
            style={[
              styles.chatDateTodayButton,
              { borderColor: colors.outlineVariant },
            ]}
            onPress={handleResetChatDateToToday}
          >
            <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>
              Today
            </Text>
          </TouchableOpacity>
        )}

        {isFetchingHistory && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {isLoadingHistory ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
          />
        )}

        {/* Typing indicator */}
        {isSending && (
          <View style={styles.typingContainer}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.primaryContainer },
              ]}
            >
              <MaterialCommunityIcons
                name="robot"
                size={16}
                color={colors.primary}
              />
            </View>
            <View
              style={[
                styles.typingBubble,
                { backgroundColor: colors.surfaceVariant },
              ]}
            >
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ color: colors.onSurfaceVariant, marginLeft: 8 }}>
                Thinking...
              </Text>
            </View>
          </View>
        )}

        {/* Selected file preview */}
        {selectedFile && (
          <View
            style={[
              styles.filePreview,
              { backgroundColor: colors.surfaceVariant },
            ]}
          >
            {selectedFile.type.startsWith("image/") ? (
              <Image
                source={{ uri: selectedFile.uri }}
                style={styles.filePreviewImage}
              />
            ) : (
              <MaterialCommunityIcons
                name="file-document"
                size={24}
                color={colors.primary}
              />
            )}
            <Text
              style={{ flex: 1, color: colors.onSurface, marginLeft: 8 }}
              numberOfLines={1}
            >
              {selectedFile.name}
            </Text>
            <IconButton
              icon="close"
              size={18}
              onPress={() => setSelectedFile(null)}
            />
          </View>
        )}

        {/* Input area */}
        <Surface
          style={[
            styles.inputContainer,
            { backgroundColor: colors.surface },
            Platform.OS === "android" &&
              keyboardHeight > 0 && { paddingBottom: keyboardHeight - 50 },
          ]}
          elevation={2}
        >
          {/* Quick actions */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[
                styles.quickActionChip,
                { backgroundColor: `${colors.error}15` },
              ]}
              onPress={() => handleQuickAction("Help me record a new expense")}
            >
              <MaterialCommunityIcons
                name="minus-circle"
                size={14}
                color={colors.error}
              />
              <Text
                style={{ color: colors.error, fontSize: 11, marginLeft: 4 }}
              >
                Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickActionChip,
                { backgroundColor: `${colors.tertiary}15` },
              ]}
              onPress={() => handleQuickAction("Help me record new income")}
            >
              <MaterialCommunityIcons
                name="plus-circle"
                size={14}
                color={colors.tertiary}
              />
              <Text
                style={{ color: colors.tertiary, fontSize: 11, marginLeft: 4 }}
              >
                Income
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickActionChip,
                { backgroundColor: `${colors.primary}15` },
              ]}
              onPress={() =>
                handleQuickAction("Show me a report for the last week")
              }
            >
              <MaterialCommunityIcons
                name="chart-bar"
                size={14}
                color={colors.primary}
              />
              <Text
                style={{ color: colors.primary, fontSize: 11, marginLeft: 4 }}
              >
                Report
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputRow}>
            {/* Attachment buttons */}
            <View style={styles.attachButtons}>
              <IconButton
                icon="camera"
                size={22}
                onPress={handleTakePhoto}
                iconColor={colors.onSurfaceVariant}
              />
              <IconButton
                icon="paperclip"
                size={22}
                onPress={handlePickImage}
                iconColor={colors.onSurfaceVariant}
              />
            </View>

            {/* Text input */}
            <RNTextInput
              ref={inputRef}
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surfaceVariant,
                  color: colors.onSurface,
                },
              ]}
              placeholder="Type or speak a message..."
              placeholderTextColor={colors.onSurfaceVariant}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
            />

            {/* Voice/Send button */}
            {isRecording ||
            isTranscribing ||
            (!inputText.trim() && !selectedFile) ? (
              <IconButton
                icon={
                  isRecording
                    ? "stop"
                    : isTranscribing
                      ? "loading"
                      : "microphone"
                }
                size={24}
                onPress={toggleRecording}
                iconColor={
                  isRecording || isTranscribing
                    ? colors.error
                    : colors.onSurfaceVariant
                }
                style={{
                  backgroundColor:
                    isRecording || isTranscribing
                      ? `${colors.error}20`
                      : "transparent",
                }}
                disabled={isTranscribing}
              />
            ) : (
              <IconButton
                icon="send"
                size={24}
                onPress={handleSend}
                iconColor="#ffffff"
                style={{ backgroundColor: colors.primary }}
                disabled={isSending}
              />
            )}
          </View>

          {/* Recording indicator */}
          {(isRecording || isTranscribing) && (
            <View
              style={[
                styles.recordingIndicator,
                { backgroundColor: `${colors.error}10` },
              ]}
            >
              <MaterialCommunityIcons
                name={isTranscribing ? "loading" : "microphone"}
                size={16}
                color={colors.error}
              />
              <Text
                style={{ color: colors.error, marginLeft: 8, fontSize: 12 }}
              >
                {isTranscribing
                  ? "Finishing voice input..."
                  : "Listening... Tap stop when done"}
              </Text>
            </View>
          )}
        </Surface>
      </KeyboardAvoidingView>

      <ThemedDatePicker
        visible={showChatDatePicker}
        value={new Date(`${selectedChatDate}T00:00:00`)}
        title="Select chat date"
        maxDate={new Date()}
        onCancel={() => setShowChatDatePicker(false)}
        onConfirm={handleChatDateConfirm}
      />

      {/* Preview Modal */}
      <Portal>
        <Modal
          visible={previewVisible}
          onDismiss={() => setPreviewVisible(false)}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: colors.surface },
          ]}
        >
          {previewCandidate && (
            <View>
              <Text
                variant="titleLarge"
                style={{ color: colors.onSurface, marginBottom: 16 }}
              >
                Transaction Preview
              </Text>

              <View style={styles.previewRow}>
                <Text style={{ color: colors.onSurfaceVariant }}>Type</Text>
                <Text style={{ color: colors.onSurface, fontWeight: "500" }}>
                  {previewCandidate.type?.charAt(0).toUpperCase() +
                    (previewCandidate.type?.slice(1) || "")}
                </Text>
              </View>
              <Divider style={{ marginVertical: 8 }} />

              <View style={styles.previewRow}>
                <Text style={{ color: colors.onSurfaceVariant }}>Merchant</Text>
                <Text style={{ color: colors.onSurface, fontWeight: "500" }}>
                  {previewCandidate.merchant_name || "-"}
                </Text>
              </View>
              <Divider style={{ marginVertical: 8 }} />

              <View style={styles.previewRow}>
                <Text style={{ color: colors.onSurfaceVariant }}>Amount</Text>
                <Text
                  style={{
                    color:
                      previewCandidate.type === "income"
                        ? colors.tertiary
                        : colors.error,
                    fontWeight: "600",
                    fontSize: 18,
                  }}
                >
                  {formatAmount(previewCandidate.amount || 0)}
                </Text>
              </View>
              <Divider style={{ marginVertical: 8 }} />

              <View style={styles.previewRow}>
                <Text style={{ color: colors.onSurfaceVariant }}>Date</Text>
                <Text style={{ color: colors.onSurface, fontWeight: "500" }}>
                  {previewCandidate.date || selectedChatDate}
                </Text>
              </View>
              <Divider style={{ marginVertical: 8 }} />

              <View style={styles.previewRow}>
                <Text style={{ color: colors.onSurfaceVariant }}>Category</Text>
                <Text style={{ color: colors.onSurface, fontWeight: "500" }}>
                  {previewCandidate.category || "-"}
                </Text>
              </View>

              {previewCandidate.notes && (
                <>
                  <Divider style={{ marginVertical: 8 }} />
                  <View style={styles.previewRow}>
                    <Text style={{ color: colors.onSurfaceVariant }}>
                      Notes
                    </Text>
                    <Text
                      style={{
                        color: colors.onSurface,
                        fontWeight: "500",
                        flex: 1,
                        textAlign: "right",
                      }}
                    >
                      {previewCandidate.notes}
                    </Text>
                  </View>
                </>
              )}

              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setPreviewVisible(false)}
                  style={{ flex: 1, marginRight: 8 }}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={() => {
                    if (isOpeningTransactionModal) {
                      return;
                    }
                    lockPreviewTap();
                    setPreviewVisible(false);
                    if (previewCandidate) {
                      // Use previewReceiptUrl or fallback to lastUploadedFileUri
                      const receiptUri =
                        previewReceiptUrl || lastUploadedFileUri;
                      const params = prepareTransactionParams(
                        previewCandidate,
                        receiptUri,
                      );
                      router.push({
                        pathname: "/transaction-modal",
                        params,
                      });
                    }
                  }}
                  style={{ flex: 1 }}
                  disabled={isOpeningTransactionModal}
                >
                  {isOpeningTransactionModal ? "Opening..." : "Edit & Save"}
                </Button>
              </View>
            </View>
          )}
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  chatDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  chatDateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
  },
  chatDateText: {
    fontSize: 13,
    fontWeight: "600",
  },
  chatDateTodayButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-end",
  },
  userMessageContainer: {
    justifyContent: "flex-end",
  },
  assistantMessageContainer: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  messageBubble: {
    maxWidth: "75%",
    borderRadius: 16,
    padding: 12,
  },
  imageMessageBubble: {
    minWidth: 220,
    padding: 8,
  },
  userBubble: {
    marginRight: 8,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    marginLeft: 8,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageImage: {
    width: "100%",
    height: 170,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileAttachment: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  candidatesContainer: {
    marginTop: 12,
    gap: 8,
  },
  candidateCard: {
    borderRadius: 12,
    padding: 12,
  },
  candidateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  candidateInfo: {
    flex: 1,
    marginLeft: 12,
  },
  previewButton: {
    marginTop: 4,
  },
  suggestedActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  suggestedAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  filePreview: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
  },
  filePreviewImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  inputContainer: {
    padding: 8,
    paddingBottom: Platform.OS === "ios" ? 8 : 8,
  },
  quickActionsRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 8,
  },
  quickActionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  attachButtons: {
    flexDirection: "row",
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    marginHorizontal: 4,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    marginTop: 8,
    borderRadius: 8,
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: 24,
  },
});

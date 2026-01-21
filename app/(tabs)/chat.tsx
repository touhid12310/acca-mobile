import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'react-native';
import {
  Text,
  Surface,
  IconButton,
  ActivityIndicator,
  Button,
  Portal,
  Modal,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import { router } from 'expo-router';

import { useTheme } from '../../src/contexts/ThemeContext';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import { useAuth } from '../../src/contexts/AuthContext';
import chatService from '../../src/services/chatService';
import categoryService from '../../src/services/categoryService';
import accountService from '../../src/services/accountService';
import { ChatMessage, ExpenseCandidate, Category, Account } from '../../src/types';
import { formatDate, todayDateInputValue } from '../../src/utils/date';

const API_BASE_URL = 'https://acca-api.autoaiassistant.com/';

// Helper to ensure absolute URL for images
const ensureAbsoluteUrl = (value?: string): string | null => {
  if (!value || typeof value !== 'string') return null;
  if (value.startsWith('blob:') || value.startsWith('data:') || value.startsWith('file:')) {
    return value;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  const normalizedBase = API_BASE_URL.replace(/\/$/, '');
  const normalizedPath = value.replace(/^\/+/, '');
  return `${normalizedBase}/${normalizedPath}`;
};

// Helper to extract attachment from a message
const getMessageAttachment = (message: ChatMessage): { url: string; name: string; isImage: boolean } | null => {
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
      const fileName = message.file_name || (metadata as any).receipt_name || 'attachment';
      const mimeType = (message.file_mime || (metadata as any).receipt_mime || '').toLowerCase();
      const isImage = mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(fileName);
      return { url, name: fileName, isImage };
    }
  }
  return null;
};

// Helper to find related attachment for an assistant message (looks at preceding user message)
const findRelatedAttachment = (
  targetMessage: ChatMessage,
  allMessages: ChatMessage[]
): { url: string; name: string; isImage: boolean } | null => {
  // First check if the target message itself has an attachment
  const directAttachment = getMessageAttachment(targetMessage);
  if (directAttachment) return directAttachment;

  // Find the index of the target message
  const targetIndex = allMessages.findIndex((m) => m.id === targetMessage.id);
  if (targetIndex === -1) return null;

  // Look backwards for the most recent user message with an attachment
  for (let i = targetIndex - 1; i >= 0; i--) {
    const msg = allMessages[i];
    if (msg.is_user) {
      const attachment = getMessageAttachment(msg);
      if (attachment) return attachment;
      break; // Stop at the first user message
    }
  }

  return null;
};

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  is_user: false,
  message:
    "Hello! I'm your finance assistant. You can upload receipts, CSVs, or ask me for quick reports.",
  metadata: {
    suggested_actions: [
      'Show me a report for the last 3 days',
      'Help me record a new expense',
    ],
  },
};

export default function ChatScreen() {
  const { colors, isDark } = useTheme();
  const { formatAmount } = useCurrency();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<RNTextInput>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewCandidate, setPreviewCandidate] = useState<ExpenseCandidate | null>(
    null
  );

  // Helper function to prepare transaction params for navigation (like web app)
  const prepareTransactionParams = (candidate: ExpenseCandidate, receiptUri?: string) => {
    const merchantName = candidate.merchant_name || 'Unknown';
    const amount = candidate.amount || 0;
    const transactionType = candidate.type || 'expense';
    const date = candidate.date || new Date().toISOString().split('T')[0];
    const notes = candidate.notes || '';

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
      const paymentName = (candidate.payment_method as string).toLowerCase().trim();
      for (const acc of paymentMethodsData) {
        if (acc.account_name.toLowerCase().trim() === paymentName) {
          accountId = acc.id;
          break;
        }
      }
    }

    // Prepare items - if candidate has items, use them; otherwise create a default item
    let itemsToSend: Array<{ name: string; quantity: number; price: number; total: number }> = [];

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
      itemsToSend = [{
        name: merchantName,
        quantity: 1,
        price: amount,
        total: amount,
      }];
    }

    return {
      type: transactionType,
      amount: amount.toString(),
      merchant_name: merchantName,
      description: '',
      date: date,
      category_id: categoryId?.toString() || '',
      subcategory_id: subcategoryId?.toString() || '',
      account_id: accountId?.toString() || '',
      notes: notes,
      items: JSON.stringify(itemsToSend),
      receipt_uri: receiptUri || '',
    };
  };

  // Fetch categories for context
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', 'forChat'],
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
    queryKey: ['paymentMethods', 'forChat'],
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
  const { data: messagesData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['chat', 'messages'],
    queryFn: async () => {
      const result = await chatService.getMessages();
      if (result.success) {
        const data =
          (result.data as { data?: { data?: ChatMessage[] } })?.data?.data ||
          (result.data as { data?: ChatMessage[] })?.data ||
          result.data;
        return Array.isArray(data) ? data : [];
      }
      return [];
    },
    enabled: !!token,
  });

  // Update messages when history loads
  useEffect(() => {
    if (messagesData && messagesData.length > 0) {
      setMessages(messagesData);
    }
  }, [messagesData]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      message,
      file,
    }: {
      message?: string;
      file?: { uri: string; name: string; type: string };
    }) => {
      const categoryContext = categoriesData?.map((cat: Category) => ({
        id: cat.id,
        name: cat.name,
        type: cat.type,
        subcategories: cat.subcategories?.map((sub: { id: number; name: string }) => ({
          id: sub.id,
          name: sub.name,
        })),
      }));

      const paymentMethodContext = paymentMethodsData?.map((acc: Account) => ({
        id: acc.id,
        name: acc.account_name,
      }));

      return chatService.sendMessage({
        message,
        file,
        categories: categoryContext,
        paymentMethods: paymentMethodContext,
      });
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        const data = result.data as {
          success?: boolean;
          data?: { user?: ChatMessage; assistant?: ChatMessage };
        };
        if (data.success && data.data?.user && data.data?.assistant) {
          setMessages((prev) => [...prev, data.data!.user!, data.data!.assistant!]);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages'] });
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

    setInputText('');
    setSelectedFile(null);

    // Add optimistic user message
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      is_user: true,
      message: messageText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      await sendMessageMutation.mutateAsync({
        message: messageText || undefined,
        file: file || undefined,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle image picker
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll access to upload images.');
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
        type: asset.mimeType || 'image/jpeg',
      });
    }
  };

  // Handle camera
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera access to take photos.');
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
        type: asset.mimeType || 'image/jpeg',
      });
    }
  };

  // Handle document picker
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/csv', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
        });
      }
    } catch (error) {
      console.error('Document picker error:', error);
    }
  };

  // Handle voice recording
  const startRecording = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permission needed', 'Please grant microphone access to record audio.');
        return;
      }

      audioRecorder.record();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording.');
    }
  };

  const stopRecording = async () => {
    if (!audioRecorder.isRecording) return;

    setIsRecording(false);
    setIsTranscribing(true);

    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (uri) {
        // Transcribe audio
        const result = await chatService.transcribeAudio({
          uri,
          name: 'recording.m4a',
          type: 'audio/m4a',
        });

        if (result.success && result.data) {
          const data = result.data as { success?: boolean; data?: { text?: string } };
          if (data.success && data.data?.text) {
            setInputText((prev) =>
              prev ? `${prev} ${data.data!.text}` : data.data!.text || ''
            );
          } else {
            Alert.alert('Transcription failed', 'Could not transcribe audio.');
          }
        }
      }
    } catch (error) {
      console.error('Transcription error:', error);
      Alert.alert('Error', 'Failed to transcribe audio.');
    } finally {
      setIsTranscribing(false);
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

  // Track receipt for preview modal
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | undefined>();

  // Handle preview candidate
  const openPreview = (candidate: ExpenseCandidate, receiptUrl?: string) => {
    setPreviewCandidate(candidate);
    setPreviewReceiptUrl(receiptUrl);
    setPreviewVisible(true);
  };

  // Parse expense candidates from message metadata
  const getExpenseCandidates = (message: ChatMessage): ExpenseCandidate[] => {
    if (!message.metadata?.expense_candidates) return [];
    return Array.isArray(message.metadata.expense_candidates)
      ? message.metadata.expense_candidates
      : [];
  };

  // Render message
  const renderMessage = ({ item: message }: { item: ChatMessage }) => {
    const isUser = message.is_user;
    const candidates = getExpenseCandidates(message);
    const suggestedActions = message.metadata?.suggested_actions || [];
    const attachment = getMessageAttachment(message);
    // For assistant messages with candidates, find the related user attachment
    const relatedAttachment = !isUser && candidates.length > 0
      ? findRelatedAttachment(message, messages)
      : null;

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
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
            isUser
              ? [styles.userBubble, { backgroundColor: colors.primary }]
              : [styles.assistantBubble, { backgroundColor: colors.surfaceVariant }],
          ]}
        >
          {/* Attachment preview (for user messages with images) */}
          {attachment && attachment.isImage && (
            <Image
              source={{ uri: attachment.url }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}

          {/* Non-image attachment */}
          {attachment && !attachment.isImage && (
            <View style={[styles.fileAttachment, { backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : colors.surface }]}>
              <MaterialCommunityIcons
                name="file-document"
                size={20}
                color={isUser ? '#ffffff' : colors.primary}
              />
              <Text
                style={{ color: isUser ? '#ffffff' : colors.onSurface, marginLeft: 8, flex: 1 }}
                numberOfLines={1}
              >
                {attachment.name}
              </Text>
            </View>
          )}

          {/* Message text */}
          {message.message && (
            <Text
              style={[
                styles.messageText,
                { color: isUser ? '#ffffff' : colors.onSurface },
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
                  style={[styles.candidateCard, { backgroundColor: colors.surface }]}
                  elevation={1}
                >
                  <View style={styles.candidateHeader}>
                    <MaterialCommunityIcons
                      name={candidate.type === 'income' ? 'arrow-down-circle' : 'arrow-up-circle'}
                      size={24}
                      color={candidate.type === 'income' ? colors.tertiary : colors.error}
                    />
                    <View style={styles.candidateInfo}>
                      <Text variant="titleSmall" style={{ color: colors.onSurface }}>
                        {candidate.merchant_name || 'Transaction'}
                      </Text>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                        {candidate.date || todayDateInputValue()}
                        {candidate.category && ` • ${candidate.category}`}
                      </Text>
                    </View>
                    <Text
                      variant="titleMedium"
                      style={{
                        color: candidate.type === 'income' ? colors.tertiary : colors.error,
                        fontWeight: '600',
                      }}
                    >
                      {formatAmount(candidate.amount || 0)}
                    </Text>
                  </View>
                  <Button
                    mode="contained"
                    compact
                    onPress={() => {
                      // Pass receipt URI if there's a related attachment
                      const receiptUri = relatedAttachment?.url || attachment?.url;
                      const params = prepareTransactionParams(candidate, receiptUri);
                      router.push({
                        pathname: '/transaction-modal',
                        params,
                      });
                    }}
                    style={styles.previewButton}
                  >
                    Preview & Save
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
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.outlineVariant }]}>
        <View style={styles.headerContent}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primaryContainer }]}>
            <MaterialCommunityIcons name="robot" size={24} color={colors.primary} />
          </View>
          <View>
            <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>
              Finance Assistant
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              Ask about expenses, reports, or scan receipts
            </Text>
          </View>
        </View>
        <View style={[styles.statusDot, { backgroundColor: '#34a853' }]} />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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
            <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
              <MaterialCommunityIcons name="robot" size={16} color={colors.primary} />
            </View>
            <View style={[styles.typingBubble, { backgroundColor: colors.surfaceVariant }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ color: colors.onSurfaceVariant, marginLeft: 8 }}>
                Thinking...
              </Text>
            </View>
          </View>
        )}

        {/* Selected file preview */}
        {selectedFile && (
          <View style={[styles.filePreview, { backgroundColor: colors.surfaceVariant }]}>
            {selectedFile.type.startsWith('image/') ? (
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
            <Text style={{ flex: 1, color: colors.onSurface, marginLeft: 8 }} numberOfLines={1}>
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
          style={[styles.inputContainer, { backgroundColor: colors.surface }]}
          elevation={2}
        >
          {/* Quick actions */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[styles.quickActionChip, { backgroundColor: `${colors.error}15` }]}
              onPress={() => handleQuickAction('Help me record a new expense')}
            >
              <MaterialCommunityIcons name="minus-circle" size={14} color={colors.error} />
              <Text style={{ color: colors.error, fontSize: 11, marginLeft: 4 }}>
                Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionChip, { backgroundColor: `${colors.tertiary}15` }]}
              onPress={() => handleQuickAction('Help me record new income')}
            >
              <MaterialCommunityIcons name="plus-circle" size={14} color={colors.tertiary} />
              <Text style={{ color: colors.tertiary, fontSize: 11, marginLeft: 4 }}>
                Income
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionChip, { backgroundColor: `${colors.primary}15` }]}
              onPress={() => handleQuickAction('Show me a report for the last week')}
            >
              <MaterialCommunityIcons name="chart-bar" size={14} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 11, marginLeft: 4 }}>
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
              placeholder="Type a message..."
              placeholderTextColor={colors.onSurfaceVariant}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
            />

            {/* Voice/Send button */}
            {inputText.trim() || selectedFile ? (
              <IconButton
                icon="send"
                size={24}
                onPress={handleSend}
                iconColor="#ffffff"
                style={{ backgroundColor: colors.primary }}
                disabled={isSending}
              />
            ) : (
              <IconButton
                icon={isRecording ? 'stop' : 'microphone'}
                size={24}
                onPress={toggleRecording}
                iconColor={isRecording ? colors.error : colors.onSurfaceVariant}
                style={{
                  backgroundColor: isRecording ? `${colors.error}20` : 'transparent',
                }}
                disabled={isTranscribing}
              />
            )}
          </View>

          {/* Recording indicator */}
          {(isRecording || isTranscribing) && (
            <View style={[styles.recordingIndicator, { backgroundColor: `${colors.error}10` }]}>
              <MaterialCommunityIcons
                name={isTranscribing ? 'loading' : 'microphone'}
                size={16}
                color={colors.error}
              />
              <Text style={{ color: colors.error, marginLeft: 8, fontSize: 12 }}>
                {isTranscribing ? 'Transcribing...' : 'Recording... Tap mic to stop'}
              </Text>
            </View>
          )}
        </Surface>
      </KeyboardAvoidingView>

      {/* Preview Modal */}
      <Portal>
        <Modal
          visible={previewVisible}
          onDismiss={() => setPreviewVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
        >
          {previewCandidate && (
            <View>
              <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 16 }}>
                Transaction Preview
              </Text>

              <View style={styles.previewRow}>
                <Text style={{ color: colors.onSurfaceVariant }}>Type</Text>
                <Text style={{ color: colors.onSurface, fontWeight: '500' }}>
                  {previewCandidate.type?.charAt(0).toUpperCase() +
                    (previewCandidate.type?.slice(1) || '')}
                </Text>
              </View>
              <Divider style={{ marginVertical: 8 }} />

              <View style={styles.previewRow}>
                <Text style={{ color: colors.onSurfaceVariant }}>Merchant</Text>
                <Text style={{ color: colors.onSurface, fontWeight: '500' }}>
                  {previewCandidate.merchant_name || '-'}
                </Text>
              </View>
              <Divider style={{ marginVertical: 8 }} />

              <View style={styles.previewRow}>
                <Text style={{ color: colors.onSurfaceVariant }}>Amount</Text>
                <Text
                  style={{
                    color:
                      previewCandidate.type === 'income' ? colors.tertiary : colors.error,
                    fontWeight: '600',
                    fontSize: 18,
                  }}
                >
                  {formatAmount(previewCandidate.amount || 0)}
                </Text>
              </View>
              <Divider style={{ marginVertical: 8 }} />

              <View style={styles.previewRow}>
                <Text style={{ color: colors.onSurfaceVariant }}>Date</Text>
                <Text style={{ color: colors.onSurface, fontWeight: '500' }}>
                  {previewCandidate.date || todayDateInputValue()}
                </Text>
              </View>
              <Divider style={{ marginVertical: 8 }} />

              <View style={styles.previewRow}>
                <Text style={{ color: colors.onSurfaceVariant }}>Category</Text>
                <Text style={{ color: colors.onSurface, fontWeight: '500' }}>
                  {previewCandidate.category || '-'}
                </Text>
              </View>

              {previewCandidate.notes && (
                <>
                  <Divider style={{ marginVertical: 8 }} />
                  <View style={styles.previewRow}>
                    <Text style={{ color: colors.onSurfaceVariant }}>Notes</Text>
                    <Text style={{ color: colors.onSurface, fontWeight: '500', flex: 1, textAlign: 'right' }}>
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
                    setPreviewVisible(false);
                    if (previewCandidate) {
                      const params = prepareTransactionParams(previewCandidate, previewReceiptUrl);
                      router.push({
                        pathname: '/transaction-modal',
                        params,
                      });
                    }
                  }}
                  style={{ flex: 1 }}
                >
                  Edit & Save
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  assistantMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
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
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  suggestedAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingBottom: Platform.OS === 'ios' ? 8 : 8,
  },
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 8,
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  attachButtons: {
    flexDirection: 'row',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
  },
});

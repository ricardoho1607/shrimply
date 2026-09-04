import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGemini } from './hooks/useGemini';
import { isPondCycleActive, usePondStore } from './store/pondStore';
import { useAuth } from '../context/AuthContext';
import ShrimpIcon from './components/icons/ShrimpIcon';
import { orsonIdentityKey, OrsonSessionChangedError } from '../orson/session';
import { OrsonIncompleteResponseError } from '../orson/responseCompletion';
import { hasFarmPermission } from '../shared/permissions';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  message: string;
  timestamp: Date;
  language?: string;
  retryPrompt?: string;
}

// --- HELPERS ---
const detectLanguage = (text: string): string => {
  const cleanText = text.toLowerCase().trim();
  if (cleanText.length < 5) return 'en';
  const patterns = {
    en: { common: /\b(the|is|and|to|a|in|for|on|of|with|you|i)\b/gi, weight: 1 },
    id: { common: /\b(dan|atau|tidak|ya|saya|kami|udang|tambak|air|pakan)\b/gi, weight: 3 },
    zh: { common: /[\u4e00-\u9fff]/g, weight: 1.5 },
    th: { common: /[\u0e00-\u0e7f]/g, weight: 1.5 },
    vi: { common: /\b(tôm|ao|nước|thức ăn|nuôi trồng|bệnh|tăng trưởng)\b/gi, weight: 2 }
  };
  let maxScore = 0;
  let detectedLang = 'en';
  for (const [lang, config] of Object.entries(patterns)) {
    const matches = cleanText.match(config.common);
    const score = matches ? matches.length * (config as any).weight : 0;
    if (score > maxScore) {
      maxScore = score;
      detectedLang = lang;
    }
  }
  return detectedLang;
};

const getWelcomeMessage = (language: string) => {
  const messages: { [key: string]: string } = {
    en: "Hello! I'm Orson, your AI aquaculture assistant. I'm currently monitoring your ponds. How can I help you today?",
    id: "Halo! Saya Orson, asisten AI budidaya Anda. Saya sedang memantau tambak Anda. Ada yang bisa saya bantu?",
  };
  return messages[language] || messages.en;
};

// --- MAIN COMPONENT ---
export default function AIChat() {
  const { user, company, loading } = useAuth();
  const { currentCompanyId, farmCacheUserId } = usePondStore();
  const identity = !loading && user?.companyId === company?.id && currentCompanyId === company?.id && farmCacheUserId === user?.uid
    ? orsonIdentityKey(user?.uid, company?.id) : null;
  if (!identity) return null;
  return <AIChatSession key={identity} />;
}

function AIChatSession() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [conversationLanguage, setConversationLanguage] = useState('en');
  const [isInitialized, setIsInitialized] = useState(false);
  const [streamingReplyId, setStreamingReplyId] = useState<string | null>(null);
  
  const { sendMessage, loading, clearChat } = useGemini();
  const { ponds } = usePondStore(); 
  const activePonds = useMemo(() => ponds.filter(isPondCycleActive), [ponds]);
  const { user, company } = useAuth();
  const canUseOrson = hasFarmPermission(user, 'useOrson', company?.ownerId);
  
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const generation = useRef(0);
  useEffect(() => () => { generation.current += 1; }, []);

  useEffect(() => {
    if (!isInitialized) {
      setMessages([{
        id: '1',
        type: 'ai',
        message: getWelcomeMessage('en'),
        timestamp: new Date(),
        language: 'en'
      }]);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, loading]);

  const confirmClearChat = () => {
    Alert.alert(
      "Clear Chat",
      "Are you sure you want to delete all messages?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear", 
          style: "destructive", 
          onPress: () => {
            generation.current += 1;
            clearChat();
            setStreamingReplyId(null);
            setMessages([{
              id: Date.now().toString(),
              type: 'ai',
              message: getWelcomeMessage(conversationLanguage),
              timestamp: new Date()
            }]);
          } 
        }
      ]
    );
  };

  const handleSend = async (retryPrompt?: string, retryId?: string) => {
    const userText = (retryPrompt || inputText).trim();
    if (!userText || loading) return;
    const currentGeneration = ++generation.current;
    const isCurrent = () => generation.current === currentGeneration;
    const detectedLang = detectLanguage(userText);
    if (detectedLang !== conversationLanguage && detectedLang !== 'en') {
      setConversationLanguage(detectedLang);
    }
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      message: userText,
      timestamp: new Date(),
      language: detectedLang
    };
    if (!retryId) setMessages(prev => [...prev, userMessage]);
    setInputText('');
    const replyId = retryId || `orson-${Date.now()}`;
    const replyTimestamp = new Date();
    const upsertReply = (message: string, retryPrompt?: string) => {
      if (!isCurrent()) return;
      setMessages((previous) => {
        const existing = previous.findIndex((item) => item.id === replyId);
        const reply: ChatMessage = { id: replyId, type: 'ai', message, timestamp: replyTimestamp, ...(retryPrompt ? { retryPrompt } : {}) };
        if (existing < 0) return [...previous, reply];
        return previous.map((item, index) => index === existing ? reply : item);
      });
    };
    try {
      const aiResponse = await sendMessage(userText, activePonds, {
        companyId: company?.id,
        timeZone: company?.timeZone,
        conversationHistory: messages
          .filter(message => !message.retryPrompt && message.id !== retryId && message.id !== '1')
          .slice(-10)
          .map((message) => ({ role: message.type === 'ai' ? 'model' : 'user', text: message.message })),
        onPartialResponse: (partialResponse) => {
          if (!isCurrent()) return;
          setStreamingReplyId(replyId);
          upsertReply(partialResponse, userText);
        },
      });
      upsertReply(aiResponse);
    } catch (error) {
      if (!isCurrent() || error instanceof OrsonSessionChangedError) return;
      upsertReply(error instanceof OrsonIncompleteResponseError ? error.partialText : '', userText);
    } finally {
      if (isCurrent()) setStreamingReplyId(null);
    }
  };

  if (!canUseOrson) return (
    <SafeAreaView style={styles.fullContainer}><View style={[styles.flex, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}><Text>You do not have permission to use Orson AI.</Text></View></SafeAreaView>
  );

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#dce8f2" />
      
      <SafeAreaView style={styles.topSafeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#0d2137" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Orson AI</Text>
            <Text style={styles.headerSubtitle}>{activePonds.length} Active Ponds Connected</Text>
          </View>

          <TouchableOpacity onPress={confirmClearChat} style={styles.headerSide}>
            <Ionicons name="trash-outline" size={20} color="#0d2137" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message) => (
             <View key={message.id} style={[
                styles.messageContainer,
                message.type === 'user' ? styles.userMessage : styles.aiMessage
              ]}>
                <View style={[
                  styles.messageBubble,
                  message.type === 'user' ? styles.userBubble : styles.aiBubble
                ]}>
                  {message.type === 'ai' && (
                    <View style={styles.aiIcon}>
                      <ShrimpIcon size={14} color="#315f57" strokeWidth={2.2} />
                    </View>
                  )}
                  <Text style={[styles.messageText, message.type === 'user' ? styles.userText : styles.aiText]}>
                    {message.message}
                  </Text>
                  {message.retryPrompt && <TouchableOpacity disabled={loading} onPress={() => handleSend(message.retryPrompt, message.id)}><Text>Response interrupted. Retry</Text></TouchableOpacity>}
                </View>
                <Text style={styles.timestamp}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
          ))}
          {loading && !streamingReplyId && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#315f57" />
              <Text style={styles.loadingText}>Orson is checking water data...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input Bar with fixed iOS Bottom Overlap */}
        <View style={[
          styles.inputContainer, 
          { paddingBottom: Platform.OS === 'ios' ? (insets.bottom > 0 ? insets.bottom : 20) : 15 }
        ]}>
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about your ponds..."
              placeholderTextColor="#6b8aa0"
              multiline
              editable={!loading}
            />
            <TouchableOpacity 
              style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
              onPress={() => handleSend()}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: { flex: 1, backgroundColor: '#dce8f2' },
  topSafeArea: { backgroundColor: '#dce8f2' },
  flex: { flex: 1, backgroundColor: '#f4f8fc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#dce8f2',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#0d2137', fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: '#0d2137', fontSize: 11, opacity: 0.8 },
  backButton: { width: 40 },
  headerSide: { width: 40, alignItems: 'flex-end' },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, paddingTop: 10, paddingBottom: 20 },
  messageContainer: { marginVertical: 6, maxWidth: '85%' },
  userMessage: { alignSelf: 'flex-end' },
  aiMessage: { alignSelf: 'flex-start' },
  messageBubble: { padding: 12, borderRadius: 18, flexDirection: 'row' },
  userBubble: { backgroundColor: '#0d2137' },
  aiBubble: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  aiIcon: { marginRight: 8, marginTop: 4 },
  messageText: { fontSize: 15, lineHeight: 20, flexShrink: 1 },
  userText: { color: '#FFFFFF' },
  aiText: { color: '#0d2137' },
  timestamp: { fontSize: 10, color: '#94A3B8', marginTop: 4, marginHorizontal: 8 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  loadingText: { marginLeft: 8, color: '#64748B', fontSize: 13 },
  inputContainer: { 
    paddingTop: 12, 
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF', 
    borderTopWidth: 1, 
    borderColor: '#E2E8F0',
  },
  textInputContainer: { flexDirection: 'row', alignItems: 'flex-end' },
  textInput: { 
    flex: 1, 
    backgroundColor: '#F1F5F9', 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#0d2137'
  },
  sendButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#315f57', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 8 
  },
  sendButtonDisabled: { backgroundColor: '#CBD5E1' },
});

import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
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
import { orsonIdentityKey, OrsonSessionChangedError } from '../orson/session';
import { cleanOrsonResponse } from '../orson/promptBuilder';
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
    en: "Hello! I'm Orson, your AI aquaculture advisor. I've analyzed your farm data and I'm ready to help you optimize growth and prevent issues. What's on your mind today?",
    id: "Halo! Saya Orson, penasihat AI budidaya Anda. Saya telah menganalisis data tambak dan siap membantu mengoptimalkan pertumbuhan serta mencegah masalah. Apa yang ingin Anda tanyakan hari ini?",
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
  const [messages, setMessages] = useState<ChatMessage[]>(() => [{ id: '1', type: 'ai', message: getWelcomeMessage('en'), timestamp: new Date(), language: 'en' }]);
  const [inputText, setInputText] = useState('');
  const [conversationLanguage, setConversationLanguage] = useState('en');
  const [streamingReplyId, setStreamingReplyId] = useState<string | null>(null);
  const [analyzingDots, setAnalyzingDots] = useState('.');
  
  const { sendMessage, loading, clearChat } = useGemini();

  useEffect(() => {
    if (!loading || streamingReplyId) {
      return;
    }
    const interval = setInterval(() => {
      setAnalyzingDots((prev) => (prev.length >= 3 ? '.' : prev + '.'));
    }, 450);
    return () => clearInterval(interval);
  }, [loading, streamingReplyId]);
  const { ponds } = usePondStore(); 
  const activePonds = useMemo(() => ponds.filter(isPondCycleActive), [ponds]);
  const { user, company } = useAuth();
  const canUseOrson = hasFarmPermission(user, 'useOrson', company?.ownerId);
  
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const generation = useRef(0);
  const aiMessageCount = useMemo(() => messages.filter((message) => message.type === 'ai').length, [messages]);
  useEffect(() => () => { generation.current += 1; }, []);



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
            setAnalyzingDots('.');
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

  const handleSend = useCallback(async (retryPrompt?: string, retryId?: string) => {
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
    setAnalyzingDots('.');
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
          .slice(-20)
          .map((message) => ({ role: message.type === 'ai' ? 'model' : 'user', text: message.message })),
        onPartialResponse: (partialResponse) => {
          if (!isCurrent()) return;
          setStreamingReplyId(replyId);
          upsertReply(partialResponse);
        },
      });
      upsertReply(aiResponse);
    } catch (error) {
      if (!isCurrent() || error instanceof OrsonSessionChangedError) return;
      upsertReply(error instanceof OrsonIncompleteResponseError ? error.partialText : '', userText);
    } finally {
      if (isCurrent()) setStreamingReplyId(null);
    }
  }, [inputText, loading, conversationLanguage, sendMessage, activePonds, company, messages]);

  if (!canUseOrson) return (
    <SafeAreaView style={styles.fullContainer}>
      <View style={styles.permissionState}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color="#0F4C75" />
        </TouchableOpacity>
        <Text style={styles.permissionText}>You do not have permission to use Orson AI.</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f8fc" />

      <SafeAreaView style={styles.topSafeArea} edges={['top', 'left', 'right']}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#0F4C75" />
            </TouchableOpacity>

            <View style={styles.heroTitleBlock}>
              <Text style={styles.eyebrow}>Orson AI</Text>
              <Text style={styles.heroTitle}>Aquaculture assistant</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Synced ponds</Text>
              <Text style={styles.statValue}>{activePonds.length}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>AI replies</Text>
              <Text style={styles.statValue}>{aiMessageCount}</Text>
            </View>
            <TouchableOpacity onPress={confirmClearChat} style={styles.resetButton} accessibilityRole="button" accessibilityLabel="Reset conversation">
              <Ionicons name="trash-outline" size={16} color="#cf3636" />
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.chatCard}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((message) => (
              <View key={message.id} style={[styles.messageContainer, message.type === 'user' ? styles.userMessage : styles.aiMessage]}>
                <View style={[styles.messageStack, message.type === 'user' && styles.userMessageStack]}>
                  <View style={[styles.messageBubble, message.type === 'user' && styles.userBubble]}>
                    <Text style={[styles.messageText, message.type === 'user' ? styles.userText : styles.aiText]}>
                      {message.type === 'ai' ? cleanOrsonResponse(message.message) : message.message}
                    </Text>
                    {message.retryPrompt && (
                      <TouchableOpacity disabled={loading} onPress={() => handleSend(message.retryPrompt, message.id)}>
                        <Text style={styles.retryText}>Response interrupted. Retry</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.timestamp}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))}
            {loading && !streamingReplyId && (
              <View style={styles.messageContainer}>
                <View style={styles.messageStack}>
                  <Text style={styles.thinkingText}>Orson is analyzing farm metrics{analyzingDots}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type a question for Orson..."
                placeholderTextColor="#7b8b99"
                multiline
                editable={!loading}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
                onPress={() => handleSend()}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: { flex: 1, backgroundColor: '#f4f8fc' },
  topSafeArea: { backgroundColor: '#f4f8fc' },
  permissionState: { flex: 1, padding: 20 },
  permissionText: { marginTop: 32, color: '#0F4C75', fontSize: 16, lineHeight: 24 },
  chatArea: { flex: 1, paddingHorizontal: 12, paddingBottom: 12, backgroundColor: '#f4f8fc' },
  hero: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  heroTitleBlock: { flex: 1 },
  eyebrow: { color: '#0F4C75', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  heroTitle: { marginTop: 4, color: '#17324D', fontSize: 23, lineHeight: 28, fontWeight: '700' },
  statsRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  statCard: { flex: 1, minWidth: 0, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: '#d9e4ec', borderRadius: 8, backgroundColor: '#FFFFFF' },
  statLabel: { color: '#7b8b99', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { marginTop: 3, color: '#17324D', fontSize: 17, lineHeight: 19, fontWeight: '700' },
  resetButton: { minWidth: 72, paddingHorizontal: 10, borderWidth: 1, borderColor: '#f4c7c7', borderRadius: 8, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 4 },
  resetText: { color: '#cf3636', fontSize: 12, fontWeight: '600' },
  chatCard: { flex: 1, minHeight: 0, overflow: 'hidden', borderWidth: 1, borderColor: '#d9e4ec', borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#0F4C75', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 20, paddingBottom: 26, gap: 18 },
  messageContainer: { maxWidth: '88%', alignSelf: 'flex-start' },
  userMessage: { alignSelf: 'flex-end' },
  aiMessage: { alignSelf: 'flex-start' },
  messageStack: { alignItems: 'flex-start', gap: 6 },
  userMessageStack: { alignItems: 'flex-end' },
  messageBubble: { maxWidth: '100%', padding: 0, backgroundColor: 'transparent' },
  userBubble: { paddingHorizontal: 16, paddingVertical: 14, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 4, backgroundColor: '#0F4C75', shadowColor: '#0F4C75', shadowOpacity: 0.18, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  messageText: { fontSize: 15, lineHeight: 24, flexShrink: 1 },
  userText: { color: '#FFFFFF' },
  aiText: { color: '#17324D' },
  thinkingText: { color: '#7b8b99', fontSize: 15, lineHeight: 24, fontStyle: 'italic' },
  retryText: { marginTop: 8, color: '#BBE1FA', fontSize: 13, fontWeight: '600' },
  timestamp: { color: '#a0adb8', fontSize: 10, fontWeight: '400' },
  inputContainer: { paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, borderColor: '#d9e4ec', backgroundColor: '#f8fbfd' },
  textInputContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  textInput: { flex: 1, minHeight: 50, maxHeight: 130, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#d9e4ec', borderRadius: 10, backgroundColor: '#FFFFFF', color: '#17324D', fontSize: 15, lineHeight: 20, shadowColor: '#0F4C75', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  sendButton: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#0F4C75', justifyContent: 'center', alignItems: 'center', shadowColor: '#0F4C75', shadowOpacity: 0.2, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  sendButtonDisabled: { backgroundColor: '#0F4C75', opacity: 0.48, shadowOpacity: 0 },
});

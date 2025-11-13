import React, { useState, useRef, useEffect } from 'react';
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
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGemini } from './hooks/useGemini';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  message: string;
  timestamp: Date;
  language?: string;
}

// Detect language
const detectLanguage = (text: string): string => {
  const cleanText = text.toLowerCase().trim();
  if (cleanText.length < 10) return 'en';

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
    const score = matches ? matches.length * config.weight : 0;
    if (score > maxScore) {
      maxScore = score;
      detectedLang = lang;
    }
  }

  return detectedLang;
};

const getLanguageName = (code: string) => {
  const languages: { [key: string]: string } = {
    en: 'English',
    id: 'Bahasa Indonesia',
    zh: '中文',
    vi: 'Tiếng Việt',
    th: 'ไทย'
  };
  return languages[code] || 'English';
};

const getWelcomeMessage = (language: string) => {
  const messages: { [key: string]: string } = {
    en: '🦐 Hello! I\'m your AI aquaculture assistant for iShrimp. I can help you with:\n\n• Water quality\n• Feeding schedules\n• Disease prevention\n• Growth monitoring\n• Harvest timing\n\nWhat would you like to know?',
    id: '🦐 Halo! Saya adalah asisten AI budidaya udang untuk iShrimp. Saya dapat membantu dengan:\n\n• Kualitas air\n• Jadwal pakan\n• Pencegahan penyakit\n• Monitoring pertumbuhan\n• Waktu panen\n\nApa yang ingin Anda ketahui?',
    zh: '🦐 你好！我是 iShrimp 的 AI 水产养殖助手。我可以帮助您：\n\n• 水质管理\n• 饲料安排\n• 疾病预防\n• 生长监测\n• 收获时间\n\n您想了解什么？',
    vi: '🦐 Xin chào! Tôi là trợ lý AI về nuôi tôm của iShrimp. Tôi có thể giúp bạn với:\n\n• Chất lượng nước\n• Lịch cho ăn\n• Phòng bệnh\n• Theo dõi tăng trưởng\n• Thời điểm thu hoạch\n\nBạn muốn biết gì?',
    th: '🦐 สวัสดี! ฉันเป็นผู้ช่วย AI ด้านการเลี้ยงกุ้งของ iShrimp ฉันสามารถช่วยคุณได้:\n\n• คุณภาพน้ำ\n• ตารางการให้อาหาร\n• การป้องกันโรค\n• การติดตามการเจริญเติบโต\n• เวลาการเก็บเกี่ยว\n\nคุณต้องการทราบอะไร?'
  };
  return messages[language] || messages.en;
};

export default function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [conversationLanguage, setConversationLanguage] = useState('en');
  const [isInitialized, setIsInitialized] = useState(false);
  const { generateContent: geminiSendMessage, loading } = useGemini();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<KeyboardAwareScrollView>(null);

  // Initialize welcome message
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

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd(), 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const detectedLang = detectLanguage(inputText.trim());
    if (detectedLang !== conversationLanguage && detectedLang !== 'en') {
      setConversationLanguage(detectedLang);
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      message: inputText.trim(),
      timestamp: new Date(),
      language: detectedLang
    };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText.trim();
    setInputText('');

    try {
      const aiResponse = await geminiSendMessage(currentInput);

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        message: aiResponse,
        timestamp: new Date(),
        language: detectedLang
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Shrimply Message Error:', err);
      Alert.alert('Shrimply Message Error', 'Failed to get Shrimply response. Please try again later.');
    }
  };

  const renderMessage = (message: ChatMessage) => (
    <View key={message.id} style={[
      styles.messageContainer,
      message.type === 'user' ? styles.userMessage : styles.aiMessage
    ]}>
      <View style={[
        styles.messageBubble,
        message.type === 'user' ? styles.userBubble : styles.aiBubble
      ]}>
        {message.type === 'ai' && (
          <View style={styles.aiIconContainer}>
            <Ionicons name="sparkles" size={Platform.OS === 'android' ? 12 : 14} color="#3282B8" />
          </View>
        )}
        <Text style={[
          styles.messageText,
          message.type === 'user' ? styles.userText : styles.aiText
        ]}>
          {message.message}
        </Text>
      </View>
      <View style={styles.messageFooter}>
        <Text style={styles.timestamp}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {message.language && message.language !== 'en' && (
          <Text style={styles.languageTag}>{getLanguageName(message.language)}</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#BBE1FA" translucent={false} />
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 10 : insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={Platform.OS === 'android' ? 22 : 24} color="#1B262C" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Shrimply AI</Text>
            {conversationLanguage !== 'en' && (
              <Text style={styles.headerLanguage}>• {getLanguageName(conversationLanguage)}</Text>
            )}
          </View>
          {/* Right spacer for perfect centering */}
          <View style={styles.headerSide} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <KeyboardAwareScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            enableOnAndroid={true}
            enableAutomaticScroll={true}
            extraScrollHeight={20}
          >
            {messages.map(renderMessage)}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3282B8" />
                <Text style={styles.loadingText}>Shrimply AI is thinking...</Text>
              </View>
            )}
          </KeyboardAwareScrollView>

          {/* Input */}
          <View style={[
            styles.inputContainer,
            { 
              paddingBottom: Platform.OS === 'android' 
                ? Math.max(insets.bottom, 14) 
                : Math.max(insets.bottom, 16) 
            }
          ]}>
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask about shrimp farming..."
                placeholderTextColor="#3282B8"
                multiline
                maxLength={500}
                editable={!loading}
              />
              <TouchableOpacity 
                style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!inputText.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={Platform.OS === 'android' ? 18 : 20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: '#BBE1FA',
  },
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16,
    paddingBottom: Platform.OS === 'android' ? 10 : 12,
    backgroundColor: '#BBE1FA',
  },
  headerSide: {
    width: Platform.OS === 'android' ? 36 : 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: { 
    padding: 4, 
    marginRight: Platform.OS === 'android' ? 10 : 12 
  },
  headerCenter: { 
    flex: 1, 
    alignItems: 'center', 
    flexDirection: 'row', 
    justifyContent: 'center' 
  },
  headerTitle: { 
    color: '#1B262C',
    fontSize: Platform.OS === 'android' ? 16 : 18, 
    fontWeight: '600' 
  },
  headerLanguage: { 
    color: '#0F4C75',
    fontSize: Platform.OS === 'android' ? 11 : 12, 
    marginLeft: 4 
  },
  flex: { flex: 1 },
  messagesContainer: { flex: 1 },
  messagesContent: { 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingVertical: Platform.OS === 'android' ? 6 : 8, 
    paddingBottom: Platform.OS === 'android' ? 14 : 16 
  },
  messageContainer: { 
    marginVertical: Platform.OS === 'android' ? 5 : 6 
  },
  userMessage: { alignItems: 'flex-end' },
  aiMessage: { alignItems: 'flex-start' },
  messageBubble: { 
    maxWidth: '85%', 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingVertical: Platform.OS === 'android' ? 10 : 12, 
    borderRadius: Platform.OS === 'android' ? 18 : 20, 
    flexDirection: 'row', 
    alignItems: 'flex-start' 
  },
  userBubble: { 
    backgroundColor: '#0F4C75'
  },
  aiBubble: { 
    backgroundColor: '#FFFFFF',
    borderWidth: 1, 
    borderColor: '#BBE1FA'
  },
  aiIconContainer: { 
    marginRight: Platform.OS === 'android' ? 6 : 8, 
    marginTop: 2 
  },
  messageText: { 
    fontSize: Platform.OS === 'android' ? 14 : 16, 
    lineHeight: Platform.OS === 'android' ? 20 : 22, 
    flex: 1 
  },
  userText: { 
    color: '#FFFFFF'
  },
  aiText: { 
    color: '#1B262C'
  },
  messageFooter: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 4, 
    marginHorizontal: Platform.OS === 'android' ? 14 : 16 
  },
  timestamp: { 
    fontSize: Platform.OS === 'android' ? 10 : 11, 
    color: '#3282B8' 
  },
  languageTag: { 
    fontSize: Platform.OS === 'android' ? 9 : 10, 
    color: '#0F4C75',
    marginLeft: Platform.OS === 'android' ? 6 : 8, 
    opacity: 0.7 
  },
  loadingContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: Platform.OS === 'android' ? 14 : 16, 
    marginVertical: Platform.OS === 'android' ? 6 : 8 
  },
  loadingText: { 
    color: '#3282B8',
    marginLeft: Platform.OS === 'android' ? 6 : 8, 
    fontSize: Platform.OS === 'android' ? 12 : 14 
  },
  inputContainer: { 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingTop: Platform.OS === 'android' ? 10 : 12, 
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1, 
    borderTopColor: '#BBE1FA'
  },
  textInputContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-end' 
  },
  textInput: { 
    flex: 1, 
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'android' ? 18 : 20, 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingVertical: Platform.OS === 'android' ? 10 : 12, 
    marginRight: Platform.OS === 'android' ? 10 : 12, 
    color: '#1B262C',
    fontSize: Platform.OS === 'android' ? 14 : 16, 
    maxHeight: Platform.OS === 'android' ? 90 : 100, 
    minHeight: Platform.OS === 'android' ? 40 : 44,
    borderWidth: 1,
    borderColor: '#BBE1FA',
    includeFontPadding: false,
    textAlignVertical: 'top'
  },
  sendButton: { 
    width: Platform.OS === 'android' ? 40 : 44, 
    height: Platform.OS === 'android' ? 40 : 44, 
    borderRadius: Platform.OS === 'android' ? 20 : 22, 
    backgroundColor: '#3282B8',
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  sendButtonDisabled: { 
    backgroundColor: '#BBE1FA',
    opacity: 0.6 
  },
});
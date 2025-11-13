// app/auth.tsx - Fixed for Android navigation bar spacing
import { Ionicons } from '@expo/vector-icons';
import { useFonts, LibreBaskerville_400Regular, LibreBaskerville_700Bold } from '@expo-google-fonts/libre-baskerville';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

interface InviteInfo {
  email: string;
  role: 'owner' | 'manager' | 'technician' | 'admin';
  message?: string;
}

const ROLE_DEFINITIONS = {
  owner: 'Farm Owner',
  manager: 'Farm Manager',
  technician: 'Aquaculture Technician',
  admin: 'System Administrator'
};

export default function AuthScreen() {
  const [fontsLoaded] = useFonts({
    LibreBaskerville_400Regular,
    LibreBaskerville_700Bold,
  });

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);

  // Get safe area insets for proper spacing
  const insets = useSafeAreaInsets();

  // Keyboard animation values
  const logoTranslateY = useMemo(() => new Animated.Value(0), []);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const { signIn, signUp, loading, checkInviteToken } = useAuth();
  const params = useLocalSearchParams();
  const inviteToken = useMemo(() => params.token as string, [params.token]);
  const isFormValid = useMemo(() => email.trim() && password.trim(), [email, password]);

  // Simple and reliable keyboard animation
  useEffect(() => {
    const showListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      Animated.timing(logoTranslateY, {
        toValue: 180,
        duration: 0, // Instant to avoid conflicts
        useNativeDriver: true,
      }).start();
    });

    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 300, // Smooth return animation
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showListener?.remove();
      hideListener?.remove();
    };
  }, [logoTranslateY]);

  useEffect(() => {
    if (!inviteToken) return;
    const handleInviteToken = async () => {
      try {
        const invite = await checkInviteToken(inviteToken);
        if (invite) {
          setInviteInfo(invite);
          setEmail(invite.email);
          setIsLogin(false);
        } else {
          Alert.alert('Invalid Invitation', 'This invitation link is invalid or has expired.');
        }
      } catch (error) {
        console.error('Error checking invite token:', error);
      }
    };
    handleInviteToken();
  }, [inviteToken, checkInviteToken]);

  const handleAuth = useCallback(async () => {
    if (!isFormValid) return Alert.alert('Error', 'Please fill in all fields');
    try {
      if (isLogin) {
        await signIn(email.trim(), password, inviteToken);
      } else {
        await signUp(email.trim(), password, inviteToken);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    }
  }, [isFormValid, isLogin, signIn, signUp, email, password, inviteToken]);

  const toggleAuthMode = useCallback(() => {
    if (!loading) {
      setIsLogin(prev => !prev);
      setEmail(inviteInfo?.email || '');
      setPassword('');
    }
  }, [loading, inviteInfo?.email]);

  const InviteBanner = useMemo(() => {
    if (!inviteInfo) return null;
    return (
      <View style={styles.inviteBanner}>
        <View style={styles.inviteIconContainer}>
          <Ionicons name="mail-open" size={24} color="#0F4C75" />
        </View>
        <Text style={styles.inviteTitle}>You're Invited!</Text>
        <Text style={styles.inviteMessage}>Join as a {ROLE_DEFINITIONS[inviteInfo.role]}</Text>
        {inviteInfo.message && (
          <Text style={styles.invitePersonalMessage}>"{inviteInfo.message}"</Text>
        )}
      </View>
    );
  }, [inviteInfo]);

  const formTitle = useMemo(() => {
    if (inviteInfo) return isLogin ? 'Sign in to join' : 'Create your account';
    return isLogin ? 'Welcome Back' : 'Welcome';
  }, [inviteInfo, isLogin]);

  const buttonText = useMemo(() => {
    if (inviteInfo) return isLogin ? 'Sign In & Join Team' : 'Create Account & Join';
    return isLogin ? 'Sign In' : 'Sign Up';
  }, [inviteInfo, isLogin]);

  if (!fontsLoaded) return (
    <SafeAreaView style={[styles.container, styles.loadingContainer]}>
      <ActivityIndicator size="large" color="#0F4C75" />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.topSection}>
          <Animated.View style={[
            styles.logoContainer,
            {
              transform: [{ translateY: logoTranslateY }],
              opacity: keyboardVisible ? 0 : 1 // Fade out when keyboard is visible
            }
          ]}>
            <Image source={require('../assets/images/ShrimplyLogo.png')} style={styles.logo} resizeMode="contain" />
          </Animated.View>
        </View>

        {InviteBanner}

        <View style={[
          styles.bottomSection,
          { paddingBottom: Math.max(insets.bottom, 20) + 20 }
        ]}>
          <View style={styles.authCard}>
            <Text style={styles.formTitle}>{formTitle}</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#3282B8" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, inviteInfo && styles.inputReadonly]}
                placeholder="Email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading && !inviteInfo}
                autoComplete="email"
                textContentType="emailAddress"
              />
              {inviteInfo && <Ionicons name="lock-closed" size={16} color="#BBE1FA" />}
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#3282B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
                autoComplete={isLogin ? "current-password" : "new-password"}
                textContentType={isLogin ? "password" : "newPassword"}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon} disabled={loading}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#3282B8" />
              </TouchableOpacity>
            </View>

            {isLogin && !inviteInfo && (
              <TouchableOpacity style={styles.forgotPasswordButton}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.authButton, (!isFormValid || loading) && styles.authButtonDisabled]}
              onPress={handleAuth}
              disabled={!isFormValid || loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.authButtonText}>{buttonText}</Text>}
            </TouchableOpacity>

            {!inviteInfo && (
              <TouchableOpacity style={styles.switchButton} onPress={toggleAuthMode} disabled={loading}>
                <Text style={[styles.switchText, loading && styles.switchTextDisabled]}>
                  {isLogin ? "I'm a new user. " : "Already have an account? "}
                  <Text style={[styles.switchLinkText, loading && styles.switchTextDisabled]}>
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </Text>
                </Text>
              </TouchableOpacity>
            )}

            {inviteInfo && !isLogin && (
              <TouchableOpacity style={styles.switchButton} onPress={() => setIsLogin(true)} disabled={loading}>
                <Text style={[styles.switchText, loading && styles.switchTextDisabled]}>
                  Already have an account?
                  <Text style={[styles.switchLinkText, loading && styles.switchTextDisabled]}> Sign In </Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#BBE1FA'
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  keyboardContainer: {
    flex: 1
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0,
    overflow: 'hidden'
  },
  logoContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center'
  },
  logo: {
    width: '250%',
    height: '250%'
  },
  bottomSection: {
    paddingHorizontal: 20,
    // paddingBottom removed - now applied dynamically via inline style
    zIndex: 10
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: Platform.OS === 'android' ? 20 : 24,
    shadowColor: '#0F4C75',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  formTitle: {
    fontSize: Platform.OS === 'android' ? 28 : 32,
    color: '#1B262C',
    textAlign: 'center',
    marginBottom: Platform.OS === 'android' ? 20 : 24,
    fontFamily: 'LibreBaskerville_700Bold',
    letterSpacing: -1.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: Platform.OS === 'android' ? 52 : 56,
  },
  inputIcon: {
    marginRight: 12
  },
  input: {
    flex: 1,
    color: '#1B262C',
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  inputReadonly: {
    backgroundColor: '#F1F5F9',
    color: '#64748B'
  },
  eyeIcon: {
    padding: 4
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: Platform.OS === 'android' ? 20 : 24
  },
  forgotPasswordText: {
    color: '#3282B8',
    fontSize: Platform.OS === 'android' ? 13 : 14,
    fontWeight: '600'
  },
  authButton: {
    backgroundColor: '#0F4C75',
    paddingVertical: Platform.OS === 'android' ? 16 : 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 20 : 24,
    shadowColor: '#0F4C75',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  authButtonDisabled: {
    opacity: 0.6
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 17 : 18,
    fontWeight: '700'
  },
  switchButton: {
    alignItems: 'center'
  },
  switchText: {
    color: '#64748B',
    fontSize: Platform.OS === 'android' ? 14 : 15,
    fontWeight: '500'
  },
  switchTextDisabled: {
    opacity: 0.6
  },
  switchLinkText: {
    color: '#3282B8',
    fontWeight: '700'
  },
  inviteBanner: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Platform.OS === 'android' ? 16 : 20,
    alignItems: 'center',
    shadowColor: '#0F4C75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  inviteIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  inviteTitle: {
    fontSize: Platform.OS === 'android' ? 18 : 20,
    color: '#0F4C75',
    marginBottom: 8,
    fontFamily: 'LibreBaskerville_700Bold',
  },
  inviteMessage: {
    fontSize: Platform.OS === 'android' ? 14 : 15,
    color: '#3282B8',
    textAlign: 'center',
    fontWeight: '500'
  },
  invitePersonalMessage: {
    fontSize: Platform.OS === 'android' ? 12 : 13,
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
});
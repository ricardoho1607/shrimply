// app/auth.tsx - Fixed for Android navigation bar spacing
import { LibreBaskerville_400Regular, LibreBaskerville_700Bold, useFonts } from '@expo-google-fonts/libre-baskerville';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Google from 'expo-auth-session/providers/google';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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
import { auth } from '../config/firebase';

WebBrowser.maybeCompleteAuthSession();

const GoogleSignInButton = ({ loading, signInWithGoogle, inviteToken }: {
  loading: boolean;
  signInWithGoogle: (inviteToken?: string, idToken?: string) => Promise<void>;
  inviteToken?: string;
}) => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '496805431411-krbvmpg014dgq2n6mk5a771ip49ra1tu.apps.googleusercontent.com',
    webClientId: '496805431411-d55t74gq1dpll8g8b3dcjv5epdeicphf.apps.googleusercontent.com',
    iosClientId: 'placeholder-ios-client-id.apps.googleusercontent.com',
  });

  const handlePress = async () => {
    try {
      if (Platform.OS === 'web') {
        await signInWithGoogle(inviteToken);
      } else {
        const result = await promptAsync();
        if (result?.type === 'success') {
          const { id_token } = result.params;
          await signInWithGoogle(inviteToken, id_token);
        }
      }
    } catch (error: any) {
      console.error('Google sign-in failed:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        Alert.alert('Google Sign-In Error', 'We could not sign you in with Google. Please try again.');
      }
    }
  };

  return (
    <TouchableOpacity
      style={[styles.googleButton, loading && styles.googleButtonDisabled]}
      onPress={handlePress}
      disabled={loading}
    >
      <Ionicons name="logo-google" size={20} color="#EA4335" style={styles.googleIcon} />
      <Text style={styles.googleButtonText}>Continue with Google</Text>
    </TouchableOpacity>
  );
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
  const [keepMeSignedIn, setKeepMeSignedIn] = useState(true);
  // Get safe area insets for proper spacing
  const insets = useSafeAreaInsets();

  // Keyboard animation values
  const logoTranslateY = useMemo(() => new Animated.Value(0), []);
  const logoOpacity = useMemo(() => new Animated.Value(1), []);

  const { signIn, signUp, signInWithGoogle, loading } = useAuth();
  const params = useLocalSearchParams();
  const inviteToken = useMemo(() => params.token as string, [params.token]);
  const isFormValid = useMemo(() => email.trim() && password.trim(), [email, password]);

  // Simple and reliable keyboard animation
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, () => {
      Animated.parallel([
        Animated.timing(logoTranslateY, {
          toValue: 120,
          duration: 350,
          easing: Easing.bezier(0.33, 1, 0.68, 1), // Smooth cubic easing
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      ]).start();
    });

    const hideListener = Keyboard.addListener(hideEvent, () => {
      Animated.parallel([
        Animated.timing(logoTranslateY, {
          toValue: 0,
          duration: 350,
          easing: Easing.bezier(0.33, 1, 0.68, 1),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      ]).start();
    });

    return () => {
      showListener?.remove();
      hideListener?.remove();
    };
  }, [logoTranslateY, logoOpacity]);

  const [previousInviteToken, setPreviousInviteToken] = useState<string | undefined>(undefined);
  if (previousInviteToken !== inviteToken) {
    setPreviousInviteToken(inviteToken);
    if (inviteToken) setIsLogin(false);
  }


  const handleAuth = useCallback(async () => {
    if (!isFormValid) return Alert.alert('Error', 'Please fill in all fields');
    try {
      if (isLogin) {
        await signIn(email.trim(), password, inviteToken, keepMeSignedIn);
      } else {
        await signUp(email.trim(), password, inviteToken, keepMeSignedIn);
      }
    } catch (error: any) {
      console.error('Authentication failed:', error);
      const fallbackMessage = isLogin
        ? 'We could not sign you in. Please check your details and try again.'
        : 'We could not create your account. Please check your details and try again.';
      Alert.alert('Error', inviteToken && error instanceof Error ? error.message : fallbackMessage);
    }
  }, [isFormValid, isLogin, signIn, signUp, email, password, inviteToken, keepMeSignedIn]);

  const handleForgotPassword = useCallback(async () => {
    const targetEmail = email.trim();
    if (!targetEmail) {
      Alert.alert('Reset Password', 'Enter your email address first, then tap Forgot? again.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, targetEmail);
      Alert.alert('Reset Password', `A password reset email has been sent to ${targetEmail}.`);
    } catch (error: any) {
      console.error('Password reset failed:', error);
      Alert.alert('Reset Password', 'Unable to send a password reset email. Please check the address and try again.');
    }
  }, [email]);

  const toggleAuthMode = useCallback(() => {
    if (!loading) {
      setIsLogin(prev => !prev);
      setEmail('');
      setPassword('');
    }
  }, [loading]);

  const InviteBanner = useMemo(() => {
    if (!inviteToken) return null;
    return (
      <View style={styles.inviteBanner}>
        <View style={styles.inviteIconContainer}>
          <Ionicons name="mail-open" size={24} color="#0d2137" />
        </View>
        <Text style={styles.inviteTitle}>{'You’re Invited!'}</Text>
        <Text style={styles.inviteMessage}>Use the invited email address to join the team.</Text>
      </View>
    );
  }, [inviteToken]);

  const formTitle = useMemo(() => {
    if (inviteToken) return isLogin ? 'Sign in to join' : 'Create your account';
    return isLogin ? 'Welcome Back' : 'Welcome';
  }, [inviteToken, isLogin]);

  const buttonText = useMemo(() => {
    if (inviteToken) return isLogin ? 'Sign In & Join Team' : 'Create Account & Join';
    return isLogin ? 'Sign In' : 'Sign Up';
  }, [inviteToken, isLogin]);

  if (!fontsLoaded) return (
    <SafeAreaView style={[styles.container, styles.loadingContainer]}>
      <ActivityIndicator size="large" color="#0d2137" />
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
              opacity: logoOpacity
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
              <Ionicons name="mail-outline" size={20} color="#315f57" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#6b8aa0"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                autoComplete="email"
                textContentType="emailAddress"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#315f57" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#6b8aa0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
                autoComplete={isLogin ? "current-password" : "new-password"}
                textContentType={isLogin ? "password" : "newPassword"}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon} disabled={loading}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#315f57" />
              </TouchableOpacity>
            </View>

            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setKeepMeSignedIn(!keepMeSignedIn)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={keepMeSignedIn ? "checkbox" : "square-outline"}
                  size={22}
                  color={keepMeSignedIn ? "#0d2137" : "#64748B"}
                />
                <Text style={[styles.checkboxText, keepMeSignedIn && styles.checkboxTextActive]}>
                  Keep me signed in
                </Text>
              </TouchableOpacity>

              {isLogin && (
                <TouchableOpacity style={styles.forgotPasswordButton} onPress={handleForgotPassword} disabled={loading}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.authButton, (!isFormValid || loading) && styles.authButtonDisabled]}
              onPress={handleAuth}
              disabled={!isFormValid || loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.authButtonText}>{buttonText}</Text>}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleSignInButton
              loading={loading}
              signInWithGoogle={signInWithGoogle}
              inviteToken={inviteToken}
            />

            <TouchableOpacity style={styles.switchButton} onPress={toggleAuthMode} disabled={loading}>
              <Text style={[styles.switchText, loading && styles.switchTextDisabled]}>
                {isLogin ? "I'm a new user. " : "Already have an account? "}
                <Text style={[styles.switchLinkText, loading && styles.switchTextDisabled]}>
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dce8f2'
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
    shadowColor: '#315f57',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  formTitle: {
    fontSize: Platform.OS === 'android' ? 28 : 32,
    color: '#0d2137',
    textAlign: 'center',
    marginBottom: Platform.OS === 'android' ? 20 : 24,
    fontFamily: 'LibreBaskerville_700Bold',
    letterSpacing: -1.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f8fc',
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
    color: '#0d2137',
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
    color: '#315f57',
    fontSize: Platform.OS === 'android' ? 14 : 15,
    fontWeight: '700',
    textDecorationLine: 'underline'
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 20 : 24,
    paddingHorizontal: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxText: {
    marginLeft: 8,
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#64748B',
    fontWeight: '500',
  },
  checkboxTextActive: {
    color: '#0d2137',
    fontWeight: '600',
  },
  authButton: {
    backgroundColor: '#0d2137',
    paddingVertical: Platform.OS === 'android' ? 16 : 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 20 : 24,
    shadowColor: '#315f57',
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 20 : 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: Platform.OS === 'android' ? 14 : 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'android' ? 20 : 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#dce8f2',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  googleButtonDisabled: {
    opacity: 0.6
  },
  googleIcon: {
    marginRight: 12
  },
  googleButtonText: {
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: '600'
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
    color: '#315f57',
    fontWeight: '700'
  },
  inviteBanner: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Platform.OS === 'android' ? 16 : 20,
    alignItems: 'center',
    shadowColor: '#315f57',
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
    color: '#0d2137',
    marginBottom: 8,
    fontFamily: 'LibreBaskerville_700Bold',
  },
  inviteMessage: {
    fontSize: Platform.OS === 'android' ? 14 : 15,
    color: '#315f57',
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

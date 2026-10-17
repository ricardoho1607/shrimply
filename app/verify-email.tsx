import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getVerificationUiCopy } from '../shared/verificationUiCopy';

export default function VerifyEmailScreen() {
  const { user, resendVerificationEmail, refreshEmailVerification, signOut } = useAuth();
  const { currentLanguage } = useLanguage();
  const copy = getVerificationUiCopy(currentLanguage);
  const [busy, setBusy] = useState<'send' | 'check' | 'signout' | null>(null);
  const [message, setMessage] = useState('');

  const resend = async () => {
    setBusy('send');
    setMessage('');
    try {
      await resendVerificationEmail();
      setMessage(copy.sent);
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code?: unknown }).code : undefined;
      setMessage(code === 'functions/resource-exhausted' ? copy.wait : copy.error);
    } finally {
      setBusy(null);
    }
  };

  const check = async () => {
    setBusy('check');
    setMessage('');
    try {
      if (!(await refreshEmailVerification())) setMessage(copy.notYet);
    } catch {
      setMessage(copy.checkError);
    } finally {
      setBusy(null);
    }
  };

  const logOut = async () => {
    setBusy('signout');
    try {
      await signOut();
    } catch {
      setMessage(copy.checkError);
      setBusy(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.card}>
        <Text style={styles.brand}>Shrimply</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.instructions}</Text>
        {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
        {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
        <Pressable accessibilityRole="button" disabled={busy !== null} onPress={check} style={[styles.button, busy !== null && styles.disabled]}>
          {busy === 'check' ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{copy.check}</Text>}
        </Pressable>
        <Pressable accessibilityRole="button" disabled={busy !== null} onPress={resend} style={[styles.button, styles.secondaryButton, busy !== null && styles.disabled]}>
          {busy === 'send' ? <ActivityIndicator color="#0F4C75" /> : <Text style={styles.secondaryText}>{copy.resend}</Text>}
        </Pressable>
        <Text style={styles.help}>{copy.help}</Text>
        <Pressable accessibilityRole="button" disabled={busy !== null} onPress={logOut} style={styles.signOut}>
          <Text style={styles.signOutText}>{copy.signOut}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f5f8fb' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 28, maxWidth: 500, width: '100%', alignSelf: 'center' },
  brand: { fontSize: 22, fontWeight: '800', color: '#0F4C75', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#163047', marginBottom: 12 },
  body: { fontSize: 16, lineHeight: 24, color: '#304c63' },
  email: { fontSize: 16, fontWeight: '700', color: '#163047', marginTop: 12, marginBottom: 22 },
  message: { fontSize: 14, color: '#163047', backgroundColor: '#eaf4fa', padding: 12, borderRadius: 8, marginBottom: 12 },
  button: { backgroundColor: '#0F4C75', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#3282B8' },
  secondaryText: { color: '#0F4C75', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.65 },
  help: { color: '#304c63', marginTop: 24, fontSize: 14 },
  signOut: { marginTop: 18, alignSelf: 'flex-start' },
  signOutText: { color: '#0F4C75', fontSize: 15, textDecorationLine: 'underline' },
});

import { usePathname } from 'expo-router';
import { useEffect, useSyncExternalStore } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { cancelAppAlertActions, chooseAppAlert, dismissAppAlert, getAppAlert, getServerAppAlert, subscribeAppAlerts } from './appAlert';

export default function AppAlertHost() {
  const alert = useSyncExternalStore(subscribeAppAlerts, getAppAlert, getServerAppAlert);
  const pathname = usePathname();
  useEffect(() => () => cancelAppAlertActions(), [pathname]);
  useEffect(() => () => cancelAppAlertActions(true), []);
  if (!alert) return null;
  const content = <View style={styles.backdrop} accessibilityViewIsModal>
    <Pressable style={StyleSheet.absoluteFill} accessible={false} onPress={() => dismissAppAlert(alert.id)} />
    <View style={styles.card}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <Text accessibilityRole="header" style={styles.title}>{alert.title}</Text>
        {alert.message ? <Text style={styles.message}>{alert.message}</Text> : null}
        <View style={styles.actions}>
          {alert.buttons.map((button, index) => <Pressable key={index} accessibilityRole="button"
            onPress={() => chooseAppAlert(alert.id, index)}
            style={({ pressed }) => [styles.button, button.style === 'cancel' && styles.cancel,
              button.style === 'destructive' && styles.danger, pressed && styles.pressed]}>
            <Text style={[styles.buttonText, button.style === 'cancel' && styles.cancelText]}>{button.text || 'OK'}</Text>
          </Pressable>)}
        </View>
      </ScrollView>
    </View>
  </View>;
  // A window overlay can appear above an existing sheet on iOS, where a second Modal cannot.
  return Platform.OS === 'ios'
    ? <FullWindowOverlay unstable_accessibilityContainerViewIsModal>{content}</FullWindowOverlay>
    : <Modal visible transparent animationType="none" statusBarTranslucent
        onRequestClose={() => dismissAppAlert(alert.id)}>{content}</Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(13,33,55,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 440, maxHeight: '85%', borderRadius: 24, backgroundColor: '#FFFFFF', overflow: 'hidden', elevation: 12 },
  content: { padding: 28, alignItems: 'center', gap: 14 },
  title: { fontSize: 21, fontWeight: '700', color: '#0D2137', textAlign: 'center' },
  message: { fontSize: 15, lineHeight: 23, color: '#52687A', textAlign: 'center' },
  actions: { width: '100%', gap: 10, marginTop: 10 },
  button: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14, backgroundColor: '#0F4C75', alignItems: 'center', minHeight: 48 },
  cancel: { backgroundColor: '#EDF2F6' },
  danger: { backgroundColor: '#DC3545' },
  pressed: { opacity: 0.75 },
  buttonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  cancelText: { color: '#334B5C' },
});

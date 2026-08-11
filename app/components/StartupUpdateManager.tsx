import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const UPDATE_COPY = {
  eyebrow: 'UPDATE REQUIRED',
  title: 'A better Shrimply is ready',
  message:
    'We’re making Shrimply safer, faster, and better for you. Please update now to continue.',
  update: 'Update Shrimply',
};

let hasCheckedForStartupUpdates = false;

export function StartupUpdateManager() {
  const [isStoreUpdateVisible, setStoreUpdateVisible] = useState(false);
  const [isOpeningStore, setOpeningStore] = useState(false);

  useEffect(() => {
    if (__DEV__ || Platform.OS !== 'android' || hasCheckedForStartupUpdates) return;
    hasCheckedForStartupUpdates = true;

    const checkForStartupUpdates = async () => {
      try {
        const { checkForUpdate } = await import('expo-in-app-updates');
        const storeUpdate = await checkForUpdate();
        if (storeUpdate.updateAvailable) {
          setStoreUpdateVisible(true);
          return;
        }
      } catch (error) {
        console.log('Google Play update check failed:', error);
      }

      if (!Updates.isEnabled) return;
      try {
        const checkResult = await Updates.checkForUpdateAsync();
        if (!checkResult.isAvailable) return;

        const fetchResult = await Updates.fetchUpdateAsync();
        if (fetchResult.isNew) await Updates.reloadAsync();
      } catch (error) {
        console.log('Startup OTA update check failed:', error);
      }
    };

    void checkForStartupUpdates();
  }, []);

  const openGooglePlay = async () => {
    if (isOpeningStore) return;
    setOpeningStore(true);

    const packageName = Constants.expoConfig?.android?.package
      ?? 'com.shrimply.tech.investashrimp';
    const marketUrl = `market://details?id=${packageName}`;
    const browserUrl = `https://play.google.com/store/apps/details?id=${packageName}`;

    try {
      await Linking.openURL(marketUrl);
    } catch {
      try {
        await Linking.openURL(browserUrl);
      } catch (error) {
        console.error('Unable to open Google Play:', error);
        return;
      }
    } finally {
      setOpeningStore(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => undefined}
      statusBarTranslucent
      transparent
      visible={isStoreUpdateVisible}
    >
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons color="#0F4C75" name="cloud-download-outline" size={30} />
          </View>
          <Text style={styles.eyebrow}>{UPDATE_COPY.eyebrow}</Text>
          <Text style={styles.title}>{UPDATE_COPY.title}</Text>
          <Text style={styles.message}>{UPDATE_COPY.message}</Text>

          <Pressable
            accessibilityRole="button"
            disabled={isOpeningStore}
            onPress={() => void openGooglePlay()}
            style={({ pressed }) => [
              styles.updateButton,
              pressed && styles.updateButtonPressed,
              isOpeningStore && styles.buttonDisabled,
            ]}
          >
            {isOpeningStore ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.updateButtonText}>{UPDATE_COPY.update}</Text>
                <Ionicons color="#FFFFFF" name="arrow-forward" size={18} />
              </>
            )}
          </Pressable>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(7, 25, 39, 0.68)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#FDFCF9',
    borderRadius: 24,
    maxWidth: 420,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#061B2A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    width: '100%',
    elevation: 12,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: '#E7F3FA',
    borderRadius: 22,
    height: 56,
    justifyContent: 'center',
    marginBottom: 18,
    width: 56,
  },
  eyebrow: {
    color: '#3282B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    color: '#102A3A',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  message: {
    color: '#526773',
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 24,
    marginTop: 12,
    textAlign: 'center',
  },
  updateButton: {
    alignItems: 'center',
    backgroundColor: '#0F4C75',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
    width: '100%',
  },
  updateButtonPressed: {
    backgroundColor: '#0A3B5C',
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

import React, { useRef, useEffect } from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useDataBackup } from '../hooks/useDataBackup';

export const SyncStatusIndicator = () => {
  const { syncStatus, triggerSync, hasPendingChanges } = useDataBackup();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Animation for syncing state
  useEffect(() => {
    if (syncStatus?.isSyncing) {
      // Rotation animation for syncing
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      // Stop rotation
      rotateAnim.setValue(0);
    }
  }, [syncStatus?.isSyncing, rotateAnim]);

  // Pulse animation for pending changes
  useEffect(() => {
    if (hasPendingChanges && !syncStatus?.isSyncing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Stop pulse and reset
      pulseAnim.setValue(1);
    }
  }, [hasPendingChanges, syncStatus?.isSyncing, pulseAnim]);

  const getStatusColor = () => {
    if (!syncStatus?.isOnline) return '#e74c3c'; // Red for offline
    if (syncStatus.isSyncing) return '#f39c12'; // Orange for syncing
    if (hasPendingChanges) return '#315f57'; // Pending sync
    return '#27ae60'; // Green for synced
  };

  const getCloudIcon = (): keyof typeof Ionicons.glyphMap => {
    if (!syncStatus?.isOnline) return 'cloud-offline-outline';
    if (syncStatus.isSyncing) return 'cloud-outline';
    if (hasPendingChanges) return 'cloud-upload-outline';
    return 'cloud-done-outline';
  };

  // Handle cases where syncStatus might be undefined
  if (!syncStatus) {
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={() => Alert.alert('Offline', 'Internet connection is unavailable. Changes will sync when you are back online.')}
        accessibilityRole="button"
        accessibilityLabel="Offline"
      >
        <Ionicons name="cloud-offline-outline" size={20} color="#e74c3c" />
        <Text style={styles.offlineText}>Offline</Text>
      </TouchableOpacity>
    );
  }

  // Rotation interpolation
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableOpacity 
      style={[styles.container, !syncStatus.isOnline && styles.offlineContainer]}
      onPress={() => {
        if (!syncStatus.isOnline) {
          Alert.alert('Offline', 'Internet connection is unavailable. Changes will sync when you are back online.');
          return;
        }
        triggerSync();
      }}
      disabled={syncStatus.isSyncing}
      accessibilityRole="button"
      accessibilityLabel={syncStatus.isOnline ? 'Sync status' : 'Offline'}
    >
      <Animated.View
        style={{
          transform: [
            { scale: pulseAnim },
            ...(syncStatus.isSyncing ? [{ rotate: spin }] : [])
          ]
        }}
      >
        <Ionicons 
          name={getCloudIcon()} 
          size={20} 
          color={getStatusColor()} 
        />
      </Animated.View>
      {!syncStatus.isOnline && <Text style={styles.offlineText}>Offline</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    marginHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 36,
  },
  offlineContainer: {
    backgroundColor: 'rgba(231, 76, 60, 0.08)',
    paddingHorizontal: 10,
  },
  offlineText: {
    color: '#e74c3c',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

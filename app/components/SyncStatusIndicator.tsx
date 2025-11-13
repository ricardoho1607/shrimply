// components/SyncStatusIndicator.tsx - Just animated cloud icon
import React, { useRef, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    if (hasPendingChanges) return '#3282B8'; // Blue for pending
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
      <TouchableOpacity style={styles.container}>
        <Ionicons name="cloud-offline-outline" size={20} color="#e74c3c" />
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
      style={styles.container}
      onPress={triggerSync}
      disabled={!syncStatus.isOnline || syncStatus.isSyncing}
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
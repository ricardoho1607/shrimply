import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface OnboardingProgressProps {
  percent: number;
  title: string;
  detail: string;
}

export default function OnboardingProgress({ percent, title, detail }: OnboardingProgressProps) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = 25;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: safePercent }}>
      <View style={styles.ring}>
        <Svg width={64} height={64} viewBox="0 0 64 64">
          <Circle cx={32} cy={32} r={radius} stroke="#E7F0F6" strokeWidth={7} fill="none" />
          <Circle
            cx={32}
            cy={32}
            r={radius}
            stroke="#3282B8"
            strokeWidth={7}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - safePercent / 100)}
            transform="rotate(-90 32 32)"
          />
        </Svg>
        <Text style={styles.percent}>{safePercent}%</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D8E5EE',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  copy: { flex: 1 },
  title: { color: '#16344B', fontSize: 13, fontWeight: '800' },
  detail: { color: '#698092', fontSize: 11, marginTop: 2 },
  ring: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  percent: { position: 'absolute', color: '#0F4C75', fontSize: 13, fontWeight: '900' },
});

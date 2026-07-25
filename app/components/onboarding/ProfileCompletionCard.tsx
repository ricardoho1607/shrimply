import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../../context/LanguageContext';
import { getCompanyProfileCompletion, type CompanyProfileLike } from '../../../shared/onboarding';

interface ProfileCompletionCardProps {
  company?: CompanyProfileLike | null;
  onPress: () => void;
}

export default function ProfileCompletionCard({ company, onPress }: ProfileCompletionCardProps) {
  const { t } = useLanguage();
  const percent = getCompanyProfileCompletion(company);
  if (!company || percent >= 100) return null;

  const radius = 27;
  const circumference = 2 * Math.PI * radius;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.82} accessibilityRole="button">
      <View style={styles.ring} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }}>
        <Svg width={70} height={70} viewBox="0 0 70 70">
          <Circle cx={35} cy={35} r={radius} stroke="#DCE9F1" strokeWidth={7} fill="none" />
          <Circle
            cx={35}
            cy={35}
            r={radius}
            stroke="#3282B8"
            strokeWidth={7}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - percent / 100)}
            transform="rotate(-90 35 35)"
          />
        </Svg>
        <Text style={styles.percent}>{percent}%</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{t.onboardingProgress.profileIncomplete}</Text>
        <Text style={styles.detail} numberOfLines={2}>{t.onboardingProgress.profileIncompleteDetail}</Text>
        <Text style={styles.action}>{t.onboardingProgress.completeProfile}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#3282B8" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: 1,
    borderColor: '#CFE1EC',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  ring: { width: 70, height: 70, alignItems: 'center', justifyContent: 'center' },
  percent: { position: 'absolute', color: '#0F4C75', fontSize: 14, fontWeight: '900' },
  copy: { flex: 1 },
  title: { color: '#16344B', fontSize: 14, fontWeight: '800' },
  detail: { color: '#6A8091', fontSize: 11, lineHeight: 15, marginTop: 3 },
  action: { color: '#0F4C75', fontSize: 11, fontWeight: '800', marginTop: 7 },
});

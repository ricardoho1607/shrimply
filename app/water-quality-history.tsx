import React, { useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, StatusBar, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { usePondStore, Sampling } from "./store/pondStore";
import { useLanguage } from '.././context/LanguageContext';

type IconName = "sunny-outline" | "moon-outline" | "eye-outline" | "water-outline";

const ParameterItem = React.memo(({ iconName, label, value, color }: any) => (
  <View style={styles.parameterItem}>
    <Ionicons name={iconName} size={16} color="#BBE1FA" />
    <Text style={styles.parameterLabel}>{label}</Text>
    <Text style={[styles.parameterValue, { color }]}>{value || "N/A"}</Text>
  </View>
));

export default function WaterQualityHistoryScreen() {
  const navigation = useNavigation();
  const { pondId, pondName } = useLocalSearchParams();
  const { getPondById } = usePondStore();
  const { t } = useLanguage();

  useEffect(() => {
    navigation.setOptions({
      title: `${pondName} ${t.waterQuality.historyTitle}`,
      headerStyle: { backgroundColor: '#BBE1FA' },
      headerTintColor: '#1B262C',
      headerTitleStyle: { fontWeight: 'bold', fontSize: Platform.OS === 'android' ? 17 : 18 },
      headerBackTitle: " WQ ",
    });
  }, [navigation, pondName, t]);

  const pond = getPondById(pondId as string);
  
  if (!pond) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{t.waterQuality.pondNotFound}</Text>
      </View>
    );
  }

  const waterQualityHistory = pond.samplings
    .filter((s: Sampling) => s.mbw === 0 && s.feed === 0 && s.mortality === 0)
    .filter((s: Sampling) => s.phMorning || s.phEvening || s.doMorning || s.doEvening || s.transparency || s.salinity)
    .sort((a: Sampling, b: Sampling) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .filter((current: Sampling, index: number, array: Sampling[]) => 
      index === 0 || current.date !== array[index - 1].date);

  const getColor = (type: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "#0F4C75";
    
    switch (type) {
      case "do":
        if (num < 3.5) return "#e74c3c";
        if (num <= 4.5) return "#f39c12";
        return "#27ae60";
      case "ph":
        if (num < 7.5) return "#e74c3c";
        if (num <= 8.5) return "#27ae60";
        return "#e74c3c";
      case "transparency":
        if (num < 30) return "#e74c3c";
        if (num <= 40) return "#27ae60";
        return "#e74c3c";
      default:
        return "#1B262C";
    }
  };

  const getDaysAgo = (date: string) => {
    const today = new Date();
    const recordDate = new Date(date);
    const diffTime = today.getTime() - recordDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t.waterQuality.today;
    if (diffDays === 1) return t.waterQuality.yesterday;
    return `${diffDays} ${t.waterQuality.daysAgo}`;
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0F4C75" />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {waterQualityHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={80} color="#3282B8" />
              <Text style={styles.emptyTitle}>{t.waterQuality.noHistoryYet}</Text>
              <Text style={styles.emptySubtitle}>{t.waterQuality.recordsWillAppear}</Text>
            </View>
          ) : (
            waterQualityHistory.map((record: Sampling) => (
              <View key={record.id} style={styles.recordCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.dateInfo}>
                    <Text style={styles.recordDate}>
                      {new Date(record.date).toLocaleDateString()}
                    </Text>
                    <Text style={styles.daysAgo}>{getDaysAgo(record.date)}</Text>
                  </View>
                </View>

                <View style={styles.parametersContainer}>
                  <View style={styles.parameterRow}>
                    <ParameterItem iconName="sunny-outline" label={t.waterQuality.phMorning} 
                      value={record.phMorning ?? ""} color={getColor("ph", record.phMorning ?? "")} />
                    <ParameterItem iconName="moon-outline" label={t.waterQuality.phEvening} 
                      value={record.phEvening ?? ""} color={getColor("ph", record.phEvening ?? "")} />
                  </View>
                  <View style={styles.parameterRow}>
                    <ParameterItem iconName="sunny-outline" label={t.waterQuality.doMorning} 
                      value={record.doMorning ?? ""} color={getColor("do", record.doMorning ?? "")} />
                    <ParameterItem iconName="moon-outline" label={t.waterQuality.doEvening} 
                      value={record.doEvening ?? ""} color={getColor("do", record.doEvening ?? "")} />
                  </View>
                  <View style={styles.parameterRow}>
                    <ParameterItem iconName="eye-outline" label={t.waterQuality.transparency} 
                      value={`${record.transparency || "N/A"} cm`} 
                      color={getColor("transparency", record.transparency ?? "")} />
                    <ParameterItem iconName="water-outline" label={t.waterQuality.salinity} 
                      value={`${record.salinity || "N/A"} ppt`} color="#1B262C" />
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { padding: Platform.OS === 'android' ? 16 : 20, paddingBottom: 40 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Platform.OS === 'android' ? 60 : 80 },
  emptyTitle: { color: '#1B262C', fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', marginTop: Platform.OS === 'android' ? 16 : 20 },
  emptySubtitle: { color: '#0F4C75', fontSize: Platform.OS === 'android' ? 15 : 16, marginTop: 8, textAlign: 'center', lineHeight: Platform.OS === 'android' ? 20 : 22 },
  errorText: { color: '#e74c3c', fontSize: Platform.OS === 'android' ? 17 : 18, textAlign: 'center', marginTop: 100 },
  recordCard: { backgroundColor: '#FFFFFF', padding: Platform.OS === 'android' ? 16 : 20, borderRadius: 16, marginBottom: Platform.OS === 'android' ? 12 : 16, borderWidth: 1, borderColor: '#BBE1FA', shadowColor: '#0F4C75', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Platform.OS === 'android' ? 12 : 16 },
  dateInfo: { flex: 1 },
  recordDate: { fontSize: Platform.OS === 'android' ? 17 : 18, fontWeight: 'bold', color: '#1B262C' },
  daysAgo: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#0F4C75', marginTop: 2 },
  parametersContainer: { gap: Platform.OS === 'android' ? 10 : 12 },
  parameterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  parameterItem: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 4, minWidth: 0 },
  parameterLabel: { color: '#0F4C75', fontSize: Platform.OS === 'android' ? 11 : 12, marginLeft: 6, width: 80, flexShrink: 0 },
  parameterValue: { fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: '600', textAlign: 'right', flex: 1 },
});
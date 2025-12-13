import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from 'expo-router';
import React from "react";
import { ScrollView, StatusBar, StyleSheet, Text, View, Platform } from "react-native";
import { usePondStore } from "./store/pondStore";
import { useLanguage } from "../context/LanguageContext";
import { useCurrency } from "../context/CurrencyContext";

export default function HarvestDetailsScreen() {
  const { harvestId } = useLocalSearchParams();
  const { harvestRecords } = usePondStore();
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();

  const getHarvestRecord = () => {
    const targetId = Array.isArray(harvestId) ? harvestId[0] : harvestId;
    return harvestRecords.find(record => record.id === targetId);
  };

  const harvestRecord = getHarvestRecord();

  const calculateTotals = () => {
    if (!harvestRecord) return { totalBiomass: "0", averageSize: "0", totalSalePrice: "0" };

    let totalBiomass = 0, totalSalePrice = 0, weightedSizeSum = 0, totalWeight = 0;

    harvestRecord.ponds.forEach(pond => {
      const biomass = parseFloat(pond.biomass) || 0;
      const size = parseFloat(pond.size) || 0;
      const pricePerKg = parseFloat(pond.price) || 0;
      const subBiomass = parseFloat(pond.subBiomass) || 0;
      const subSize = parseFloat(pond.subSize) || 0;
      const subPricePerKg = parseFloat(pond.subPrice) || 0;

      totalBiomass += biomass + subBiomass;
      totalSalePrice += (biomass * pricePerKg) + (subBiomass * subPricePerKg);

      if (biomass > 0 && size > 0) {
        weightedSizeSum += biomass * size;
        totalWeight += biomass;
      }
      if (subBiomass > 0 && subSize > 0) {
        weightedSizeSum += subBiomass * subSize;
        totalWeight += subBiomass;
      }
    });

    const averageSize = totalWeight > 0 ? weightedSizeSum / totalWeight : 0;

    return {
      totalBiomass: totalBiomass.toFixed(1),
      averageSize: averageSize.toFixed(1),
      totalSalePrice: totalSalePrice.toFixed(0),
    };
  };

  const totals = calculateTotals();
  const formatNumber = (num: string) => parseFloat(num).toLocaleString('id-ID');

  const renderDetailItem = (label: string, value: string, unit: string = "", 
    color: string = "#1B262C") => (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, { color }]}>{value} {unit}</Text>
    </View>
  );

  const renderPondSection = (pond: any, index: number) => {
    const biomass = parseFloat(pond.biomass) || 0;
    const size = parseFloat(pond.size) || 0;
    const pricePerKg = parseFloat(pond.price) || 0;
    const subBiomass = parseFloat(pond.subBiomass) || 0;
    const subSize = parseFloat(pond.subSize) || 0;
    const subPricePerKg = parseFloat(pond.subPrice) || 0;

    const mainPrice = biomass * pricePerKg;
    const subPrice = subBiomass * subPricePerKg;
    const totalPondPrice = mainPrice + subPrice;

    return (
      <View key={index} style={styles.pondCard}>
        <Text style={styles.pondTitle}>{pond.pondName}</Text>

        <View style={styles.detailsRow}>
          {renderDetailItem(t.harvest.size, size.toString())}
          {renderDetailItem(t.harvest.biomassKg.replace(' (kg)', ''), 
            formatNumber(biomass.toString()), "kg")}
        </View>

        <View style={styles.detailsRow}>
          {renderDetailItem(t.harvest.subSize, subSize.toString())}
          {renderDetailItem(t.harvest.subBiomassKg.replace(' (kg)', ''), 
            formatNumber(subBiomass.toString()), "kg")}
        </View>

        <View style={styles.pondTotal}>
          <Text style={styles.pondTotalLabel}>{t.harvestDetails.salePrice}</Text>
          <Text style={styles.pondTotalValue}>{formatCurrency(totalPondPrice)}</Text>
        </View>
      </View>
    );
  };

  if (!harvestRecord) {
    return (
      <>
        <Stack.Screen options={{
            title: t.harvestDetails.title,
            headerBackTitle: t.actions.back,
            headerStyle: { backgroundColor: '#BBE1FA' },
            headerTintColor: '#1B262C',
            headerTitleStyle: { fontWeight: 'bold', fontSize: Platform.OS === 'android' ? 17 : 18 },
            headerShadowVisible: false,
          }} />
        <StatusBar barStyle="dark-content" backgroundColor="#BBE1FA" />
        <View style={styles.container}>
          <View style={styles.emptyState}>
            <Ionicons name="cash-outline" size={80} color="#3282B8" />
            <Text style={styles.emptyTitle}>{t.harvestDetails.harvestNotFound}</Text>
            <Text style={styles.emptySubtitle}>{t.harvestDetails.recordNotFound}</Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{
          title: t.harvestDetails.title,
          headerBackTitle: t.actions.back,
          headerStyle: { backgroundColor: '#BBE1FA' },
          headerTintColor: '#1B262C',
          headerTitleStyle: { fontWeight: 'bold', fontSize: Platform.OS === 'android' ? 17 : 18 },
          headerShadowVisible: false,
        }} />
      <StatusBar barStyle="dark-content" backgroundColor="#BBE1FA" />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.dateHeader}>
            <Text style={styles.dateTitle}>
              {harvestRecord.date ? new Date(harvestRecord.date).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              }) : t.harvestDetails.title}
            </Text>
          </View>

          {harvestRecord.ponds.map((pond, index) => renderPondSection(pond, index))}

          <View style={styles.totalsCard}>
            <View style={styles.totalsHeader}>
              <Ionicons name="cash-outline" size={24} color="#3282B8" />
              <Text style={styles.totalsTitle}>{t.harvestDetails.overallTotals}</Text>
            </View>
            
            <View style={styles.totalsGrid}>
              <View style={styles.totalItem}>
                <Text style={styles.totalLabel}>{t.harvestDetails.totalBiomass}</Text>
                <Text style={styles.totalValue}>{formatNumber(totals.totalBiomass)} kg</Text>
              </View>
              <View style={styles.totalItem}>
                <Text style={styles.totalLabel}>{t.harvestDetails.averageSize}</Text>
                <Text style={styles.totalValue}>{formatNumber(totals.averageSize)}</Text>
              </View>
              <View style={styles.totalItemFull}>
                <Text style={styles.totalLabel}>{t.harvestDetails.totalSalePrice}</Text>
                <Text style={[styles.totalValue, styles.priceHighlight]}>
                  {formatCurrency(parseFloat(totals.totalSalePrice))}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { padding: Platform.OS === 'android' ? 16 : 20, paddingBottom: 40 },
  dateHeader: { backgroundColor: '#FFFFFF', padding: Platform.OS === 'android' ? 16 : 20, borderRadius: 16, marginBottom: Platform.OS === 'android' ? 16 : 20, borderWidth: 1, borderColor: '#BBE1FA', shadowColor: '#0F4C75', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  dateTitle: { fontSize: Platform.OS === 'android' ? 17 : 18, fontWeight: 'bold', color: '#3282B8', textAlign: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Platform.OS === 'android' ? 60 : 80 },
  emptyTitle: { color: '#1B262C', fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', marginTop: Platform.OS === 'android' ? 16 : 20 },
  emptySubtitle: { color: '#0F4C75', fontSize: Platform.OS === 'android' ? 15 : 16, marginTop: 8, lineHeight: Platform.OS === 'android' ? 20 : 22 },
  pondCard: { backgroundColor: '#FFFFFF', padding: Platform.OS === 'android' ? 14 : 16, borderRadius: 12, marginBottom: Platform.OS === 'android' ? 10 : 12, borderWidth: 1, borderColor: '#BBE1FA', shadowColor: '#0F4C75', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  pondTitle: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold', color: '#3282B8', marginBottom: Platform.OS === 'android' ? 10 : 12 },
  detailsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  detailItem: { flex: 1, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#BBE1FA' },
  detailLabel: { color: '#0F4C75', fontSize: Platform.OS === 'android' ? 10 : 11, fontWeight: '600', marginBottom: 2 },
  detailValue: { fontSize: Platform.OS === 'android' ? 12 : 13, fontWeight: 'bold', color: '#1B262C' },
  pondTotal: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#27ae60', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  pondTotalLabel: { color: '#0F4C75', fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600' },
  pondTotalValue: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold', color: '#27ae60' },
  totalsCard: { backgroundColor: '#FFFFFF', padding: Platform.OS === 'android' ? 16 : 20, borderRadius: 12, marginTop: Platform.OS === 'android' ? 14 : 16, borderWidth: 1, borderColor: '#3282B8', shadowColor: '#0F4C75', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  totalsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Platform.OS === 'android' ? 14 : 16, justifyContent: 'center' },
  totalsTitle: { fontSize: Platform.OS === 'android' ? 17 : 18, fontWeight: 'bold', color: '#3282B8', marginLeft: 8 },
  totalsGrid: { gap: 12 },
  totalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#BBE1FA' },
  totalItemFull: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: Platform.OS === 'android' ? 14 : 16, borderRadius: 8, borderWidth: 1, borderColor: '#27ae60' },
  totalLabel: { color: '#0F4C75', fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600' },
  totalValue: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold', color: '#1B262C' },
  priceHighlight: { color: '#27ae60', fontSize: Platform.OS === 'android' ? 15 : 16 },
});

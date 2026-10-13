import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Text,
  TouchableOpacity, View
} from 'react-native';
import { getPondPlSupplier, isPondCycleActive, type Pond } from "../../app/store/pondStore";
import { DetailItem } from './DetailItem';
import { styles } from './pondManagementStyles';
import type { PondManagementViewModel } from './usePondManagement';
type Props = Pick<PondManagementViewModel,
  'calculateMetrics'
  | 'getLastADG'
  | 'router'
  | 't'
  | 'getDOCColor'
  | 'canEditPonds'
  | 'openBaselineEditModal'
  | 'handleEndPondCycle'
  | 'handleDeletePond'> & { pond: Pond };
export function PondCard({ calculateMetrics, getLastADG, router, t, getDOCColor, canEditPonds, openBaselineEditModal, handleEndPondCycle, handleDeletePond, pond }: Props) {
  const metrics = calculateMetrics(pond);
  const lastADG = getLastADG(pond.id);
  return (
    <TouchableOpacity
      style={styles.pondCard}
      onPress={() => router.push({
        pathname: '/ponddetails',
        params: { pondId: pond.id }
      })}
    >
      <View style={styles.pondHeader}>
        <View style={styles.pondTitleGroup}>
          <Text style={styles.pondName}>{pond.pondName}</Text>
          {pond.cycleStartMode === 'midcycle' && (
            <Text style={styles.midcycleBadgeText}>{t.midcycleOnboarding.importedMidcycle}</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <View style={[
            styles.docBadge,
            { backgroundColor: getDOCColor(metrics.doc) }
          ]}>
            <Text style={styles.docText}>
              {t.shrimp.doc} {metrics.doc}
            </Text>
          </View>
          {canEditPonds && (
            <>
              {pond.cycleStartMode === 'midcycle' && isPondCycleActive(pond) && (
                <TouchableOpacity
                  style={styles.baselineEditButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    openBaselineEditModal(pond);
                  }}
                >
                  <Ionicons name="create-outline" size={18} color="#0F4C75" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.editButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleEndPondCycle(pond);
                }}
              >
                <Ionicons name={isPondCycleActive(pond) ? "archive-outline" : "time-outline"} size={18} color={isPondCycleActive(pond) ? "#315f57" : "#6b8aa0"} />
              </TouchableOpacity>
              {!isPondCycleActive(pond) && (
                <TouchableOpacity
                  style={styles.deletePondButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeletePond(pond);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.home.deletePond} ${pond.pondName}`}
                >
                  <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>

      <View style={styles.pondDetails}>
        <View style={styles.detailRow}>
          <DetailItem
            iconName="scale-outline"
            label={t.shrimp.biomass}
            value={`${metrics.totalBiomass.toFixed(1)} kg`}
          />
          <DetailItem
            label={t.shrimp.population}
            value={metrics.currentPopulation.toLocaleString()}
            isShrimp
          />
        </View>
        <View style={styles.detailRow}>
          <DetailItem
            iconName="pulse-outline"
            label={t.shrimp.survivalRate.replace(' (%)', '')}
            value={`${metrics.sr}%`}
          />
          <DetailItem
            iconName="resize-outline"
            label={t.shrimp.size}
            value={`${metrics.size} pcs/kg`}
          />
        </View>
        <View style={styles.detailRow}>
          <DetailItem
            iconName="trending-up-outline"
            label={t.shrimp.adg}
            value={`${lastADG.toFixed(2)} g/day`}
          />
          <DetailItem
            iconName="stats-chart-outline"
            label={t.shrimp.fcr}
            value={`${metrics.fcr}`}
          />
        </View>
        <View style={styles.detailRow}>
          {(pond.totalHarvestedBiomass || 0) > 0 && (
            <DetailItem
              iconName="archive-outline"
              label={t.shrimp.harvested}
              value={`${(pond.totalHarvestedBiomass || 0).toFixed(1)} kg`}
            />
          )}
          <DetailItem
            iconName="business-outline"
            label={t.forms.supplier}
            value={getPondPlSupplier(pond)}
          />
          {(pond.totalHarvestedBiomass || 0) === 0 && <DetailItem />}
        </View>
      </View>

      <View style={styles.startDateContainer}>
        <Ionicons name="calendar-outline" size={14} color="#dce8f2" />
        <Text style={styles.startDate}>
          {t.shrimp.started}: {new Date(pond.docStart).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

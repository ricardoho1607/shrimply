import Ionicons from '@expo/vector-icons/Ionicons';
import {
  FlatList,
  Keyboard,
  Modal,
  ScrollView, StatusBar,
  Text, TextInput, TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import EnterpriseDashboard from "../../app/components/enterprise/EnterpriseCycleDashboard";
import ProfileCompletionCard from "../../app/components/onboarding/ProfileCompletionCard";
import { isPondCycleActive } from "../../app/store/pondStore";
import { DetailItem } from './DetailItem';
import { PondCard } from './PondCard';
import { PondDashboardModeSwitch } from './PondDashboardModeSwitch';
import { PondDataEntryModal } from './PondDataEntryModal';
import { styles } from './pondManagementStyles';
import { usePondManagement } from './usePondManagement';
export default function PondManagementScreen() {
  const model = usePondManagement();
  const {
    isEnterpriseFarm,
    canManageEnterpriseBlocks,
    dashboardMode,
    ponds,
    physicalPonds,
    enterpriseBlocks,
    cycles,
    company,
    handleSaveEnterpriseProductionCycle,
    handleCreateEnterprisePhysicalPond,
    handleEditEnterpriseCycle,
    handleCloseEnterpriseBlockCycle,
    openModal,
    user,
    router,
    cycleManagerExpanded,
    setCycleManagerExpanded,
    t,
    currentCycleTitle,
    currentCyclePonds,
    activeCyclePonds,
    currentCycleStatus,
    openAccessibleFarmCycles,
    activeFarmCycle,
    setSelectedDashboardCycleId,
    canManageFarmCycle,
    cycleNameDraft,
    setCycleNameDraft,
    handleRenameFarmCycle,
    handleCloseFarmCycle,
    cycleFilter,
    setCycleFilter,
    visiblePonds,
    idlePhysicalPonds,
    setFormData,
    canEditPonds,
    handleDeletePhysicalPond,
    setMenuModalVisible,
    menuModalVisible,
  } = model;
  const dataEntryModal = <PondDataEntryModal {...model} />;
  const dashboardModeSwitch = <PondDashboardModeSwitch {...model} />;
  if (isEnterpriseFarm && canManageEnterpriseBlocks && dashboardMode === 'enterprise') {
    return (
      <>
        <EnterpriseDashboard
          ponds={ponds}
          physicalPonds={physicalPonds}
          blocks={enterpriseBlocks.blocks}
          technicians={enterpriseBlocks.technicians}
          cycles={cycles}
          timeZone={company?.timeZone}
          loading={enterpriseBlocks.loading}
          error={enterpriseBlocks.error}
          dashboardModeSwitch={dashboardModeSwitch}
          onSaveProductionCycle={handleSaveEnterpriseProductionCycle}
          onCreatePond={handleCreateEnterprisePhysicalPond}
          onEditCycle={handleEditEnterpriseCycle}
          onCloseCycle={handleCloseEnterpriseBlockCycle}
          onAddSampling={() => openModal('sampling')}
          onAddMortality={() => openModal('mortality')}
          createBlock={enterpriseBlocks.createBlock}
          updateBlock={enterpriseBlocks.updateBlock}
          deleteBlock={enterpriseBlocks.deleteBlock}
          assignBlockTechnician={enterpriseBlocks.assignBlockTechnician}
        />
        {dataEntryModal}
      </>
    );
  }
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f8fc" />
      <View style={styles.container}>
        {(user?.role === 'owner' || user?.role === 'co-owner') ? (
          <ProfileCompletionCard
            company={company}
            onPress={() => router.push('/company-setup2?edit=true' as any)}
          />
        ) : null}
        <View style={[
          styles.cycleManagerCard,
          !cycleManagerExpanded && styles.cycleManagerCardCollapsed
        ]}>
          <TouchableOpacity
            style={[
              styles.cycleManagerHeader,
              !cycleManagerExpanded && styles.cycleManagerHeaderCollapsed
            ]}
            onPress={() => setCycleManagerExpanded((expanded) => !expanded)}
            activeOpacity={0.8}
          >
            <View style={styles.cycleHeaderLeft}>
              {cycleManagerExpanded ? (
                <>
                  <Text style={styles.cycleEyebrow}>{t.farmCycle.currentCycle}</Text>
                  <Text style={styles.cycleTitle}>
                    {currentCycleTitle}
                  </Text>
                  <Text style={styles.cycleCompactMeta}>
                    {currentCyclePonds.length > 0
                      ? t.farmCycle.cycleMeta
                        .replace('{{pondCount}}', String(currentCyclePonds.length))
                        .replace('{{activeCount}}', String(activeCyclePonds.length))
                      : t.farmCycle.addPondToCreateCycle.replace('{{cycleNumber}}', String(cycles.length + 1))}
                  </Text>
                </>
              ) : (
                <View style={styles.cycleCollapsedContent}>
                  <View style={[
                    styles.cycleStatusDot,
                    currentCyclePonds.length === 0 && styles.cycleStatusDotMuted
                  ]} />
                  <Text style={styles.cycleCollapsedTitle} numberOfLines={1}>
                    {currentCycleTitle}
                  </Text>
                  <Text style={styles.cycleCollapsedMeta} numberOfLines={1}>
                    {currentCyclePonds.length > 0
                      ? `${currentCyclePonds.length} ${t.farmCycle.ponds} | ${currentCycleStatus.toUpperCase()}`
                      : t.farmCycle.addPondToCreateCycle.replace('{{cycleNumber}}', String(cycles.length + 1))}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.cycleHeaderRight}>
              {cycleManagerExpanded && (
                <View style={[
                  styles.cycleStatusBadge,
                  currentCyclePonds.length === 0 && styles.cycleStatusBadgeMuted
                ]}>
                  <Text style={styles.cycleStatusText}>
                    {currentCycleStatus.toUpperCase()}
                  </Text>
                </View>
              )}
              <Ionicons
                name={cycleManagerExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={cycleManagerExpanded ? 20 : 18}
                color="#315f57"
              />
            </View>
          </TouchableOpacity>

          {cycleManagerExpanded && currentCyclePonds.length > 0 ? (
            <>
              {openAccessibleFarmCycles.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cycleSwitcherRow}>
                  {openAccessibleFarmCycles.map((cycle) => (
                    <TouchableOpacity
                      key={cycle.id}
                      style={[styles.cycleSwitcherChip, cycle.id === activeFarmCycle?.id && styles.cycleSwitcherChipActive]}
                      onPress={() => setSelectedDashboardCycleId(cycle.id)}
                    >
                      <Text style={[styles.cycleSwitcherText, cycle.id === activeFarmCycle?.id && styles.cycleSwitcherTextActive]}>
                        {cycle.cycleName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : null}
              <View style={styles.cycleStatsRow}>
                <View style={styles.cycleStat}>
                  <Text style={styles.cycleStatValue}>{currentCyclePonds.length}</Text>
                  <Text style={styles.cycleStatLabel}>{t.farmCycle.ponds}</Text>
                </View>
                <View style={styles.cycleStat}>
                  <Text style={styles.cycleStatValue}>
                    {activeFarmCycle?.stockingStartDate || activeFarmCycle?.plannedStartDate || currentCyclePonds[0]?.docStart || '-'}
                  </Text>
                  <Text style={styles.cycleStatLabel}>{t.farmCycle.stockingStart}</Text>
                </View>
              </View>

              {canManageFarmCycle && activeFarmCycle && (
                <View style={styles.cycleRenameRow}>
                  <TextInput
                    value={cycleNameDraft}
                    onChangeText={setCycleNameDraft}
                    placeholder={t.farmCycle.cycleName}
                    placeholderTextColor="#6b8aa0"
                    style={styles.cycleNameInput}
                  />
                  <TouchableOpacity style={styles.cycleSmallButton} onPress={handleRenameFarmCycle}>
                    <Text style={styles.cycleSmallButtonText}>{t.farmCycle.rename}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.cyclePondList}>
                {currentCyclePonds.slice(0, 4).map((pond) => (
                  <View
                    key={pond.id}
                    style={[
                      styles.cyclePondChip,
                      !isPondCycleActive(pond) && styles.cyclePondChipEnded
                    ]}
                  >
                    <Text style={styles.cyclePondChipText}>{pond.pondName}</Text>
                  </View>
                ))}
                {currentCyclePonds.length > 4 && (
                  <View style={styles.cyclePondChip}>
                    <Text style={styles.cyclePondChipText}>+{currentCyclePonds.length - 4} more</Text>
                  </View>
                )}
              </View>

              {canManageFarmCycle && activeFarmCycle && (
                <TouchableOpacity style={styles.closeFarmCycleButton} onPress={handleCloseFarmCycle}>
                  <Ionicons name="lock-closed-outline" size={18} color="#fff" />
                  <Text style={styles.closeFarmCycleText}>{t.farmCycle.endCycleAction}</Text>
                </TouchableOpacity>
              )}
            </>
          ) : cycleManagerExpanded ? (
            <Text style={styles.cycleEmptyText}>
              {t.farmCycle.emptyTrackerMessage.replace('{{cycleNumber}}', String(cycles.length + 1))}
            </Text>
          ) : null}
        </View>

        {dashboardModeSwitch}

        <View style={styles.cycleFilterContainer}>
          <TouchableOpacity
            style={[styles.cycleFilterButton, cycleFilter === 'active' && styles.cycleFilterButtonActive]}
            onPress={() => setCycleFilter('active')}
          >
            <Text style={[styles.cycleFilterText, cycleFilter === 'active' && styles.cycleFilterTextActive]}>{t.farmCycle.filterActive}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cycleFilterButton, cycleFilter === 'inactive' && styles.cycleFilterButtonActive]}
            onPress={() => setCycleFilter('inactive')}
          >
            <Text style={[styles.cycleFilterText, cycleFilter === 'inactive' && styles.cycleFilterTextActive]}>{t.farmCycle.filterInactive}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cycleFilterButton, cycleFilter === 'ended' && styles.cycleFilterButtonActive]}
            onPress={() => setCycleFilter('ended')}
          >
            <Text style={[styles.cycleFilterText, cycleFilter === 'ended' && styles.cycleFilterTextActive]}>{t.farmCycle.filterEnded}</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={visiblePonds}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PondCard
            pond={item}
            calculateMetrics={model.calculateMetrics}
            getLastADG={model.getLastADG}
            router={model.router}
            t={model.t}
            getDOCColor={model.getDOCColor}
            canEditPonds={model.canEditPonds}
            openBaselineEditModal={model.openBaselineEditModal}
            handleEndPondCycle={model.handleEndPondCycle}
            handleDeletePond={model.handleDeletePond}
          />}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            cycleFilter === 'inactive' && idlePhysicalPonds.length > 0 ? (
              <>
                {idlePhysicalPonds.map((pond) => (
                  <TouchableOpacity
                    key={pond.id}
                    style={styles.pondCard}
                    onPress={() => {
                      setFormData((prev) => ({ ...prev, cyclePondId: pond.id }));
                      openModal('cycle');
                    }}
                  >
                    <View style={[styles.pondHeader, styles.idlePondHeader]}>
                      <View style={[styles.pondTitleGroup, styles.idlePondTitleGroup]}>
                        <Text style={[styles.pondName, styles.idlePondName]}>{pond.pondName}</Text>
                        <Text style={styles.midcycleBadgeText}>Idle pond</Text>
                      </View>
                      <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.editButton}>
                          <Ionicons name="play-outline" size={18} color="#315f57" />
                        </TouchableOpacity>
                        {canEditPonds && (
                          <TouchableOpacity
                            style={styles.deletePondButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDeletePhysicalPond(pond);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`${t.home.deletePond} ${pond.pondName}`}
                          >
                            <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <View style={styles.pondDetails}>
                      <View style={styles.detailRow}>
                        <DetailItem iconName="resize-outline" label={t.forms.pondSize} value={`${pond.pondArea} m²`} />
                        <DetailItem iconName="time-outline" label="Status" value="No active cycle" />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            ) : null
          }
          ListEmptyComponent={
            cycleFilter === 'inactive' && idlePhysicalPonds.length > 0 ? null :
              <View style={styles.emptyState}>
                <Ionicons name="home-outline" size={80} color="#315f57" />
                <Text style={styles.emptyTitle}>{t.home.noPondsYet}</Text>
                <Text style={styles.emptySubtitle}>
                  {canEditPonds
                    ? t.home.noPondsSubtitle
                    : t.home.contactOwnerToAdd
                  }
                </Text>
              </View>
          }
        />

        {canEditPonds && (
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={() => setMenuModalVisible(true)}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        <Modal visible={menuModalVisible} animationType="fade" transparent>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.menuModalContainer}>
              <View style={styles.menuModalContent}>
                <Text style={styles.menuTitle}>{t.home.whatToAdd}</Text>
                <TouchableOpacity
                  style={styles.menuOption}
                  onPress={() => openModal('pond')}
                >
                  <Text style={styles.menuOptionText}>{t.home.newPond}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuOption}
                  onPress={() => openModal('cycle')}
                >
                  <Text style={styles.menuOptionText}>{t.farmCycle.addCycle}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuOption}
                  onPress={() => openModal('sampling')}
                >
                  <Text style={styles.menuOptionText}>
                    {t.home.samplingData}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuOption}
                  onPress={() => openModal('mortality')}
                >
                  <Text style={styles.menuOptionText}>{t.home.dailyMortality}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelMenuButton}
                  onPress={() => setMenuModalVisible(false)}
                >
                  <Text style={styles.cancelMenuText}>
                    {t.actions.cancel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {dataEntryModal}
      </View>
    </>
  );
}

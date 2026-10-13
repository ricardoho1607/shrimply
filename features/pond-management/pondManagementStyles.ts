import {
  Platform,
  StyleSheet
} from 'react-native';
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f8fc'
  },

  scrollContent: {
    padding: Platform.OS === 'android' ? 16 : 20,
    paddingTop: Platform.OS === 'android' ? 8 : 12,
    paddingBottom: 100
  },

  cycleManagerCard: {
    marginHorizontal: Platform.OS === 'android' ? 16 : 20,
    marginTop: Platform.OS === 'android' ? 14 : 18,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e8f2f9',
    shadowColor: '#0d2137',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cycleManagerCardCollapsed: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  dashboardModeSwitch: {
    flexDirection: 'row',
    marginHorizontal: Platform.OS === 'android' ? 16 : 20,
    marginTop: 8,
    padding: 3,
    borderRadius: 11,
    backgroundColor: '#E9F0F5',
  },
  dashboardModeOption: {
    flex: 1,
    minHeight: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardModeOptionSelected: {
    backgroundColor: '#FFFFFF',
  },
  dashboardModeText: {
    color: '#6B7F8E',
    fontSize: 12,
    fontWeight: '800',
  },
  dashboardModeTextSelected: {
    color: '#0F4C75',
  },
  cycleManagerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  cycleManagerHeaderCollapsed: {
    minHeight: 32,
  },
  cycleHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  cycleEyebrow: {
    color: '#6b8aa0',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cycleTitle: {
    color: '#0d2137',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  cycleCompactMeta: {
    color: '#315f57',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  cycleCollapsedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  cycleStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#315f57',
    marginRight: 8,
  },
  cycleStatusDotMuted: {
    backgroundColor: '#6b8aa0',
  },
  cycleCollapsedTitle: {
    color: '#0d2137',
    fontSize: 14,
    fontWeight: '900',
    maxWidth: '45%',
    marginRight: 8,
  },
  cycleCollapsedMeta: {
    color: '#6b8aa0',
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  cycleHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  cycleStatusBadge: {
    backgroundColor: '#315f57',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cycleStatusBadgeMuted: {
    backgroundColor: '#6b8aa0',
  },
  cycleStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  cycleSwitcherRow: {
    gap: 8,
    paddingTop: 14,
  },
  cycleSwitcherChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d7e7f1',
    backgroundColor: '#f4f8fc',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cycleSwitcherChipActive: {
    borderColor: '#0F4C75',
    backgroundColor: '#0F4C75',
  },
  cycleSwitcherText: {
    color: '#5E7485',
    fontSize: 11,
    fontWeight: '800',
  },
  cycleSwitcherTextActive: {
    color: '#FFFFFF',
  },
  cycleStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cycleStat: {
    flex: 1,
    backgroundColor: '#f4f8fc',
    borderRadius: 12,
    padding: 12,
  },
  cycleStatValue: {
    color: '#0d2137',
    fontSize: 16,
    fontWeight: '900',
  },
  cycleStatLabel: {
    color: '#6b8aa0',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  cycleRenameRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cycleNameInput: {
    flex: 1,
    backgroundColor: '#f4f8fc',
    borderWidth: 1,
    borderColor: '#e8f2f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0d2137',
    fontWeight: '700',
  },
  cycleSmallButton: {
    backgroundColor: '#0d2137',
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleSmallButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  cyclePondList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  cyclePondChip: {
    backgroundColor: '#dce8f2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cyclePondChipEnded: {
    backgroundColor: '#eef3f7',
    borderWidth: 1,
    borderColor: '#dce8f2',
  },
  cyclePondChipText: {
    color: '#0d2137',
    fontSize: 12,
    fontWeight: '800',
  },
  closeFarmCycleButton: {
    marginTop: 14,
    backgroundColor: '#0d2137',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  closeFarmCycleText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  cycleEmptyText: {
    color: '#315f57',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 12,
  },

  cycleFilterContainer: {
    flexDirection: 'row',
    marginHorizontal: Platform.OS === 'android' ? 16 : 20,
    marginTop: Platform.OS === 'android' ? 12 : 16,
    padding: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8f2f9',
  },
  cycleFilterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  cycleFilterButtonActive: {
    backgroundColor: '#0d2137',
  },
  cycleFilterText: {
    color: '#315f57',
    fontWeight: '700',
  },
  cycleFilterTextActive: {
    color: '#FFFFFF',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'android' ? 60 : 80
  },
  emptyTitle: {
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 22 : 24,
    fontWeight: 'bold',
    marginTop: Platform.OS === 'android' ? 16 : 20
  },

  emptySubtitle: {
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 15 : 16,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20
  },

  floatingButton: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#0d2137', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#dce8f2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },

  deleteModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 76, 117, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },

  deleteModalContent: {
    backgroundColor: '#0d2137',
    padding: Platform.OS === 'android' ? 20 : 24,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#315f57',
    alignItems: 'center'
  },

  deleteModalIcon: {
    marginBottom: Platform.OS === 'android' ? 12 : 16
  },

  deleteModalTitle: {
    fontSize: Platform.OS === 'android' ? 20 : 22,
    fontWeight: 'bold',
    color: '#f4f8fc',
    marginBottom: 12,
    textAlign: 'center'
  },

  deleteModalMessage: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    color: '#f4f8fc',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: Platform.OS === 'android' ? 20 : 22
  },

  deleteModalWarning: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#dce8f2',
    textAlign: 'center',
    marginBottom: Platform.OS === 'android' ? 20 : 24,
    fontStyle: 'italic',
    lineHeight: Platform.OS === 'android' ? 18 : 20
  },

  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%'
  },

  deleteModalCancelButton: {
    flex: 1,
    paddingVertical: Platform.OS === 'android' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
    borderRadius: 12,
    backgroundColor: '#315f57',
    alignItems: 'center'
  },

  deleteModalCancelText: {
    color: '#f4f8fc',
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: '600'
  },

  deleteModalConfirmButton: {
    flex: 1,
    paddingVertical: Platform.OS === 'android' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
    borderRadius: 12,
    backgroundColor: '#e74c3c',
    alignItems: 'center'
  },

  deleteModalConfirmText: {
    color: '#fff',
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: 'bold'
  },

  pondCard: {
    backgroundColor: '#ffffff',
    padding: Platform.OS === 'android' ? 16 : 20,
    borderRadius: 16,
    marginBottom: Platform.OS === 'android' ? 12 : 16,
    borderWidth: 1,
    borderColor: '#e8f2f9',
    shadowColor: '#315f57', // soft shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4
  },

  pondHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 12 : 16
  },

  pondName: {
    fontSize: Platform.OS === 'android' ? 18 : 20,
    fontWeight: 'bold',
    color: '#0d2137',
    flex: 1
  },

  pondTitleGroup: {
    flex: 1,
    minWidth: 0,
  },

  idlePondHeader: {
    alignItems: 'flex-start',
  },

  idlePondTitleGroup: {
    paddingRight: 12,
  },

  idlePondName: {
    flex: 0,
    flexShrink: 1,
    lineHeight: Platform.OS === 'android' ? 23 : 25,
  },

  midcycleBadgeText: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#BBE1FA',
    color: '#0F4C75',
    fontSize: Platform.OS === 'android' ? 10 : 11,
    fontWeight: '800',
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },

  docBadge: {
    paddingHorizontal: Platform.OS === 'android' ? 10 : 12,
    paddingVertical: Platform.OS === 'android' ? 5 : 6,
    borderRadius: 12,
    marginLeft: Platform.OS === 'android' ? 8 : 12
  },

  docText: {
    color: '#fff',
    fontSize: Platform.OS === 'android' ? 11 : 12,
    fontWeight: 'bold'
  },

  editButton: {
    padding: Platform.OS === 'android' ? 6 : 8,
    marginLeft: 8,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.3)'
  },

  deletePondButton: {
    padding: Platform.OS === 'android' ? 6 : 8,
    marginLeft: 8,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },

  baselineEditButton: {
    padding: Platform.OS === 'android' ? 6 : 8,
    marginLeft: 8,
    backgroundColor: '#EAF6FD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBE1FA',
  },

  pondDetails: {
    marginBottom: Platform.OS === 'android' ? 10 : 12
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Platform.OS === 'android' ? 10 : 12
  },

  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
    minWidth: 0,
    flexWrap: 'nowrap',
  },

  detailLabel: {
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 10 : 11,
    marginLeft: 6,
    width: Platform.OS === 'android' ? 48 : 52,
    flexShrink: 0,
  },

  detailValue: {
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 10 : 11,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    flexShrink: 1,
  },

  startDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 10 : 12,
    borderTopWidth: 1,
    borderTopColor: '#dce8f2'
  },

  startDate: {
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 11 : 12,
    marginLeft: 6,
    lineHeight: Platform.OS === 'android' ? 16 : 18,
    flex: 1,
    flexWrap: 'wrap',
  },

  menuModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 76, 117, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },

  menuModalContent: {
    backgroundColor: '#FFFFFF',
    padding: Platform.OS === 'android' ? 20 : 24,
    borderRadius: 20,
    width: '80%',
    borderWidth: 1,
    borderColor: '#e8f2f9'
  },

  menuTitle: {
    fontSize: Platform.OS === 'android' ? 18 : 20,
    fontWeight: 'bold',
    color: '#0d2137',
    textAlign: 'center',
    marginBottom: Platform.OS === 'android' ? 20 : 24
  },

  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Platform.OS === 'android' ? 14 : 16,
    backgroundColor: '#f4f8fc',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8f2f9'
  },

  menuOptionText: {
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: '600',
    marginLeft: 0
  },

  cancelMenuButton: {
    padding: Platform.OS === 'android' ? 14 : 16,
    alignItems: 'center',
    marginTop: 8
  },

  cancelMenuText: {
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 15 : 16
  },

  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 76, 117, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },

  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#e8f2f9',
    overflow: 'hidden'
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Platform.OS === 'android' ? 20 : 24,
    paddingBottom: 0
  },

  modalTitle: {
    fontSize: Platform.OS === 'android' ? 22 : 24,
    fontWeight: 'bold',
    color: '#0d2137'
  },

  closeButton: {
    padding: 4
  },

  modalScrollView: {
    flexGrow: 0,
    flexShrink: 1,
    padding: Platform.OS === 'android' ? 20 : 24,
    paddingTop: 0
  },

  modalScrollContent: {
    paddingBottom: Platform.OS === 'android' ? 80 : 64,
  },

  inputContainer: {
    marginBottom: Platform.OS === 'android' ? 16 : 20
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },

  inputGroup: {
    flex: 1,
  },

  inputLabel: {
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 13 : 14,
    fontWeight: '600',
    marginBottom: 8
  },

  input: {
    borderWidth: 1,
    borderColor: '#e8f2f9',
    padding: Platform.OS === 'android' ? 14 : 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 15 : 16,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },

  inputHint: {
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 11 : 12,
    marginTop: 4,
    fontStyle: 'italic',
    lineHeight: Platform.OS === 'android' ? 16 : 18
  },

  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },

  segmentOption: {
    flex: 1,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8f2f9',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },

  segmentOptionSelected: {
    backgroundColor: '#0F4C75',
    borderColor: '#0F4C75',
  },

  segmentOptionText: {
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 12 : 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  segmentOptionTextSelected: {
    color: '#FFFFFF',
  },

  mortalityOptionList: {
    gap: 8,
  },

  mortalityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: Platform.OS === 'android' ? 11 : 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8f2f9',
    backgroundColor: '#FFFFFF',
  },

  mortalityOptionSelected: {
    backgroundColor: '#0F4C75',
    borderColor: '#0F4C75',
  },

  mortalityOptionText: {
    flex: 1,
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 13 : 14,
    fontWeight: '700',
  },

  mortalityOptionTextSelected: {
    color: '#FFFFFF',
  },

  pondSelector: {
    maxHeight: 50
  },

  pondOption: {
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16,
    paddingVertical: Platform.OS === 'android' ? 7 : 8,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e8f2f9'
  },

  pondOptionSelected: {
    backgroundColor: '#0d2137',
    borderColor: '#0d2137'
  },

  pondOptionText: {
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 13 : 14,
    fontWeight: '600'
  },

  pondOptionTextSelected: {
    color: '#FFFFFF'
  },

  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: Platform.OS === 'android' ? 16 : 20,
    marginBottom: Platform.OS === 'android' ? 20 : 24
  },

  addButton: {
    backgroundColor: '#315f57',
    paddingVertical: Platform.OS === 'android' ? 14 : 16,
    paddingHorizontal: Platform.OS === 'android' ? 20 : 24,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    shadowColor: '#dce8f2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },

  addButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: 'bold',
  },

  cancelButton: {
    backgroundColor: 'transparent',
    paddingVertical: Platform.OS === 'android' ? 14 : 16,
    paddingHorizontal: Platform.OS === 'android' ? 20 : 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e74c3c',
    flex: 1
  },

  cancelButtonText: {
    color: '#e74c3c',
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: 'bold',
  },

});
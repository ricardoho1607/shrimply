import { PhysicalPondForm } from './PhysicalPondForm';
import { PondBaselineForm } from './PondBaselineForm';
import { PondCycleForm } from './PondCycleForm';
import { PondMortalityForm } from './PondMortalityForm';
import { PondSamplingForm } from './PondSamplingForm';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal, Platform, ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { styles } from './pondManagementStyles';
import type { PondManagementViewModel } from './usePondManagement';
export function PondDataEntryModal(model: PondManagementViewModel) {
  const { modalVisible, modalType, t, setModalVisible, isSubmitting, handleAddPond, handleAddCycle, handleUpdateBaseline, handleAddMortalityRecord, handleAddSamplingData } = model;
  return (<><Modal visible={modalVisible} animationType="slide" transparent>
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {modalType === 'pond'
                ? t.home.addNewPond
                : modalType === 'cycle'
                  ? t.farmCycle.addCycle
                  : modalType === 'baseline'
                    ? t.enterpriseCycle.editBaseline
                    : modalType === 'mortality'
                      ? t.home.addDailyMortality
                      : t.home.addSamplingData}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#dce8f2" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            bounces={false}
          >
            {modalType === 'pond'
              ? <PhysicalPondForm {...model} />
              : modalType === 'cycle'
                ? <PondCycleForm {...model} />
                : modalType === 'baseline'
                  ? <PondBaselineForm {...model} />
                  : modalType === 'mortality'
                    ? <PondMortalityForm {...model} />
                    : <PondSamplingForm {...model} />}

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>{t.actions.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, isSubmitting && { opacity: 0.6 }]}
                onPress={modalType === 'pond'
                  ? handleAddPond
                  : modalType === 'cycle'
                    ? handleAddCycle
                    : modalType === 'baseline'
                      ? handleUpdateBaseline
                      : modalType === 'mortality'
                        ? handleAddMortalityRecord
                        : handleAddSamplingData}
                disabled={isSubmitting}
              >
                <Text style={styles.addButtonText}>
                  {modalType === 'pond'
                    ? t.home.addPondButton
                    : modalType === 'cycle'
                      ? t.enterpriseCycle.startCycle
                      : modalType === 'baseline'
                        ? t.enterpriseCycle.saveBaseline
                        : modalType === 'mortality'
                          ? t.home.saveMortality
                          : t.home.addDataButton}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  </Modal></>);
}

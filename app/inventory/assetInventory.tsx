import { useSaveOperation } from '../../shared/useSaveOperation';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import { getFarmDateKey } from '../../shared/farmDate';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { useAssetStore, type Asset, type MaintenanceType } from '../store/assetStore';
import { useLanguage } from '../../context/LanguageContext';
import AppDatePicker from '../components/forms/AppDatePicker';
import { hasFarmPermission } from '../../shared/permissions';

type ModalType = 'add' | 'transfer' | 'maintenance' | 'history' | 'return' | 'qr-view' | 'qr-scan';

const CATEGORIES = ['Equipment', 'Infrastructure', 'Vehicles', 'Tools', 'Technology'];
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Repair'];
const SEVERITIES = ['Low', 'Medium', 'High'];
const MAINTENANCE_TYPES: MaintenanceType[] = ['Preventive', 'Corrective', 'Inspection', 'Repair', 'Upgrade'];
const PLACEHOLDER_TEXT_COLOR = '#526B7D';

const MAINTENANCE_TYPE_COLORS: Record<MaintenanceType, string> = {
  Preventive: '#27ae60', Corrective: '#f39c12', Inspection: '#315f57', Repair: '#e74c3c', Upgrade: '#9b59b6'
};

const assetManagementPermissionMessage = 'Only owners, co-owners, and technicians can change asset ownership or master records.';
const assetMaintenancePermissionMessage = 'Only owners, co-owners, technicians, and mechanics can log maintenance.';
const assetDeletePermissionMessage = 'Only owners, co-owners, and technicians can delete assets.';

export default function AssetInventoryScreen() {
  const router = useRouter();
  const { company, user } = useAuth();
  const { t } = useLanguage();
  const store = useAssetStore();
  const canManageAssets = hasFarmPermission(user, 'manageAssets', company?.ownerId);
  const canLogMaintenance = hasFarmPermission(user, 'logAssetMaintenance', company?.ownerId);
  const isMaintenanceOnly = canLogMaintenance && !canManageAssets;
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'all'>('dashboard');
  const { save, busy: savePending } = useSaveOperation();
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [maintenanceListExpanded, setMaintenanceListExpanded] = useState(false);
  const [modalType, setModalType] = useState<ModalType>('add');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', description: '', category: 'Equipment', purchaseDate: '', condition: 'Excellent',
    purchaseCost: '', serialNumber: '', manufacturer: '', model: '',
    to: '', purpose: '', expectedReturn: '', description2: '', technician: '', 
    severity: 'Medium', maintenanceType: 'Preventive' as MaintenanceType, nextMaintenance: '', 
    notes: '', cost: '', laborHours: '', partsUsed: '', conditionBefore: 'Good', conditionAfter: 'Good'
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (company?.id) {
      store.setCurrentCompanyId(company.id);
      store.initializeForCompany(company.id);
    }
  }, [company?.id]);

  useEffect(() => {
    if (modalType === 'qr-scan' && modalVisible) {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    }
  }, [modalType, modalVisible]);

  const filteredAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return store.assets.filter(a => 
      (!categoryFilter || a.category === categoryFilter) && 
      (!q || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.serialNumber?.toLowerCase().includes(q))
    );
  }, [store.assets, searchQuery, categoryFilter]);

  const needsMaintenance = useMemo(() => store.getMaintenanceDue(), [store.assets]);
  const checkedOut = useMemo(() => store.assets.filter(a => a.currentHolder), [store.assets]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        t.asset?.permissionDenied || 'Permission Denied',
        t.asset?.enablePhotoAccess || 'Please allow photo access to add asset photos.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.5 
    });
    if (!result.canceled) setPhotos(prev => [...prev, ...result.assets.map(a => a.uri)]);
  };

  const resetForm = () => {
    setFormData({ 
      name: '', description: '', category: 'Equipment', purchaseDate: '', condition: 'Excellent',
      purchaseCost: '', serialNumber: '', manufacturer: '', model: '',
      to: '', purpose: '', expectedReturn: '', description2: '', technician: '', 
      severity: 'Medium', maintenanceType: 'Preventive', nextMaintenance: '', 
      notes: '', cost: '', laborHours: '', partsUsed: '', conditionBefore: 'Good', conditionAfter: 'Good'
    });
    setPhotos([]);
  };

  const closeModal = () => { 
    if (save.busy) return;
    resetForm(); 
    setModalVisible(false); 
    setSelectedAsset(null);
    setScanned(false);
    setHasPermission(null);
  };

  const formatDateValue = (date: Date) => getFarmDateKey(date, company?.timeZone);

  const renderDateField = (
    label: string,
    value: string,
    field: 'purchaseDate' | 'expectedReturn' | 'nextMaintenance'
  ) => (
    <View style={styles.input}>
      <AppDatePicker
        label={label}
        value={value}
        onChange={(date) => setFormData((prev) => ({ ...prev, [field]: formatDateValue(date) }))}
        cancelLabel={t.actions.cancel}
        confirmLabel={t.actions.confirm}
      />
    </View>
  );

  const handleAddAsset = async () => {
    if (!canManageAssets) return Alert.alert(t.asset?.error || 'Error', assetManagementPermissionMessage);
    if (!formData.name) return Alert.alert(t.asset?.error || 'Error', t.asset?.assetNameRequired || 'Asset name is required');
    
    if (!save.acquire()) return;
    try {
      await store.addAsset({
        name: formData.name, description: formData.description, category: formData.category as any,
        purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : new Date(),
        purchaseCost: formData.purchaseCost ? parseFloat(formData.purchaseCost) : undefined,
        serialNumber: formData.serialNumber || undefined, manufacturer: formData.manufacturer || undefined,
        model: formData.model || undefined, condition: formData.condition as any, currentHolder: null,
        photos: photos, nextMaintenanceDue: formData.nextMaintenance ? new Date(formData.nextMaintenance) : undefined,
      });
      
      Alert.alert(t.asset?.success || 'Success', t.asset?.assetAdded || 'Asset added successfully with QR code generated!');
      save.complete();
      save.release();
      closeModal();
      setActiveTab('all');
    } catch (error) {
      console.error('Failed to add asset:', error);
      Alert.alert(t.asset?.error || 'Error', t.asset?.failedToAdd || 'Failed to add asset');
    }
    finally { save.release(); }
  };

  const handleTransfer = async () => {
    if (!canManageAssets) return Alert.alert(t.asset?.error || 'Error', assetManagementPermissionMessage);
    if (!selectedAsset || !formData.to) return Alert.alert(t.asset?.error || 'Error', t.asset?.recipientRequired || 'Recipient is required');
    
    if (!save.acquire()) return;
    try {
      await store.transferAsset(selectedAsset.id, {
        from: selectedAsset.currentHolder || t.asset?.storage || 'Storage', to: formData.to,
        purpose: formData.purpose, expectedReturn: formData.expectedReturn ? new Date(formData.expectedReturn) : undefined,
        notes: formData.notes,
      }, save.id(`transfer:${selectedAsset.id}`));
      
      Alert.alert(t.asset?.success || 'Success', `${t.asset?.assetTransferred || 'Asset transferred to'} ${formData.to}`);
      save.complete();
      save.release();
      closeModal();
    } catch (error) {
      console.error('Failed to transfer asset:', error);
      Alert.alert(t.asset?.error || 'Error', t.asset?.failedToTransfer || 'Failed to transfer asset');
    }
    finally { save.release(); }
  };

  const handleReturn = async () => {
    if (!canManageAssets) return Alert.alert(t.asset?.error || 'Error', assetManagementPermissionMessage);
    if (!selectedAsset) return;
    
    if (!save.acquire()) return;
    try {
      await store.returnAsset(selectedAsset.id);
      Alert.alert(t.asset?.success || 'Success', t.asset?.returnToStorage || 'Asset returned to storage');
      save.complete();
      save.release();
      closeModal();
    } catch (error) {
      console.error('Failed to return asset:', error);
      Alert.alert(t.asset?.error || 'Error', t.asset?.failedToReturn || 'Failed to return asset');
    }
    finally { save.release(); }
  };

  const handleMaintenance = async () => {
    if (!canLogMaintenance) return Alert.alert(t.asset?.error || 'Error', assetMaintenancePermissionMessage);
    if (!selectedAsset || !formData.description2) return Alert.alert(t.asset?.error || 'Error', t.asset?.descriptionRequired || 'Description is required');
    
    if (!save.acquire()) return;
    try {
      const maintenanceRecord: any = {
        description: formData.description2, technician: formData.technician || user?.name || 'Unknown',
        photos: photos, severity: formData.severity as any, type: formData.maintenanceType,
        conditionBefore: formData.conditionBefore as any, conditionAfter: formData.conditionAfter as any,
        notes: formData.notes || '',
        skipCycleLink: isMaintenanceOnly,
      };

      if (formData.cost?.trim()) {
        const costValue = parseFloat(formData.cost);
        if (!isNaN(costValue)) maintenanceRecord.cost = costValue;
      }
      
      if (formData.laborHours?.trim()) {
        const hoursValue = parseFloat(formData.laborHours);
        if (!isNaN(hoursValue)) maintenanceRecord.laborHours = hoursValue;
      }
      
      if (formData.partsUsed?.trim()) {
        const parts = formData.partsUsed.split(',').map(p => p.trim()).filter(p => p.length > 0);
        if (parts.length > 0) maintenanceRecord.partsUsed = parts;
      }
      
      if (formData.nextMaintenance?.trim()) {
        try {
          const nextDate = new Date(formData.nextMaintenance);
          if (!isNaN(nextDate.getTime())) maintenanceRecord.nextMaintenanceDue = nextDate;
        } catch {}
      }

      await store.addMaintenance(selectedAsset.id, maintenanceRecord, save.id(`maintenance:${selectedAsset.id}`));
      Alert.alert(t.asset?.success || 'Success', t.asset?.maintenanceAdded || 'Maintenance record added successfully');
      save.complete();
      save.release();
      closeModal();
    } catch (error) {
      console.error('Failed to add maintenance:', error);
      Alert.alert(t.asset?.error || 'Error', t.asset?.failedToAddMaintenance || 'Failed to add maintenance');
    }
    finally { save.release(); }
  };

  const handleDelete = (id: string) => {
    if (!canManageAssets) return Alert.alert(t.asset?.error || 'Error', assetDeletePermissionMessage);
    Alert.alert(t.asset?.deleteAsset || 'Delete Asset', t.asset?.deleteConfirmation || 'Are you sure? This cannot be undone.', [
      { text: t.asset?.cancel || 'Cancel', style: 'cancel' },
      { 
        text: t.asset?.delete || 'Delete', style: 'destructive', 
        onPress: async () => {
          try {
            await store.deleteAsset(id);
            Alert.alert(t.asset?.success || 'Success', t.asset?.assetDeleted || 'Asset deleted');
          } catch (error) {
            console.error('Failed to delete asset:', error);
            Alert.alert(t.asset?.error || 'Error', t.asset?.failedToDelete || 'Failed to delete asset');
          }
        }
      }
    ]);
  };

  const openModal = (type: ModalType, asset?: Asset) => {
    if (!save.reset()) return;
    if (!canManageAssets && ['add', 'transfer', 'return'].includes(type)) {
      Alert.alert(t.asset?.error || 'Error', assetManagementPermissionMessage);
      return;
    }
    if (!canLogMaintenance && type === 'maintenance') {
      Alert.alert(t.asset?.error || 'Error', assetMaintenancePermissionMessage);
      return;
    }
    setModalType(type);
    if (asset) {
      setSelectedAsset(asset);
      if (type === 'maintenance') {
        setFormData(prev => ({ ...prev, conditionBefore: asset.condition, conditionAfter: asset.condition }));
      }
    }
    setModalVisible(true);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    
    const asset = store.scanQRCode(data);
    if (asset) {
      closeModal();
      setTimeout(() => {
        setSelectedAsset(asset);
        openModal('history', asset);
      }, 300);
    } else {
      Alert.alert(t.asset?.notFound || 'Not Found', t.asset?.assetNotFound || 'Asset not found for this QR code', [
        { text: t.asset?.scanAgain || 'Scan Again', onPress: () => setScanned(false) },
        { text: t.asset?.cancel || 'Cancel', onPress: closeModal, style: 'cancel' }
      ]);
    }
  };

  const AssetCard = ({ asset }: { asset: Asset }) => {
    const isOverdue = asset.transferHistory.some(t => 
      t.expectedReturn && !t.returned && new Date(t.expectedReturn) < new Date()
    );
    const utilization = store.getAssetUtilization(asset.id);

    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => openModal('history', asset)} style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            {asset.photos[0] && <Image source={{ uri: asset.photos[0] }} style={styles.assetImage} />}
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{asset.name}</Text>
              <Text style={styles.cardMeta}>{asset.category} {asset.serialNumber && `• SN: ${asset.serialNumber}`}</Text>
              <Text style={styles.conditionText}>{asset.condition}</Text>
              {asset.totalMaintenanceCost > 0 && (
                <Text style={styles.costText}>{t.asset?.maintCost || 'Maint. Cost'}: ${asset.totalMaintenanceCost.toFixed(2)}</Text>
              )}
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => openModal('qr-view', asset)} style={styles.qrBtn}>
              <Ionicons name="qr-code-outline" size={20} color="#315f57" />
            </TouchableOpacity>
            {canManageAssets && (
              <TouchableOpacity onPress={() => handleDelete(asset.id)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={20} color="#e74c3c" />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.holderSection}>
          <Text style={styles.holderText}>{asset.currentHolder || t.asset?.inStorage || 'In Storage'}</Text>
          {isOverdue && <View style={styles.overdueTag}><Text style={styles.overdueText}>{t.asset?.overdue || 'OVERDUE'}</Text></View>}
          {utilization > 0 && (
            <View style={styles.utilizationTag}>
              <Text style={styles.utilizationText}>{utilization}% {t.asset?.util || 'util'}</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {canManageAssets && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => openModal('transfer', asset)}>
              <Text style={styles.actionText}>{t.asset?.transfer || 'Transfer'}</Text>
            </TouchableOpacity>
          )}
          {canManageAssets && asset.currentHolder && (
            <TouchableOpacity style={styles.actionBtn}
              onPress={() => { setSelectedAsset(asset); openModal('return'); }}>
              <Text style={styles.actionText}>{t.asset?.return || 'Return'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSec]} onPress={() => openModal('maintenance', asset)}>
            <Text style={[styles.actionText, styles.actionTextSec]}>{t.asset?.log || 'Log'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderQRViewModal = () => {
    if (!selectedAsset) return null;
    return (
      <View style={styles.qrViewContainer}>
        <Text style={styles.qrTitle}>{selectedAsset.name}</Text>
        <Text style={styles.qrSubtitle}>{t.asset?.scanToView || 'Scan to view asset details'}</Text>
        <View style={styles.qrCodeWrapper}>
          <QRCode value={`ASSET:${selectedAsset.id}`} size={250} backgroundColor="white" />
        </View>
        <View style={styles.qrInfo}>
          <Text style={styles.qrInfoLabel}>{t.asset?.assetId || 'Asset ID'}</Text>
          <Text style={styles.qrInfoValue}>{selectedAsset.id}</Text>
        </View>
        {selectedAsset.serialNumber && (
          <View style={styles.qrInfo}>
            <Text style={styles.qrInfoLabel}>{t.asset?.serialNumber || 'Serial Number'}</Text>
            <Text style={styles.qrInfoValue}>{selectedAsset.serialNumber}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderQRScanModal = () => {
    if (hasPermission === null) {
      return (
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraText}>{t.asset?.requestingPermission || 'Requesting camera permission...'}</Text>
        </View>
      );
    }
    if (hasPermission === false) {
      return (
        <View style={styles.cameraPlaceholder}>
          <Ionicons name="camera-outline" size={48} color="#e74c3c" />
          <Text style={[styles.cameraText, { color: '#FFF', marginTop: 16 }]}>{t.asset?.permissionDenied || 'Camera permission denied'}</Text>
          <Text style={[styles.cameraText, { fontSize: Platform.OS === 'android' ? 13 : 14, color: '#dce8f2', marginTop: 8 }]}>
            {t.asset?.enableCameraAccess || 'Please enable camera access in your device settings'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }} />
        <View style={styles.scanOverlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanText}>
            {scanned ? t.asset?.processing || 'Processing...' : t.asset?.pointCamera || 'Point camera at asset QR code'}
          </Text>
          {scanned && (
            <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
              <Text style={styles.rescanText}>{t.asset?.scanAgain || 'Scan Again'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderHistoryModal = () => {
    if (!selectedAsset) return null;
    const totalCost = selectedAsset.totalMaintenanceCost;
    const frequency = store.getMaintenanceFrequency(selectedAsset.id);
    
    return (
      <ScrollView style={styles.historyScroll} contentContainerStyle={styles.historyScrollContent}>
        {selectedAsset.photos.length > 0 && (
          <ScrollView horizontal style={{ marginBottom: 16 }}>
            {selectedAsset.photos.map((uri, i) => 
              <Image key={i} source={{ uri }} style={styles.historyImage} />
            )}
          </ScrollView>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t.asset?.totalMaintenanceCost || 'Total Maint. Cost'}</Text>
            <Text style={styles.statValue}>${totalCost.toFixed(2)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t.asset?.records || 'Records'}</Text>
            <Text style={styles.statValue}>{selectedAsset.maintenanceHistory.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t.asset?.frequency || 'Frequency'}</Text>
            <Text style={styles.statValue}>{frequency}/mo</Text>
          </View>
        </View>

        <Text style={styles.historyTitle}>{t.asset?.transferHistory || 'Transfer History'} ({selectedAsset.transferHistory.length})</Text>
        {selectedAsset.transferHistory.length === 0 ? (
          <Text style={styles.emptyHistory}>{t.asset?.noTransfersYet || 'No transfers yet'}</Text>
        ) : (
          selectedAsset.transferHistory.slice().reverse().map(trans => (
            <View key={trans.id} style={styles.historyItem}>
              <View style={[styles.historyIcon, { backgroundColor: '#315f57' }]}>
                <Ionicons name="swap-horizontal" size={16} color="#fff" />
              </View>
              <View style={styles.historyContent}>
                <Text style={styles.historyQty}>{trans.from} → {trans.to}</Text>
                <Text style={styles.historyDate}>{new Date(trans.date).toLocaleString()}</Text>
                {trans.purpose && <Text style={styles.historyNotes}>{t.asset?.purpose || 'Purpose'}: {trans.purpose}</Text>}
                {trans.returned && <Text style={[styles.historyNotes, { color: '#27ae60' }]}>
                  {t.asset?.returned || 'Returned'}: {new Date(trans.returned).toLocaleString()}
                </Text>}
                {trans.expectedReturn && !trans.returned && <Text style={styles.historyNotes}>
                  {t.asset?.expected || 'Expected'}: {new Date(trans.expectedReturn).toLocaleDateString()}
                </Text>}
              </View>
            </View>
          ))
        )}

        <Text style={[styles.historyTitle, { marginTop: 20 }]}>
          {t.asset?.maintenanceHistory || 'Maintenance History'} ({selectedAsset.maintenanceHistory.length})
        </Text>
        {selectedAsset.maintenanceHistory.length === 0 ? (
          <Text style={styles.emptyHistory}>{t.asset?.noMaintenanceYet || 'No maintenance records yet'}</Text>
        ) : (
          selectedAsset.maintenanceHistory.slice().reverse().map(m => (
            <View key={m.id} style={styles.historyItem}>
              <View style={[styles.historyIcon, { backgroundColor: '#f39c12' }]}>
                <Ionicons name="construct" size={16} color="#fff" />
              </View>
              <View style={styles.historyContent}>
                <View style={styles.maintenanceHeader}>
                  <Text style={[styles.historyQty, styles.maintenanceDescription]}>{m.description}</Text>
                  <View style={[styles.typeTag, { backgroundColor: MAINTENANCE_TYPE_COLORS[m.type] + '20' }]}>
                    <Text style={styles.typeText}>{m.type}</Text>
                  </View>
                </View>
                <Text style={styles.historyDate}>{new Date(m.date).toLocaleString()} • {m.technician}</Text>
                {m.cost && <Text style={styles.historyNotes}>{t.asset?.cost || 'Cost'}: ${m.cost.toFixed(2)}</Text>}
                {m.laborHours && <Text style={styles.historyNotes}>{t.asset?.laborHours || 'Labor'}: {m.laborHours}h</Text>}
                {m.partsUsed && m.partsUsed.length > 0 && (
                  <Text style={styles.historyNotes}>{t.asset?.partsUsed || 'Parts'}: {m.partsUsed.join(', ')}</Text>
                )}
                {m.conditionBefore && m.conditionAfter && (
                  <Text style={styles.historyNotes}>
                    {t.asset?.condition || 'Condition'}: {m.conditionBefore} → {m.conditionAfter}
                  </Text>
                )}
                {m.severity && <Text style={[styles.historyNotes, { 
                  color: m.severity === 'High' ? '#e74c3c' : m.severity === 'Medium' ? '#f39c12' : '#27ae60' 
                }]}>{t.asset?.severity || 'Severity'}: {m.severity}</Text>}
                {m.photos.length > 0 && (
                  <ScrollView horizontal style={{ marginTop: 8 }}>
                    {m.photos.map((uri, i) => 
                      <Image key={i} source={{ uri }} style={{ width: 80, height: 80, borderRadius: 8, marginRight: 8 }} />
                    )}
                  </ScrollView>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  const getModalTitle = () => {
    const titles = {
      add: t.asset?.addAsset || 'Add Asset',
      transfer: t.asset?.transferAsset || 'Transfer Asset',
      maintenance: t.asset?.logMaintenance || 'Log Maintenance',
      return: t.asset?.returnAsset || 'Return Asset',
      'qr-view': t.asset?.assetQRCode || 'Asset QR Code',
      history: t.asset?.assetHistory || 'Asset History'
    };
    if (modalType === 'qr-scan') return '';
    return titles[modalType as keyof typeof titles] || '';
  };

  const renderFormField = (label: string, placeholder: string, value: string, onChange: (v: string) => void, props?: any) => (
    <View style={styles.input}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholder={placeholder} value={value} onChangeText={onChange} 
        style={[styles.textInput, props?.multiline && styles.textArea]} {...props}
        placeholderTextColor={PLACEHOLDER_TEXT_COLOR} />
    </View>
  );

  if (store.loading) {
    return (
      <View style={styles.outerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#dce8f2" />
        <SafeAreaView style={styles.topSafeArea} edges={['top', 'left', 'right']}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t.asset?.loadingAssets || 'Loading assets...'}</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#dce8f2" />
      <SafeAreaView style={styles.topSafeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#0d2137" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.asset?.title || 'Asset Management'}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.scanButton} onPress={() => openModal('qr-scan')}>
              <Ionicons name="qr-code" size={24} color="#0d2137" />
            </TouchableOpacity>
            {canManageAssets && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => { resetForm(); openModal('add'); }}
                accessibilityRole="button"
                accessibilityLabel="Add asset"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="add" size={24} color="#0d2137" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.container}>
        <View style={styles.tabs}>
          {(['dashboard', 'all'] as const).map(tab => (
            <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} 
              onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'dashboard' ? t.asset?.dashboard || 'Dashboard' : t.asset?.allAssets || 'All Assets'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'all' && (
          <View style={styles.searchContainer}>
            <View style={styles.searchRow}>
              <TextInput placeholder={t.asset?.searchPlaceholder || "Search assets or serial numbers..."}
                value={searchQuery} onChangeText={setSearchQuery} style={[styles.textInput, { flex: 1 }]}
                placeholderTextColor={PLACEHOLDER_TEXT_COLOR} />
              <TouchableOpacity
                style={styles.categorySelector}
                onPress={() => setCategoryModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={t.asset?.category || 'Select category'}
              >
                <Text style={styles.categorySelectorText} numberOfLines={1}>
                  {categoryFilter || t.inventory.allCategories}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#0d2137" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {activeTab === 'dashboard' && (
            <>
              <View style={styles.metricsGrid}>
                {[
                  { label: t.asset?.totalAssets || 'Total Assets', value: store.assets.length },
                  { label: t.asset?.needsMaintenance || 'Needs Maintenance', value: needsMaintenance.length },
                  { label: t.asset?.checkedOut || 'Checked Out', value: checkedOut.length },
                  { label: t.asset?.totalMaintenanceCost || 'Total Maint. Cost', value: `${store.getTotalMaintenanceCost().toFixed(0)}` },
                ].map((m, i) => (
                  <View key={i} style={styles.metricCard}>
                    <Text style={styles.metricLabel}>{m.label}</Text>
                    <Text style={styles.metricValue}>{m.value}</Text>
                  </View>
                ))}
              </View>

              {needsMaintenance.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t.asset?.needsAttention || 'Needs Attention'} ({needsMaintenance.length})</Text>
                  </View>
                  <FlatList
                    data={needsMaintenance.slice(0, maintenanceListExpanded ? needsMaintenance.length : 2)}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => <AssetCard asset={item} />}
                  />
                  {needsMaintenance.length > 2 && (
                    <TouchableOpacity
                      style={styles.maintenanceListToggle}
                      onPress={() => setMaintenanceListExpanded((expanded) => !expanded)}
                      accessibilityRole="button"
                    >
                      <Text style={styles.maintenanceListToggleText}>
                        {maintenanceListExpanded ? t.inventory.showLess : t.inventory.showAllLowStock}
                      </Text>
                      <Ionicons name={maintenanceListExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#0F4C75" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {checkedOut.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t.asset?.currentlyCheckedOut || 'Currently Checked Out'} ({checkedOut.length})</Text>
                  </View>
                  <FlatList
                    data={checkedOut}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => <AssetCard asset={item} />}
                  />
                </View>
              )}
            </>
          )}

          {activeTab === 'all' && (
            filteredAssets.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="cube-outline" size={64} color="#dce8f2" />
                <Text style={styles.emptyTitle}>{t.asset?.noAssets || 'No Assets'}</Text>
                <Text style={styles.emptySub}>
                  {searchQuery || categoryFilter ? t.asset?.noMatchingAssets || 'No assets match your filters' : t.asset?.addAssetsToStart || 'Add assets to start tracking'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredAssets}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => <AssetCard asset={item} />}
              />
            )
          )}
        </ScrollView>
      </View>

      <Modal visible={categoryModalVisible} animationType="fade" transparent>
        <TouchableOpacity style={styles.categoryOverlay} activeOpacity={1} onPress={() => setCategoryModalVisible(false)}>
          <View style={styles.categoryModal}>
            <Text style={styles.categoryModalTitle}>{t.asset?.category || 'Category'}</Text>
            <TouchableOpacity
              style={[styles.categoryOption, categoryFilter === null && styles.categoryOptionActive]}
              onPress={() => {
                setCategoryFilter(null);
                setCategoryModalVisible(false);
              }}
            >
              <Text style={[styles.categoryOptionText, categoryFilter === null && styles.categoryOptionTextActive]}>{t.inventory.allCategories}</Text>
              {categoryFilter === null && <Ionicons name="checkmark" size={18} color="#0F4C75" />}
            </TouchableOpacity>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[styles.categoryOption, categoryFilter === category && styles.categoryOptionActive]}
                onPress={() => {
                  setCategoryFilter(category);
                  setCategoryModalVisible(false);
                }}
              >
                <Text style={[styles.categoryOptionText, categoryFilter === category && styles.categoryOptionTextActive]}>{category}</Text>
                {categoryFilter === category && <Ionicons name="checkmark" size={18} color="#0F4C75" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalVisible && modalType !== 'qr-scan'} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent} pointerEvents={savePending ? 'none' : 'auto'}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{getModalTitle()}</Text>
              <TouchableOpacity disabled={savePending} onPress={closeModal}>
                <Ionicons name="close-circle" size={28} color="#dce8f2" />
              </TouchableOpacity>
            </View>

            {modalType === 'history' ? renderHistoryModal() : modalType === 'qr-view' ? renderQRViewModal() : (
              <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
                {modalType === 'add' && (
                  <>
                    {renderFormField(t.asset?.assetName || 'Asset Name' + ' *', t.asset?.assetNamePlaceholder || "e.g., Aerator #1", 
                      formData.name, v => setFormData(p => ({ ...p, name: v })))}
                    {renderFormField(t.asset?.description || 'Description', t.asset?.descriptionPlaceholder || "Details about the asset", 
                      formData.description, v => setFormData(p => ({ ...p, description: v })), { multiline: true, numberOfLines: 3 })}
                    <Text style={styles.helperNote}>Asset costs stay in the asset register. Record the matching Equipment or Repairs transaction in Finance once; costs are not posted automatically.</Text>
                    <View style={styles.row}>
                      <View style={styles.rowField}>
                        {renderFormField(t.asset?.serialNumber || 'Serial Number', "SN123456",
                          formData.serialNumber, v => setFormData(p => ({ ...p, serialNumber: v })))}
                      </View>
                      <View style={{ width: 8 }} />
                      <View style={styles.rowField}>
                        {renderFormField(t.asset?.purchaseCost || 'Purchase Cost' + ' ($)', "5000",
                          formData.purchaseCost, v => setFormData(p => ({ ...p, purchaseCost: v })), { keyboardType: 'numeric' })}
                      </View>
                    </View>
                    <View style={styles.row}>
                      <View style={styles.rowField}>
                        {renderFormField(t.asset?.manufacturer || 'Manufacturer', t.asset?.manufacturerPlaceholder || "Brand name",
                          formData.manufacturer, v => setFormData(p => ({ ...p, manufacturer: v })))}
                      </View>
                      <View style={{ width: 8 }} />
                      <View style={styles.rowField}>
                        {renderFormField(t.asset?.model || 'Model', t.asset?.modelPlaceholder || "Model #",
                          formData.model, v => setFormData(p => ({ ...p, model: v })))}
                      </View>
                    </View>
                    <View style={styles.input}>
                      <Text style={styles.label}>{t.asset?.category || 'Category'} *</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {CATEGORIES.map(cat => (
                          <TouchableOpacity key={cat} style={[styles.chip, formData.category === cat && styles.chipActive]} 
                            onPress={() => setFormData(p => ({ ...p, category: cat }))}>
                            <Text style={[styles.chipText, formData.category === cat && styles.chipTextActive]}>{cat}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                    <View style={styles.input}>
                      <Text style={styles.label}>{t.asset?.condition || 'Condition'} *</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {CONDITIONS.map(cond => (
                          <TouchableOpacity key={cond} style={[styles.chip, formData.condition === cond && styles.chipActive]} 
                            onPress={() => setFormData(p => ({ ...p, condition: cond }))}>
                            <Text style={[styles.chipText, formData.condition === cond && styles.chipTextActive]}>{cond}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                    {renderDateField(t.asset?.purchaseDate || 'Purchase Date', formData.purchaseDate, 'purchaseDate')}
                    {renderDateField(t.asset?.nextMaintenanceDue || 'Next Maintenance Due', formData.nextMaintenance, 'nextMaintenance')}
                    <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                      <Ionicons name="camera" size={20} color="#315f57" />
                      <Text style={styles.photoBtnText}>{t.asset?.addPhotos || 'Add Photos'} ({photos.length})</Text>
                    </TouchableOpacity>
                    {photos.length > 0 && (
                      <ScrollView horizontal style={{ marginTop: 8 }}>
                        {photos.map((uri, i) => 
                          <Image key={i} source={{ uri }} style={{ width: 80, height: 80, borderRadius: 8, marginRight: 8 }} />
                        )}
                      </ScrollView>
                    )}
                  </>
                )}

                {modalType === 'transfer' && selectedAsset && (
                  <>
                    <View style={styles.banner}>
                      <Ionicons name="cube" size={20} color="#315f57" />
                      <Text style={styles.bannerText}>{selectedAsset.name}</Text>
                    </View>
                    {renderFormField(t.asset?.transferTo || 'Transfer To (Person Name)' + ' *', t.asset?.transferToPlaceholder || "e.g., John Doe", 
                      formData.to, v => setFormData(p => ({ ...p, to: v })))}
                    {renderFormField(t.asset?.purpose || 'Purpose', t.asset?.purposePlaceholder || "Why is this asset being transferred?", 
                      formData.purpose, v => setFormData(p => ({ ...p, purpose: v })))}
                    {renderDateField(t.asset?.expectedReturnDate || 'Expected Return Date', formData.expectedReturn, 'expectedReturn')}
                    {renderFormField(t.asset?.notes || 'Notes', t.asset?.notesPlaceholder || "Additional notes", 
                      formData.notes, v => setFormData(p => ({ ...p, notes: v })), { multiline: true, numberOfLines: 3 })}
                  </>
                )}

                {modalType === 'maintenance' && selectedAsset && (
                  <>
                    <View style={styles.banner}>
                      <Ionicons name="cube" size={20} color="#315f57" />
                      <Text style={styles.bannerText}>{selectedAsset.name}</Text>
                    </View>
                    <View style={styles.input}>
                      <Text style={styles.label}>{t.asset?.maintenanceType || 'Maintenance Type'} *</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {MAINTENANCE_TYPES.map(type => (
                          <TouchableOpacity key={type} style={[styles.chip, formData.maintenanceType === type && styles.chipActive]} 
                            onPress={() => setFormData(p => ({ ...p, maintenanceType: type }))}>
                            <Text style={[styles.chipText, formData.maintenanceType === type && styles.chipTextActive]}>{type}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                    {renderFormField(t.asset?.description || 'Description' + ' *', t.asset?.maintenanceDescriptionPlaceholder || "What maintenance was performed?", 
                      formData.description2, v => setFormData(p => ({ ...p, description2: v })), { multiline: true, numberOfLines: 3 })}
                    <Text style={styles.helperNote}>Record this maintenance cost once in Finance under Repairs. Saving here updates the asset record only.</Text>
                    <View style={styles.row}>
                      <View style={styles.rowField}>
                        {renderFormField(t.asset?.cost || 'Cost' + ' ($)', "150.00",
                          formData.cost, v => setFormData(p => ({ ...p, cost: v })), { keyboardType: 'numeric' })}
                      </View>
                      <View style={{ width: 8 }} />
                      <View style={styles.rowField}>
                        {renderFormField(t.asset?.laborHours || 'Labor Hours', "2.5",
                          formData.laborHours, v => setFormData(p => ({ ...p, laborHours: v })), { keyboardType: 'numeric' })}
                      </View>
                    </View>
                    {renderFormField(t.asset?.partsUsed || 'Parts Used' + ' (comma separated)', "Filter, Oil, Gasket", 
                      formData.partsUsed, v => setFormData(p => ({ ...p, partsUsed: v })))}
                    {renderFormField(t.asset?.technician || 'Technician/Person', user?.name || 'Your name', 
                      formData.technician, v => setFormData(p => ({ ...p, technician: v })))}
                    <View style={styles.row}>
                      <View style={[styles.input, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>{t.asset?.conditionBefore || 'Condition Before'}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {CONDITIONS.slice(0, 3).map(cond => (
                            <TouchableOpacity key={cond} style={[styles.chipSmall, formData.conditionBefore === cond && styles.chipActive]} 
                              onPress={() => setFormData(p => ({ ...p, conditionBefore: cond }))}>
                              <Text style={[styles.chipTextSmall, formData.conditionBefore === cond && styles.chipTextActive]}>{cond}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                      <View style={[styles.input, { flex: 1 }]}>
                        <Text style={styles.label}>{t.asset?.conditionAfter || 'Condition After'}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {CONDITIONS.slice(0, 3).map(cond => (
                            <TouchableOpacity key={cond} style={[styles.chipSmall, formData.conditionAfter === cond && styles.chipActive]} 
                              onPress={() => setFormData(p => ({ ...p, conditionAfter: cond }))}>
                              <Text style={[styles.chipTextSmall, formData.conditionAfter === cond && styles.chipTextActive]}>{cond}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                    <View style={styles.input}>
                      <Text style={styles.label}>{t.asset?.severity || 'Severity'}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {SEVERITIES.map(sev => (
                          <TouchableOpacity key={sev} style={[styles.chip, formData.severity === sev && styles.chipActive]} 
                            onPress={() => setFormData(p => ({ ...p, severity: sev }))}>
                            <Text style={[styles.chipText, formData.severity === sev && styles.chipTextActive]}>{sev}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                    {renderDateField(t.asset?.nextMaintenanceDue || 'Next Maintenance Due', formData.nextMaintenance, 'nextMaintenance')}
                    {renderFormField(t.asset?.additionalNotes || 'Additional Notes', t.asset?.additionalNotesPlaceholder || "Any other details...", 
                      formData.notes, v => setFormData(p => ({ ...p, notes: v })), { multiline: true, numberOfLines: 2 })}
                    <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                      <Ionicons name="camera" size={20} color="#315f57" />
                      <Text style={styles.photoBtnText}>{t.asset?.addPhotos || 'Add Photos'} ({photos.length})</Text>
                    </TouchableOpacity>
                    {photos.length > 0 && (
                      <ScrollView horizontal style={{ marginTop: 8 }}>
                        {photos.map((uri, i) => 
                          <Image key={i} source={{ uri }} style={{ width: 80, height: 80, borderRadius: 8, marginRight: 8 }} />
                        )}
                      </ScrollView>
                    )}
                  </>
                )}

                {modalType === 'return' && selectedAsset && (
                  <View style={styles.banner}>
                    <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
                    <Text style={styles.bannerText}>{t.asset?.return || 'Return'} {selectedAsset.name} {t.asset?.storage || 'to storage'}?</Text>
                  </View>
                )}

                <View style={styles.buttons}>
                  <TouchableOpacity style={styles.btnCancel} disabled={savePending} onPress={closeModal}>
                    <Text style={styles.btnCancelText}>{t.asset?.cancel || 'Cancel'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnSubmit}
                    disabled={savePending} onPress={modalType === 'add' ? handleAddAsset : modalType === 'transfer' ? handleTransfer :
                      modalType === 'maintenance' ? handleMaintenance : handleReturn}>
                    <Text style={styles.btnSubmitText}>
                      {modalType === 'add' ? t.asset?.addAsset || 'Add Asset' :
                       modalType === 'transfer' ? t.asset?.transfer || 'Transfer' :
                       modalType === 'maintenance' ? t.asset?.saveRecord || 'Save Record' : t.asset?.confirmReturn || 'Confirm Return'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible && modalType === 'qr-scan'} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'black' }}>
          {renderQRScanModal()}
          <TouchableOpacity disabled={savePending} onPress={closeModal}
            style={{ position: 'absolute', top: 40, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', 
              padding: 12, borderRadius: 50, zIndex: 10 }}>
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#f4f8fc' },
  topSafeArea: { backgroundColor: '#dce8f2' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Platform.OS === 'android' ? 14 : 16, paddingTop: Platform.OS === 'android' ? 8 : 10, paddingBottom: Platform.OS === 'android' ? 8 : 10, backgroundColor: '#dce8f2' },  backButton: { padding: Platform.OS === 'android' ? 7 : 8 },
  headerTitle: { flex: 1, fontSize: Platform.OS === 'android' ? 18 : 20, fontWeight: 'bold', color: '#0d2137', marginLeft: Platform.OS === 'android' ? 7 : 8 },
  headerActions: { flexDirection: 'row', gap: Platform.OS === 'android' ? 10 : 12 },
  scanButton: { padding: Platform.OS === 'android' ? 7 : 8 },
  addButton: { padding: Platform.OS === 'android' ? 7 : 8 },
  container: { flex: 1, backgroundColor: '#f4f8fc' },
  tabs: { flexDirection: 'row', paddingHorizontal: Platform.OS === 'android' ? 14 : 16, paddingTop: Platform.OS === 'android' ? 14 : 16, gap: Platform.OS === 'android' ? 7 : 8, backgroundColor: '#f4f8fc' },
  tab: { flex: 1, paddingVertical: Platform.OS === 'android' ? 10 : 12, borderRadius: Platform.OS === 'android' ? 10 : 12, backgroundColor: '#FFF', alignItems: 'center', borderWidth: 1, borderColor: '#E8F4F8' },
  tabActive: { backgroundColor: '#315f57', borderColor: '#315f57' },
  tabText: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', color: '#0d2137' },
  tabTextActive: { color: '#FFF' },
  searchContainer: { padding: Platform.OS === 'android' ? 14 : 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categorySelector: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 150, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D8E7F0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: Platform.OS === 'android' ? 11 : 13 },
  categorySelectorText: { flexShrink: 1, fontSize: 13, fontWeight: '500', color: '#102F46' },
  textInput: { backgroundColor: '#FFF', borderRadius: Platform.OS === 'android' ? 10 : 12, padding: Platform.OS === 'android' ? 12 : 14, color: '#0d2137', fontSize: Platform.OS === 'android' ? 14 : 15, borderWidth: 1, borderColor: '#E8F4F8' },
  chip: { paddingHorizontal: Platform.OS === 'android' ? 14 : 16, paddingVertical: Platform.OS === 'android' ? 7 : 8, borderRadius: Platform.OS === 'android' ? 18 : 20, backgroundColor: '#f4f8fc', marginRight: Platform.OS === 'android' ? 7 : 8, borderWidth: 1, borderColor: '#E8F4F8' },
  chipActive: { backgroundColor: '#315f57', borderColor: '#315f57' },
  chipText: { fontSize: Platform.OS === 'android' ? 12 : 13, fontWeight: '600', color: '#0d2137' },
  chipTextActive: { color: '#FFF' },
  chipSmall: { paddingHorizontal: Platform.OS === 'android' ? 10 : 12, paddingVertical: Platform.OS === 'android' ? 5 : 6, borderRadius: Platform.OS === 'android' ? 14 : 16, backgroundColor: '#f4f8fc', marginRight: Platform.OS === 'android' ? 5 : 6, borderWidth: 1, borderColor: '#E8F4F8' },
  chipTextSmall: { fontSize: Platform.OS === 'android' ? 10 : 11, fontWeight: '600', color: '#0d2137' },
  scroll: { padding: Platform.OS === 'android' ? 14 : 16 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Platform.OS === 'android' ? 10 : 12, marginBottom: Platform.OS === 'android' ? 18 : 20 },
  metricCard: { flex: 1, minWidth: '47%', backgroundColor: '#FFF', borderRadius: 12, padding: Platform.OS === 'android' ? 14 : 16, borderWidth: 1, borderColor: '#E8F0F5' },
  metricLabel: { fontSize: 12, color: '#6B7F91', marginBottom: 4, fontWeight: '500' },
  metricValue: { fontSize: Platform.OS === 'android' ? 16 : 18, fontWeight: '700', color: '#102F46' },
  section: { marginBottom: Platform.OS === 'android' ? 18 : 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Platform.OS === 'android' ? 7 : 8, marginBottom: Platform.OS === 'android' ? 10 : 12 },
  sectionTitle: { flex: 1, fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold', color: '#0d2137' },
  maintenanceListToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  maintenanceListToggleText: { color: '#0F4C75', fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: Platform.OS === 'android' ? 14 : 16, marginBottom: Platform.OS === 'android' ? 10 : 12, borderWidth: 1, borderColor: '#D8E7F0' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Platform.OS === 'android' ? 10 : 12 },
  cardTitle: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: Platform.OS === 'android' ? 10 : 12 },
  assetImage: { width: Platform.OS === 'android' ? 44 : 48, height: Platform.OS === 'android' ? 44 : 48, borderRadius: Platform.OS === 'android' ? 10 : 12 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold', color: '#0d2137', marginBottom: 4 },
  cardMeta: { fontSize: Platform.OS === 'android' ? 12 : 13, color: '#0F4C75', fontWeight: '600', marginBottom: 4 },
  conditionText: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#6B7F91', fontWeight: '600', marginBottom: 2 },
  costText: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#0d2137' },
  cardActions: { flexDirection: 'row', gap: Platform.OS === 'android' ? 7 : 8 },
  qrBtn: { padding: Platform.OS === 'android' ? 7 : 8, backgroundColor: '#f4f8fc', borderRadius: Platform.OS === 'android' ? 7 : 8 },
  deleteBtn: { padding: Platform.OS === 'android' ? 7 : 8, backgroundColor: '#f4f8fc', borderRadius: Platform.OS === 'android' ? 7 : 8 },
  holderSection: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Platform.OS === 'android' ? 7 : 8, paddingVertical: Platform.OS === 'android' ? 9 : 10, borderTopWidth: 1, borderTopColor: '#EDF3F7', marginBottom: Platform.OS === 'android' ? 7 : 8 },
  holderText: { flex: 1, minWidth: 0, fontSize: Platform.OS === 'android' ? 12 : 13, color: '#0d2137' },
  overdueTag: { backgroundColor: '#60798A', paddingHorizontal: Platform.OS === 'android' ? 7 : 8, paddingVertical: 4, borderRadius: Platform.OS === 'android' ? 7 : 8 },
  overdueText: { fontSize: Platform.OS === 'android' ? 9 : 10, fontWeight: '700', color: '#FFF' },
  utilizationTag: { flexShrink: 0, backgroundColor: '#0F4C75', paddingHorizontal: Platform.OS === 'android' ? 7 : 8, paddingVertical: 4, borderRadius: Platform.OS === 'android' ? 7 : 8 },
  utilizationText: { flexShrink: 1, fontSize: Platform.OS === 'android' ? 9 : 10, fontWeight: '700', color: '#FFF' },
  actions: { flexDirection: 'row', gap: Platform.OS === 'android' ? 7 : 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Platform.OS === 'android' ? 9 : 10, borderRadius: 9, backgroundColor: '#0F4C75' },
  actionBtnSec: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D8E7F0' },
  actionText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  actionTextSec: { color: '#0F4C75' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: Platform.OS === 'android' ? 50 : 60 },
  emptyTitle: { fontSize: Platform.OS === 'android' ? 18 : 20, fontWeight: 'bold', color: '#0d2137', marginTop: Platform.OS === 'android' ? 14 : 16 },
  emptySub: { fontSize: Platform.OS === 'android' ? 13 : 14, color: '#315f57', marginTop: Platform.OS === 'android' ? 7 : 8, textAlign: 'center', paddingHorizontal: Platform.OS === 'android' ? 28 : 32 },
  categoryOverlay: { flex: 1, backgroundColor: 'rgba(27, 38, 44, 0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  categoryModal: { width: '90%', maxWidth: 400, backgroundColor: '#FFF', borderRadius: 16, padding: 18 },
  categoryModalTitle: { fontSize: 16, fontWeight: '700', color: '#60798A', marginBottom: 12 },
  categoryOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E8F0F5', marginBottom: 8 },
  categoryOptionActive: { backgroundColor: '#F4F8FC', borderColor: '#B8CBD9' },
  categoryOptionText: { fontSize: 14, color: '#102F46', fontWeight: '500' },
  categoryOptionTextActive: { color: '#0F4C75', fontWeight: '700' },
  modalContainer: { flex: 1, backgroundColor: 'rgba(27, 38, 44, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: Platform.OS === 'android' ? 20 : 24, borderTopRightRadius: Platform.OS === 'android' ? 20 : 24, maxHeight: '90%', shadowColor: '#dce8f2', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Platform.OS === 'android' ? 10 : 12, padding: Platform.OS === 'android' ? 18 : 20, borderBottomWidth: 1, borderBottomColor: '#f4f8fc' },
  modalTitle: { flex: 1, minWidth: 0, fontSize: Platform.OS === 'android' ? 16 : 18, fontWeight: 'bold', color: '#0d2137' },
  form: { maxHeight: Platform.OS === 'android' ? 450 : 500 },
  formContent: { padding: Platform.OS === 'android' ? 18 : 20 },
  input: { marginBottom: Platform.OS === 'android' ? 14 : 16 },
  label: { flexShrink: 1, fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', color: '#0d2137', marginBottom: Platform.OS === 'android' ? 7 : 8 },
  textArea: { height: Platform.OS === 'android' ? 72 : 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', width: '100%' },
  rowField: { flex: 1, minWidth: 0 },
  helperNote: { color: '#526B7D', fontSize: 12, lineHeight: 17, marginBottom: 12, flexShrink: 1 },
  photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Platform.OS === 'android' ? 7 : 8, paddingVertical: Platform.OS === 'android' ? 10 : 12, borderRadius: Platform.OS === 'android' ? 10 : 12, backgroundColor: '#f4f8fc', borderWidth: 1, borderColor: '#315f57', borderStyle: 'dashed' },
  photoBtnText: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', color: '#315f57' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: Platform.OS === 'android' ? 10 : 12, padding: Platform.OS === 'android' ? 14 : 16, borderRadius: Platform.OS === 'android' ? 10 : 12, backgroundColor: '#E8F4F8', marginBottom: Platform.OS === 'android' ? 14 : 16 },
  bannerText: { flex: 1, fontSize: Platform.OS === 'android' ? 14 : 15, fontWeight: '600', color: '#0d2137' },
  buttons: { flexDirection: 'row', gap: Platform.OS === 'android' ? 10 : 12, marginTop: Platform.OS === 'android' ? 18 : 20 },
  btnCancel: { flex: 1, paddingVertical: Platform.OS === 'android' ? 12 : 14, borderRadius: Platform.OS === 'android' ? 10 : 12, backgroundColor: '#f4f8fc', alignItems: 'center', borderWidth: 1, borderColor: '#E8F4F8' },
  btnCancelText: { fontSize: Platform.OS === 'android' ? 14 : 15, fontWeight: '600', color: '#0d2137' },
  btnSubmit: { flex: 1, paddingVertical: Platform.OS === 'android' ? 12 : 14, borderRadius: Platform.OS === 'android' ? 10 : 12, backgroundColor: '#315f57', alignItems: 'center', shadowColor: '#315f57', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  btnSubmitText: { fontSize: Platform.OS === 'android' ? 14 : 15, fontWeight: '600', color: '#FFF' },
  qrViewContainer: { padding: Platform.OS === 'android' ? 18 : 20, alignItems: 'center' },
  qrTitle: { fontSize: Platform.OS === 'android' ? 18 : 20, fontWeight: 'bold', color: '#0d2137', marginBottom: Platform.OS === 'android' ? 7 : 8 },
  qrSubtitle: { fontSize: Platform.OS === 'android' ? 13 : 14, color: '#315f57', marginBottom: Platform.OS === 'android' ? 20 : 24 },
  qrCodeWrapper: { backgroundColor: '#FFF', padding: Platform.OS === 'android' ? 18 : 20, borderRadius: Platform.OS === 'android' ? 14 : 16, marginBottom: Platform.OS === 'android' ? 20 : 24 },
  qrInfo: { width: '100%', backgroundColor: '#f4f8fc', padding: Platform.OS === 'android' ? 14 : 16, borderRadius: Platform.OS === 'android' ? 10 : 12, marginBottom: Platform.OS === 'android' ? 10 : 12 },
  qrInfoLabel: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#0d2137', marginBottom: 4 },
  qrInfoValue: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600', color: '#0d2137' },
  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  cameraPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', padding: Platform.OS === 'android' ? 18 : 20 },
  cameraText: { fontSize: Platform.OS === 'android' ? 15 : 16, color: '#dce8f2', textAlign: 'center' },
  scanOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: Platform.OS === 'android' ? 230 : 250, height: Platform.OS === 'android' ? 230 : 250, borderWidth: 3, borderColor: '#315f57', borderRadius: Platform.OS === 'android' ? 18 : 20, backgroundColor: 'transparent' },
  scanText: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600', color: '#FFF', marginTop: Platform.OS === 'android' ? 20 : 24, textAlign: 'center', paddingHorizontal: Platform.OS === 'android' ? 36 : 40 },
  rescanBtn: { marginTop: Platform.OS === 'android' ? 18 : 20, paddingHorizontal: Platform.OS === 'android' ? 20 : 24, paddingVertical: Platform.OS === 'android' ? 10 : 12, borderRadius: Platform.OS === 'android' ? 10 : 12, backgroundColor: '#315f57' },
  rescanText: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', color: '#FFF' },
  historyScroll: { maxHeight: Platform.OS === 'android' ? 450 : 500 },
  historyScrollContent: { paddingHorizontal: Platform.OS === 'android' ? 18 : 20, paddingTop: Platform.OS === 'android' ? 16 : 18, paddingBottom: 60 },
  historyImage: { width: Platform.OS === 'android' ? 110 : 120, height: Platform.OS === 'android' ? 110 : 120, borderRadius: Platform.OS === 'android' ? 10 : 12, marginRight: Platform.OS === 'android' ? 7 : 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Platform.OS === 'android' ? 10 : 12, marginBottom: Platform.OS === 'android' ? 18 : 20 },
  statCard: { flexGrow: 1, flexBasis: '28%', minWidth: 84, backgroundColor: '#f4f8fc', borderRadius: Platform.OS === 'android' ? 10 : 12, padding: Platform.OS === 'android' ? 10 : 12, alignItems: 'center' },
  statLabel: { flexShrink: 1, fontSize: Platform.OS === 'android' ? 10 : 11, color: '#0d2137', marginBottom: 4, textAlign: 'center', fontWeight: '500' },
  statValue: { flexShrink: 1, fontSize: Platform.OS === 'android' ? 16 : 18, fontWeight: 'bold', color: '#0d2137', textAlign: 'center' },
  historyTitle: { flexShrink: 1, fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold', color: '#0d2137', marginBottom: Platform.OS === 'android' ? 10 : 12 },
  emptyHistory: { fontSize: Platform.OS === 'android' ? 13 : 14, color: '#315f57', fontStyle: 'italic', textAlign: 'center', paddingVertical: Platform.OS === 'android' ? 18 : 20 },
  historyItem: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: Platform.OS === 'android' ? 10 : 12, marginBottom: Platform.OS === 'android' ? 14 : 16, backgroundColor: '#f4f8fc', padding: Platform.OS === 'android' ? 10 : 12, borderRadius: Platform.OS === 'android' ? 10 : 12 },
  historyIcon: { width: Platform.OS === 'android' ? 34 : 36, height: Platform.OS === 'android' ? 34 : 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  historyContent: { flex: 1, minWidth: 0 },
  historyQty: { flexShrink: 1, fontSize: Platform.OS === 'android' ? 14 : 15, fontWeight: '600', color: '#0d2137', marginBottom: 4 },
  historyDate: { flexShrink: 1, fontSize: Platform.OS === 'android' ? 11 : 12, color: '#315f57', marginBottom: Platform.OS === 'android' ? 5 : 6 },
  historyNotes: { flexShrink: 1, fontSize: Platform.OS === 'android' ? 12 : 13, color: '#0d2137', marginTop: 2 },
  maintenanceHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Platform.OS === 'android' ? 7 : 8, marginBottom: 4 },
  maintenanceDescription: { flex: 1, minWidth: 0, marginBottom: 0 },
  typeTag: { flexShrink: 0, paddingHorizontal: Platform.OS === 'android' ? 9 : 10, paddingVertical: 4, borderRadius: Platform.OS === 'android' ? 7 : 8 },
  typeText: { flexShrink: 1, fontSize: Platform.OS === 'android' ? 10 : 11, fontWeight: '700', color: '#0d2137' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: Platform.OS === 'android' ? 15 : 16, color: '#0d2137', fontWeight: '500' },
});

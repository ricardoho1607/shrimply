"use client";

import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { 
  Plus, 
  Search, 
  Trash2, 
  Construction, 
  Wrench, 
  ArrowRightLeft, 
  History, 
  QrCode, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Home, 
  Loader2, 
  X,
  Briefcase
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { auth, db, storage } from '@/lib/firebase';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';
import { getFarmDateKey } from '../../../../../../shared/farmDate';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { hasFarmPermission } from '../../../../../../shared/permissions';

/* --- Types --------------------------------------------------- */

interface MaintenanceRecord {
  id: string;
  date: any;
  cycleId?: string;
  cycleName?: string;
  description: string;
  technician: string;
  cost?: number;
  laborHours?: number;
  partsUsed?: string[];
  severity: 'Low' | 'Medium' | 'High';
  type: string;
  photos: string[];
  conditionBefore?: string;
  conditionAfter?: string;
}

interface TransferRecord {
  id: string;
  date: any;
  from: string;
  to: string;
  purpose?: string;
  expectedReturn?: any;
  returned?: any;
  notes?: string;
}

interface Asset {
  id: string;
  companyId: string;
  name: string;
  description: string;
  category: string;
  purchaseDate: any;
  purchaseCost?: number;
  condition: string;
  currentHolder: string | null;
  photos: string[];
  transferHistory: TransferRecord[];
  maintenanceHistory: MaintenanceRecord[];
  nextMaintenanceDue?: any;
  totalMaintenanceCost: number;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  createdAt: any;
  updatedAt: any;
}

interface FarmCycle {
  id: string;
  cycleName: string;
  status: 'planning' | 'stocking' | 'active' | 'closing' | 'closed';
}

const isOpenFarmCycle = (cycle: FarmCycle) => ['planning', 'stocking', 'active'].includes(cycle.status);
const assetManagementPermissionMessage = 'Only owners, co-owners, and technicians can change asset ownership or master records.';
const assetMaintenancePermissionMessage = 'Only owners, co-owners, technicians, and mechanics can log maintenance.';
const assetDeletePermissionMessage = 'Only owners, co-owners, and technicians can delete assets.';

const CATEGORIES = ['Equipment', 'Infrastructure', 'Vehicles', 'Tools', 'Technology'];
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Repair'];
const MAINTENANCE_TYPES = ['Preventive', 'Corrective', 'Inspection', 'Repair', 'Upgrade'];

export default function AssetInventoryPage() {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { user: authUser, company } = useAuth();
  const canManageAssets = hasFarmPermission(authUser, 'manageAssets', company?.ownerId);
  const canLogMaintenance = hasFarmPermission(authUser, 'logAssetMaintenance', company?.ownerId);
  const isMaintenanceOnly = canLogMaintenance && !canManageAssets;
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'all'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [cycles, setCycles] = useState<FarmCycle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const formatDate = (date: any) => {
    if (!date) return '';
    if (typeof date === 'string') return date;
    if (date && typeof date === 'object' && 'seconds' in date) {
      return getFarmDateKey(new Date(date.seconds * 1000), company?.timeZone);
    }
    try {
      const d = new Date(date);
      if (!isNaN(d.getTime())) return getFarmDateKey(d, company?.timeZone);
    } catch (e) {}
    return '';
  };
  
  // Modal States
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'transfer' | 'maintenance' | 'history' | 'return' | 'qr'>('add');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Equipment',
    purchaseDate: getFarmDateKey(new Date(), company?.timeZone),
    purchaseCost: '',
    serialNumber: '',
    manufacturer: '',
    model: '',
    condition: 'Excellent',
    to: '',
    purpose: '',
    expectedReturn: '',
    technician: '',
    maintType: 'Preventive',
    maintDesc: '',
    maintCost: '',
    laborHours: '',
    nextMaint: '',
    notes: ''
  });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        onSnapshot(doc(db, 'users', firebaseUser.uid), (uDoc) => {
          const cid = uDoc.data()?.companyId;
          const role = uDoc.data()?.role;
          setCompanyId(cid);
          if (cid) {
            const q = query(collection(db, 'assets'), where('companyId', '==', cid));
            const unsubAssets = onSnapshot(q, (snapshot) => {
              const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
              
              // Sort in-memory to avoid requiring a composite index
              data.sort((a, b) => {
                const timeA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
                const timeB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
                return timeB - timeA;
              });

              setAssets(data);
              setLoading(false);
            });
            const qCycles = query(collection(db, 'companies', cid, 'cycles'), orderBy('createdAt', 'asc'));
            const unsubCycles = role === 'mechanic'
              ? () => {}
              : onSnapshot(qCycles, (snapshot) => {
                setCycles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FarmCycle)));
              });
            return () => {
              unsubAssets();
              unsubCycles();
            };
          } else {
            setLoading(false);
          }
        });
      }
    });
    return () => unsubAuth();
  }, []);

  const metrics = useMemo(() => {
    const totalAssets = assets.length;
    const needsMaintenance = assets.filter(a => {
      if (a.condition === 'Needs Repair') return true;
      if (a.nextMaintenanceDue) {
        const nextMaintDate = a.nextMaintenanceDue.seconds 
          ? new Date(a.nextMaintenanceDue.seconds * 1000) 
          : new Date(a.nextMaintenanceDue);
        return nextMaintDate <= new Date();
      }
      return false;
    }).length;
    const checkedOut = assets.filter(a => a.currentHolder).length;
    const totalMaintCost = assets.reduce((sum, a) => sum + (a.totalMaintenanceCost || 0), 0);
    
    return { totalAssets, needsMaintenance, checkedOut, totalMaintCost };
  }, [assets]);

  const filteredAssets = useMemo(() => {
    return assets.filter(a => 
      (!categoryFilter || a.category === categoryFilter) &&
      (a.name.toLowerCase().includes(searchTerm.toLowerCase()) || (a.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [assets, searchTerm, categoryFilter]);

  const handleOpenModal = (type: typeof modalType, asset?: Asset) => {
    if (!canManageAssets && ['add', 'transfer', 'return'].includes(type)) {
      alert(assetManagementPermissionMessage);
      return;
    }

    if (!canLogMaintenance && type === 'maintenance') {
      alert(assetMaintenancePermissionMessage);
      return;
    }

    setModalType(type);
    setPhotoFiles([]);
    setQrDataUrl('');
    if (type === 'qr' && asset) {
      void QRCode.toDataURL(`ASSET:${asset.id}`, { width: 360, margin: 2 }).then(setQrDataUrl);
    }
    if (asset) {
      setSelectedAsset(asset);
      setFormData({
        ...formData,
        to: '',
        purpose: '',
        expectedReturn: '',
        technician: user?.name || '',
        maintType: 'Preventive',
        maintDesc: '',
        maintCost: '',
        laborHours: '',
        nextMaint: '',
        notes: ''
      });
    } else {
      setSelectedAsset(null);
      setFormData({
        ...formData,
        name: '',
        description: '',
        category: 'Equipment',
        purchaseDate: getFarmDateKey(new Date(), company?.timeZone),
        purchaseCost: '',
        serialNumber: '',
        manufacturer: '',
        model: '',
        condition: 'Excellent'
      });
    }
    setModalOpen(true);
  };

  const uploadPhotos = async (assetId: string, folder: string) => Promise.all(photoFiles.map(async (file, index) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileRef = storageRef(storage, `companies/${companyId}/assets/${assetId}/${folder}/${Date.now()}-${index}.${extension}`);
    await uploadBytes(fileRef, file, { contentType: file.type, customMetadata: { companyId: companyId || '', assetId } });
    return getDownloadURL(fileRef);
  }));

  const openScannedAsset = (rawValue: string) => {
    const assetId = rawValue.trim().replace(/^ASSET:/i, '');
    const asset = assets.find((item) => item.id === assetId);
    if (!asset) {
      alert('This QR code does not match an asset in your company.');
      return;
    }
    handleOpenModal('history', asset);
  };

  const scanQrImage = async (file?: File) => {
    if (!file) return;
    try {
      type BarcodeDetectorConstructor = new (options: { formats: string[] }) => {
        detect: (source: ImageBitmap) => Promise<Array<{ rawValue?: string }>>;
      };
      const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      if (!Detector) throw new Error('QR image scanning is not supported in this browser.');
      const bitmap = await createImageBitmap(file);
      const results = await new Detector({ formats: ['qr_code'] }).detect(bitmap);
      bitmap.close();
      if (!results[0]?.rawValue) throw new Error('No QR code was found in that image.');
      openScannedAsset(results[0].rawValue);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not scan this QR image.');
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    if (!canManageAssets && ['add', 'transfer', 'return'].includes(modalType)) {
      alert(assetManagementPermissionMessage);
      return;
    }
    if (!canLogMaintenance && modalType === 'maintenance') {
      alert(assetMaintenancePermissionMessage);
      return;
    }

    try {
      if (modalType === 'add') {
        const assetRef = doc(collection(db, 'assets'));
        const photos = await uploadPhotos(assetRef.id, 'asset');
        const assetData = {
          companyId,
          name: formData.name,
          description: formData.description,
          category: formData.category,
          purchaseDate: Timestamp.fromDate(new Date(formData.purchaseDate)),
          purchaseCost: Number(formData.purchaseCost) || 0,
          serialNumber: formData.serialNumber,
          manufacturer: formData.manufacturer,
          model: formData.model,
          condition: formData.condition,
          currentHolder: null,
          photos,
          transferHistory: [],
          maintenanceHistory: [],
          totalMaintenanceCost: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await setDoc(assetRef, assetData);
      } 
      else if (modalType === 'transfer' && selectedAsset) {
        const transfer: TransferRecord = {
          id: `transfer_${Date.now()}`,
          date: Timestamp.now(),
          from: selectedAsset.currentHolder || 'Storage',
          to: formData.to,
          purpose: formData.purpose,
          expectedReturn: formData.expectedReturn ? Timestamp.fromDate(new Date(formData.expectedReturn)) : null,
          notes: formData.notes
        };
        await updateDoc(doc(db, 'assets', selectedAsset.id), {
          currentHolder: formData.to,
          transferHistory: [...(selectedAsset.transferHistory || []), transfer],
          updatedAt: serverTimestamp()
        });
      }
      else if (modalType === 'return' && selectedAsset) {
        const updatedHistory = (selectedAsset.transferHistory || []).map((t, idx) => 
          idx === selectedAsset.transferHistory.length - 1 ? { ...t, returned: Timestamp.now() } : t
        );
        await updateDoc(doc(db, 'assets', selectedAsset.id), {
          currentHolder: null,
          transferHistory: updatedHistory,
          updatedAt: serverTimestamp()
        });
      }
      else if (modalType === 'maintenance' && selectedAsset) {
        const cost = Number(formData.maintCost) || 0;
        const maintenanceId = `maint_${Date.now()}`;
        const photos = await uploadPhotos(selectedAsset.id, `maintenance/${maintenanceId}`);
        const maintRecord: MaintenanceRecord = {
          id: maintenanceId,
          date: Timestamp.now(),
          cycleId: isMaintenanceOnly ? undefined : cycles.find(isOpenFarmCycle)?.id,
          cycleName: isMaintenanceOnly ? undefined : cycles.find(isOpenFarmCycle)?.cycleName,
          description: formData.maintDesc,
          technician: formData.technician,
          cost: cost,
          laborHours: Number(formData.laborHours) || 0,
          severity: 'Medium',
          type: formData.maintType,
          photos,
          conditionBefore: selectedAsset.condition,
          conditionAfter: 'Good' // Default or could add more fields
        };
        await updateDoc(doc(db, 'assets', selectedAsset.id), {
          totalMaintenanceCost: (selectedAsset.totalMaintenanceCost || 0) + cost,
          maintenanceHistory: [...(selectedAsset.maintenanceHistory || []), maintRecord],
          nextMaintenanceDue: formData.nextMaint ? Timestamp.fromDate(new Date(formData.nextMaint)) : null,
          condition: 'Good',
          updatedAt: serverTimestamp()
        });
      }

      setModalOpen(false);
    } catch (err) {
      console.error('Asset action failed:', err);
      alert('Operation failed. Please try again.');
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!canManageAssets) {
      alert(assetDeletePermissionMessage);
      return;
    }
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    try {
      await deleteDoc(doc(db, 'assets', id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="dashboard-page-relaxed authenticated-compact-page business-dashboard-page">
      <div className="dashboard-inline-toolbar">
        <div className="dashboard-segmented-tabs assets-segmented-tabs" style={{ minHeight: '44px', alignItems: 'center' }}>
          {[
            { id: 'dashboard', label: t.asset.dashboard, icon: Briefcase },
            { id: 'all', label: t.asset.allAssets, icon: Construction }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`dashboard-segmented-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="dashboard-action-row">
          {canManageAssets && (
            <button
              className="dashboard-action dashboard-action-primary"
              onClick={() => handleOpenModal('add')}
              style={{
                minHeight: '44px',
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0',
                textTransform: 'none'
              }}
            >
              <Plus size={18} />
              {t.asset.addAsset}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        {activeTab === 'dashboard' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Metrics Grid */}
            <div className="glass-card dashboard-summary-panel assets-summary-panel">
              {[
                { label: t.asset.totalAssets, value: metrics.totalAssets.toString() },
                { label: t.asset.needsMaintenance, value: metrics.needsMaintenance.toString() },
                { label: t.asset.checkedOut, value: metrics.checkedOut.toString() },
                { label: t.asset.totalMaintenanceCost, value: formatCurrency(metrics.totalMaintCost) }
              ].map(({ label, value }) => (
                <div className="dashboard-summary-item" key={label}>
                  <div className="dashboard-summary-content">
                    <div className="dashboard-summary-meta">
                      <span className="dashboard-summary-label">{label}</span>
                    </div>
                    <div className="dashboard-summary-value">{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Needs Attention Section */}
            {assets.filter(a => a.condition === 'Needs Repair').length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={20} />
                  {t.asset.needsAttention}
                </h2>
                <div className="responsive-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
                  {assets.filter(a => a.condition === 'Needs Repair').map(asset => (
                    <div key={asset.id} className="glass-card" style={{ 
                      padding: '16px', 
                      background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)', 
                      border: '1px solid #FECACA',
                      borderLeft: '6px solid #e74c3c', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      color: '#991B1B'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{asset.name}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(153, 27, 27, 0.8)' }}>{asset.category} • {asset.serialNumber || 'No SN'}</div>
                      </div>
                      {canLogMaintenance && (
                        <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '12px', background: '#991B1B', border: 'none' }} onClick={() => handleOpenModal('maintenance', asset)}>{t.asset.log}</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Toolbar */}
            <div className="glass-card dashboard-toolbar-card" style={{ background: 'white', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                <input 
                  className="asset-readable-placeholder"
                  placeholder="Search assets by name or serial number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    background: 'var(--bg-mid)', border: '1px solid var(--border)', borderRadius: '10px',
                    padding: '10px 16px 10px 40px', width: '100%', fontSize: '14px', outline: 'none', color: 'var(--text-primary)', fontWeight: 600
                  }}
                />
              </div>
              <label className="btn-secondary" style={{ padding: '10px 14px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <QrCode size={16} /> Scan QR image
                <input type="file" accept="image/*" capture="environment" onChange={(event) => void scanQrImage(event.target.files?.[0])} style={{ display: 'none' }} />
              </label>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '5px', background: 'var(--bg-mid)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                <button 
                  onClick={() => setCategoryFilter(null)}
                  style={{ 
                    padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, 
                    background: !categoryFilter ? '#FFF' : 'transparent',
                    color: !categoryFilter ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: !categoryFilter ? '0 4px 12px rgba(15, 76, 117, 0.07)' : 'none',
                    border: 'none', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
                  }}
                >All</button>
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    style={{ 
                      padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, 
                      background: categoryFilter === cat ? '#FFF' : 'transparent',
                      color: categoryFilter === cat ? 'var(--primary)' : 'var(--text-muted)',
                      boxShadow: categoryFilter === cat ? '0 4px 12px rgba(15, 76, 117, 0.07)' : 'none',
                      border: 'none', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
                    }}
                  >{cat}</button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="responsive-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '18px' }}>
              {filteredAssets.map(asset => (
                <div key={asset.id} className="glass-card" style={{ 
                  background: asset.condition === 'Needs Repair' ? 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)' : 'var(--bg-card)', 
                  padding: '0', 
                  overflow: 'hidden', 
                  display: 'flex', 
                  flexDirection: 'column',
                  color: asset.condition === 'Needs Repair' ? '#991B1B' : 'inherit',
                  border: asset.condition === 'Needs Repair' ? '1px solid #FECACA' : '1px solid var(--border)',
                  borderLeft: asset.condition === 'Needs Repair' ? '6px solid #e74c3c' : '1px solid var(--border)'
                }}>
                  <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '14px', flex: 1, minWidth: 0 }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid var(--border)', flexShrink: 0 }}>
                        <Construction size={21} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ fontSize: '17px', fontWeight: 600, overflowWrap: 'anywhere' }}>{asset.name}</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>{asset.category} {asset.serialNumber ? `• SN: ${asset.serialNumber}` : ''}</p>
                        <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '4px', color: asset.condition === 'Needs Repair' ? '#991B1B' : '#27ae60' }}>
                          {asset.condition}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button className="btn-secondary" aria-label={`Show QR code for ${asset.name}`} style={{ padding: '8px', minWidth: 'unset', width: '36px', height: '36px' }} onClick={() => handleOpenModal('qr', asset)}><QrCode size={16} /></button>
                      <button className="btn-secondary" style={{ padding: '8px', minWidth: 'unset', width: '36px', height: '36px' }} onClick={() => handleOpenModal('history', asset)}><History size={16} /></button>
                      {canManageAssets && (
                        <button onClick={() => handleDeleteAsset(asset.id)} style={{ color: '#ef4444', opacity: 0.6, cursor: 'pointer', background: 'transparent', border: 'none', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={18} /></button>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: '13px 20px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-mid)', fontSize: '13px' }}>
                    {asset.currentHolder ? <User size={14} color="var(--primary)" /> : <Home size={14} color="var(--text-faint)" />}
                    <span style={{ fontWeight: 600, color: asset.currentHolder ? 'var(--primary)' : 'var(--text-faint)' }}>
                      {asset.currentHolder || 'In Storage'}
                    </span>
                  </div>

                  <div style={{ padding: '16px 20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {canManageAssets && (
                      <button className="btn-primary" style={{ flex: 1, borderRadius: '10px', padding: '10px' }} onClick={() => handleOpenModal('transfer', asset)}>
                        <ArrowRightLeft size={16} /> Transfer
                      </button>
                    )}
                    {canManageAssets && asset.currentHolder && (
                      <button className="btn-secondary" style={{ flex: 1, borderRadius: '10px', color: '#27ae60', borderColor: '#27ae60', padding: '10px' }} onClick={() => handleOpenModal('return', asset)}>
                        <CheckCircle2 size={16} /> Return
                      </button>
                    )}
                    {canLogMaintenance && (
                      <button className="btn-secondary" style={{ flex: 1, borderRadius: '10px', color: '#f39c12', borderColor: '#f39c12', padding: '10px' }} onClick={() => handleOpenModal('maintenance', asset)}>
                        <Wrench size={16} /> Log
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* -- MODALS --------------------------------------------- */}
      {isModalOpen && (
        <div className="responsive-modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div className="glass-card responsive-modal animate-fade-up" style={{
            width: '100%', maxWidth: modalType === 'history' ? '800px' : '600px', background: 'white', padding: '0', 
            overflow: 'hidden', boxShadow: '0 20px 50px rgba(15, 76, 117, 0.2)',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column'
          }}>
            <div className="responsive-modal-header" style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-mid)' }}>
              <div style={{ minWidth: 0, paddingRight: '12px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600 }}>
                  {modalType === 'add' ? 'Add New Asset' :
                   modalType === 'transfer' ? 'Transfer Asset' :
                   modalType === 'maintenance' ? 'Log Maintenance' :
                   modalType === 'history' ? 'Asset History' :
                   modalType === 'qr' ? 'Asset QR Code' : 'Return to Storage'}
                </h2>
                {selectedAsset && <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px', fontWeight: 600, overflowWrap: 'anywhere' }}>{selectedAsset.name}</p>}
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="responsive-modal-body" style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
              {modalType === 'qr' && selectedAsset ? (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                  <div>
                    <h3 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '12px' }}>{selectedAsset.name}</h3>
                    <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', maxWidth: '400px', margin: '0 auto', fontSize: '15px' }}>
                      Scan this code from the web or mobile app to open the asset record.
                    </p>
                  </div>
                  {qrDataUrl ? <img src={qrDataUrl} alt={`QR code for ${selectedAsset.name}`} style={{ width: '280px', height: '280px' }} /> : <Loader2 className="animate-spin" size={32} />}
                  {qrDataUrl && <a href={qrDataUrl} download={`${selectedAsset.name}-qr.png`} className="btn-primary" style={{ padding: '12px 20px', borderRadius: '10px', textDecoration: 'none' }}>Download QR</a>}
                </div>
              ) : modalType === 'history' && selectedAsset ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', minWidth: 0 }}>
                  {selectedAsset.photos?.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                      {selectedAsset.photos.map((photo) => <img key={photo} src={photo} alt={selectedAsset.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '12px' }} />)}
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Wrench size={18} /> Maintenance History
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {selectedAsset.maintenanceHistory?.length === 0 ? <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '24px', background: 'var(--bg-mid)', borderRadius: '12px' }}>No records found.</p> : 
                      [...selectedAsset.maintenanceHistory].reverse().map(m => (
                        <div key={m.id} style={{ padding: '16px', background: 'var(--bg-mid)', borderRadius: '12px', border: '1px solid var(--border)', minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px 12px', fontWeight: 600, minWidth: 0 }}>
                            <span style={{ color: 'var(--text-primary)', minWidth: 0, flex: '1 1 220px', overflowWrap: 'anywhere' }}>{m.description}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-faint)', flexShrink: 0, whiteSpace: 'nowrap' }}>{formatDate(m.date)}</span>
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
                            {m.type} • {m.technician} • <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{formatCurrency(m.cost || 0)}</span>
                          </div>
                          {m.photos?.length > 0 && <div style={{ display: 'flex', gap: '8px', marginTop: '10px', overflowX: 'auto' }}>{m.photos.map((photo) => <img key={photo} src={photo} alt="Maintenance" style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '8px' }} />)}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ArrowRightLeft size={18} /> Transfer History
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {selectedAsset.transferHistory?.length === 0 ? <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '24px', background: 'var(--bg-mid)', borderRadius: '12px' }}>No records found.</p> : 
                      [...selectedAsset.transferHistory].reverse().map(t => (
                        <div key={t.id} style={{ padding: '16px', background: 'var(--bg-mid)', borderRadius: '12px', border: '1px solid var(--border)', minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px 12px', fontWeight: 600, minWidth: 0 }}>
                            <span style={{ color: 'var(--text-primary)', minWidth: 0, flex: '1 1 220px', overflowWrap: 'anywhere' }}>{t.from} → {t.to}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-faint)', flexShrink: 0, whiteSpace: 'nowrap' }}>{formatDate(t.date)}</span>
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
                            {t.purpose} {t.returned ? `• Returned: ${formatDate(t.returned)}` : <span style={{color: 'var(--primary)', fontWeight: 600}}>• Currently with {t.to}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <form id="assetForm" onSubmit={handleAction} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {modalType === 'add' && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600 }}>Asset Name *</label>
                        <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }} />
                      </div>
                      <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600 }}>Category *</label>
                          <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600 }}>Condition *</label>
                          <select value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600 }}>Serial Number</label>
                          <input value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600 }}>Purchase Date</label>
                          <input type="date" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }} />
                        </div>
                      </div>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                        Asset photos
                        <input type="file" accept="image/*" multiple onChange={(event) => setPhotoFiles(Array.from(event.target.files || []))} />
                      </label>
                    </>
                  )}

                  {modalType === 'transfer' && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600 }}>Transfer To *</label>
                        <input className="asset-readable-placeholder" required value={formData.to} onChange={e => setFormData({...formData, to: e.target.value})} placeholder="Person name" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600 }}>Purpose</label>
                        <input value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600 }}>Expected Return Date</label>
                        <input type="date" value={formData.expectedReturn} onChange={e => setFormData({...formData, expectedReturn: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }} />
                      </div>
                    </>
                  )}

                  {modalType === 'maintenance' && (
                    <>
                      <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600 }}>Maintenance Type *</label>
                          <select value={formData.maintType} onChange={e => setFormData({...formData, maintType: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {MAINTENANCE_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600 }}>Technician</label>
                          <input value={formData.technician} onChange={e => setFormData({...formData, technician: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }} />
                        </div>
                      </div>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                        Maintenance photos
                        <input type="file" accept="image/*" multiple onChange={(event) => setPhotoFiles(Array.from(event.target.files || []))} />
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600 }}>Description *</label>
                        <textarea rows={3} required value={formData.maintDesc} onChange={e => setFormData({...formData, maintDesc: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', resize: 'none', color: 'var(--text-primary)', fontWeight: 600 }} />
                      </div>
                      <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600 }}>Cost (Rp)</label>
                          <input type="number" value={formData.maintCost} onChange={e => setFormData({...formData, maintCost: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600 }}>Next Maint. Date</label>
                          <input type="date" value={formData.nextMaint} onChange={e => setFormData({...formData, nextMaint: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }} />
                        </div>
                      </div>
                    </>
                  )}

                  {modalType === 'return' && (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <CheckCircle2 size={64} color="#27ae60" style={{ margin: '0 auto 16px' }} />
                      <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Return {selectedAsset?.name} to storage?</p>
                      <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>This will clear the current holder.</p>
                    </div>
                  )}
                </form>
              )}
            </div>

            {modalType !== 'history' && modalType !== 'qr' && (
              <div style={{ padding: '24px 32px', borderTop: '1px solid var(--border)', display: 'flex', gap: '16px', background: 'var(--bg-mid)' }}>
                <button type="button" className="asset-modal-cancel" onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'white', fontWeight: 600, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                <button form="assetForm" type="submit" className="btn-primary" style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: 600 }}>
                  {modalType === 'add' ? 'Add Asset' :
                   modalType === 'transfer' ? 'Confirm Transfer' :
                   modalType === 'maintenance' ? 'Save Record' : 'Confirm Return'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

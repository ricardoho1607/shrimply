"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Wallet,
  Search,
  Scale,
  DollarSign,
  X,
  Loader2,
  Calendar,
  Trash2,
  History
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardCopy } from '@/hooks/useDashboardCopy';
import { useFarmDateKey } from '@/hooks/useFarmDateKey';
import {
  applyHarvestImpactToPond,
  calculateHarvestRemoval,
  getHarvestDateSampling,
  getNextPartialHarvestNumber,
  getSamplingSize,
  harvestSizeDiffersFromSampling,
  reverseHarvestImpactOnPond,
  withHarvestReference,
  type HarvestType,
} from '../../../../../shared/harvestCalculations';
import { calculatePondMetricsWithHarvest, getSamplingMbw } from '../../../../../shared/pondCalculations';
import { buildHarvestRevenue, financeSyncDocumentId } from '../../../../../shared/financeSync';
import { useCompanyBlocks } from '@/hooks/useDashboardData';
import {
  filterEnterpriseRecordsForUser,
  type FarmBlock,
} from '../../../../../shared/enterpriseBlocks';
import { isEnterpriseCycleOpen } from '../../../../../shared/enterpriseCycles';
import {
  harvestRecordMatchesCycle,
  isHistoricalHarvestRecord,
} from '../../../../../shared/harvestCycleScope';
import styles from './HarvestPage.module.css';
import { useFarmPermissions } from '@/hooks/useFarmPermissions';

/* --- Types --------------------------------------------------- */
interface HarvestPond {
  pondId: string;
  pondName: string;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
  blockId?: string;
  blockName?: string;
  harvestType?: HarvestType;
  partialHarvestNumber?: number;
  harvestReferenceSamplingId?: string | null;
  harvestReferenceSamplingDate?: string | null;
  harvestReferenceMbw?: number | string | null;
  biomass: string;
  size: string;
  price: string;
  subBiomass: string;
  subSize: string;
  subPrice: string;
}

interface HarvestRecord {
  id: string;
  date: string;
  cycleId?: string;
  cycleName?: string;
  blockId?: string;
  blockName?: string;
  ponds: HarvestPond[];
  createdAt?: { toDate?: () => Date; seconds?: number };
}

interface Pond {
  id: string;
  pondName: string;
  blockId?: string;
  blockName?: string;
  initialPopulation?: number;
  initialWeight?: number;
  samplings?: { date?: string; mbw?: number; abw?: number; mortality?: number }[];
  totalHarvestedBiomass?: number;
  totalHarvestedPopulation?: number;
  partialHarvestCount?: number;
  postHarvestBaselineDate?: string | null;
  postHarvestRemainingBiomass?: number | null;
  postHarvestRemainingPopulation?: number | null;
  postHarvestReferenceSamplingId?: string | null;
  postHarvestReferenceSamplingDate?: string | null;
  postHarvestReferenceMbw?: number | null;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
  cycleStatus?: 'active' | 'ended';
}

interface FarmCycle {
  id: string;
  cycleName: string;
  status: 'planning' | 'stocking' | 'active' | 'closing' | 'closed';
  blockIds?: string[];
  blockNames?: string[];
  blockId?: string;
  blockName?: string;
  plannedStartDate?: string;
  stockingStartDate?: string;
}

interface DashboardUser {
  uid: string;
  name?: string;
  email?: string;
  role?: string;
  companyId?: string;
}

type HarvestFormEntry = Omit<HarvestPond, 'pondName'> & { date: string };

export default function HarvestPage() {
  const copy = useDashboardCopy();
  const { company } = useAuth();
  const { t } = useLanguage();
  const { formatCurrency, currencyConfig } = useCurrency();
  const today = useFarmDateKey(company?.timeZone);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [cycles, setCycles] = useState<FarmCycle[]>([]);
  const [harvestRecords, setHarvestRecords] = useState<HarvestRecord[]>([]);
  const [pondsResolved, setPondsResolved] = useState(false);
  const [cyclesResolved, setCyclesResolved] = useState(false);
  const [harvestRecordsResolved, setHarvestRecordsResolved] = useState(false);
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const loading = !pondsResolved || !cyclesResolved || !harvestRecordsResolved;

  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [harvestFilter, setHarvestFilter] = useState<'current' | 'history'>('current');
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [historyCycleId, setHistoryCycleId] = useState('all');

  // Form State
  const [formData, setFormData] = useState({
    date: today,
    pondId: '',
    harvestType: 'partial' as HarvestType,
    biomass: '',
    size: '',
    price: '',
    subBiomass: '',
    subSize: '',
    subPrice: ''
  });
  const [harvestBatch, setHarvestBatch] = useState<HarvestFormEntry[]>([]);
  const [samplingMbwDrafts, setSamplingMbwDrafts] = useState<Record<string, string>>({});
  const [samplingSavingPondId, setSamplingSavingPondId] = useState<string | null>(null);
  const hasPermission = useFarmPermissions();
  const canEditHarvest = hasPermission('manageHarvests');
  const { data: farmBlocks } = useCompanyBlocks<FarmBlock>('asc');
  const accessiblePonds = useMemo(() => filterEnterpriseRecordsForUser(ponds, {
    businessSize: company?.businessSize,
    role: user?.role,
    userId: user?.uid,
    blocks: farmBlocks,
  }), [company?.businessSize, farmBlocks, ponds, user?.role, user?.uid]);
  const activePonds = useMemo(
    () => accessiblePonds.filter((pond) => pond.cycleStatus !== 'ended'),
    [accessiblePonds],
  );
  const accessibleCycleIds = useMemo(() => new Set(
    accessiblePonds.map((pond) => pond.cycleId).filter((cycleId): cycleId is string => Boolean(cycleId)),
  ), [accessiblePonds]);
  const activeCycles = useMemo(() => {
    const openCycles = cycles.filter(isEnterpriseCycleOpen);
    const linkedCycles = openCycles.filter((cycle) => accessibleCycleIds.has(cycle.id));
    const availableCycles = linkedCycles.length > 0
      ? linkedCycles
      : activePonds.length > 0 && openCycles[0]
        ? [openCycles[0]]
        : [];
    return availableCycles.sort((first, second) => first.cycleName.localeCompare(second.cycleName, undefined, { numeric: true }));
  }, [accessibleCycleIds, activePonds.length, cycles]);
  const historicalCycles = useMemo(() => cycles
    .filter((cycle) => !isEnterpriseCycleOpen(cycle) && accessibleCycleIds.has(cycle.id))
    .sort((first, second) => first.cycleName.localeCompare(second.cycleName, undefined, { numeric: true })),
  [accessibleCycleIds, cycles]);
  const effectiveSelectedCycleId = activeCycles.some((cycle) => cycle.id === selectedCycleId)
    ? selectedCycleId
    : activeCycles[0]?.id || '';
  const selectedCycle = useMemo(
    () => activeCycles.find((cycle) => cycle.id === effectiveSelectedCycleId),
    [activeCycles, effectiveSelectedCycleId],
  );
  const selectedCyclePonds = useMemo(
    () => activePonds.filter((pond) => (
      pond.cycleId === effectiveSelectedCycleId || (!pond.cycleId && activeCycles.length === 1)
    )),
    [activeCycles.length, activePonds, effectiveSelectedCycleId],
  );
  const missingSamplingPonds = useMemo(
    () => selectedCyclePonds.filter((pond) => !getHarvestDateSampling(pond, formData.date)),
    [formData.date, selectedCyclePonds],
  );
  const selectedFormPond = selectedCyclePonds.find((pond) => pond.id === formData.pondId);
  const selectedFormSampling = selectedFormPond
    ? getHarvestDateSampling(selectedFormPond, formData.date)
    : undefined;
  const selectedCyclePondIds = useMemo(
    () => new Set(selectedCyclePonds.map((pond) => pond.id)),
    [selectedCyclePonds],
  );
  const activePondIds = useMemo(() => new Set(activePonds.map((pond) => pond.id)), [activePonds]);
  const accessiblePondIds = useMemo(
    () => new Set(accessiblePonds.map((pond) => pond.id)),
    [accessiblePonds],
  );

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        onSnapshot(doc(db, 'users', firebaseUser.uid), (uDoc) => {
          const userData = uDoc.data() as Omit<DashboardUser, 'uid'> | undefined;
          setUser({ uid: firebaseUser.uid, ...userData });
          const cid = userData?.companyId || null;
          setCompanyId(cid);
          if (cid) {
            setPondsResolved(false);
            setCyclesResolved(false);
            setHarvestRecordsResolved(false);
            // Load Ponds
            onSnapshot(collection(db, 'companies', cid, 'ponds'), (snapshot) => {
              setPonds(snapshot.docs
                .map(doc => ({
                  id: doc.id,
                  pondName: doc.data().pondName,
                  blockId: doc.data().blockId,
                  blockName: doc.data().blockName,
                  initialPopulation: doc.data().initialPopulation || 0,
                  initialWeight: doc.data().initialWeight || 0.5,
                  samplings: Array.isArray(doc.data().samplings) ? doc.data().samplings : [],
                  totalHarvestedBiomass: doc.data().totalHarvestedBiomass || 0,
                  totalHarvestedPopulation: doc.data().totalHarvestedPopulation || 0,
                  partialHarvestCount: doc.data().partialHarvestCount || 0,
                  postHarvestBaselineDate: doc.data().postHarvestBaselineDate ?? null,
                  postHarvestRemainingBiomass: doc.data().postHarvestRemainingBiomass ?? null,
                  postHarvestRemainingPopulation: doc.data().postHarvestRemainingPopulation ?? null,
                  postHarvestReferenceSamplingId: doc.data().postHarvestReferenceSamplingId ?? null,
                  postHarvestReferenceSamplingDate: doc.data().postHarvestReferenceSamplingDate ?? null,
                  postHarvestReferenceMbw: doc.data().postHarvestReferenceMbw ?? null,
                  cycleId: doc.data().cycleId,
                  cycleName: doc.data().cycleName,
                  pondCycleId: doc.data().pondCycleId || doc.id,
                  cycleStatus: doc.data().cycleStatus
                } as Pond)));
              setPondsResolved(true);
            }, (error) => {
              console.error('Error loading harvest ponds:', error);
              setPondsResolved(true);
            });
            // Load Harvest Records
            const q = query(collection(db, 'companies', cid, 'harvestRecords'), orderBy('date', 'desc'));
            const unsubHarvest = onSnapshot(q, (snapshot) => {
              setHarvestRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HarvestRecord)));
              setHarvestRecordsResolved(true);
            }, (error) => {
              console.error('Error loading harvest records:', error);
              setHarvestRecordsResolved(true);
            });
            return () => unsubHarvest();
          } else {
            setPonds([]);
            setCycles([]);
            setHarvestRecords([]);
            setPondsResolved(true);
            setCyclesResolved(true);
            setHarvestRecordsResolved(true);
          }
        });
      } else {
        setUser(null);
        setCompanyId(null);
        setPonds([]);
        setCycles([]);
        setHarvestRecords([]);
        setPondsResolved(true);
        setCyclesResolved(true);
        setHarvestRecordsResolved(true);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!companyId) return;

    return onSnapshot(collection(db, 'companies', companyId, 'cycles'), (snapshot) => {
      setCycles(snapshot.docs.map((cycleDoc) => {
        const data = cycleDoc.data();
        return {
          id: cycleDoc.id,
          cycleName: data.cycleName || t.harvestCycle.productionCycle,
          status: ['planning', 'stocking', 'active', 'closing', 'closed'].includes(data.status)
            ? data.status
            : 'active',
          blockIds: Array.isArray(data.blockIds) ? data.blockIds : [],
          blockNames: Array.isArray(data.blockNames) ? data.blockNames : [],
          blockId: data.blockId,
          blockName: data.blockName,
          plannedStartDate: data.plannedStartDate,
          stockingStartDate: data.stockingStartDate,
        } as FarmCycle;
      }));
      setCyclesResolved(true);
    }, (error) => {
      console.error('Error loading harvest cycles:', error);
      setCyclesResolved(true);
    });
  }, [companyId, t.harvestCycle.productionCycle]);

  const saveRequiredSampling = async (pond: Pond) => {
    if (!companyId || !user || samplingSavingPondId) return;
    const mbw = Number(samplingMbwDrafts[pond.id]);
    if (!Number.isFinite(mbw) || mbw <= 0) {
      alert(t.harvest.samplingMbwRequired);
      return;
    }

    setSamplingSavingPondId(pond.id);
    try {
      const pondRef = doc(db, 'companies', companyId, 'ponds', pond.id);
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(pondRef);
        if (!snapshot.exists()) throw new Error('Pond was not found');
        const serverPond = { id: snapshot.id, ...snapshot.data() } as Pond;
        if (getHarvestDateSampling(serverPond, formData.date)) return;
        transaction.update(pondRef, {
          samplings: [
            ...(serverPond.samplings || []),
            {
              id: `harvest-sampling-${Date.now()}`,
              date: formData.date,
              mbw,
              feed: 0,
              mortality: 0,
              cycleId: serverPond.cycleId,
              cycleName: serverPond.cycleName,
              pondCycleId: serverPond.pondCycleId || serverPond.id,
            },
          ],
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });
      });
      setSamplingMbwDrafts((current) => ({ ...current, [pond.id]: '' }));
    } catch (error) {
      console.error('Error adding harvest-date sampling:', error);
      alert(t.harvestCycle.saveFailed);
    } finally {
      setSamplingSavingPondId(null);
    }
  };

  const handleAddHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !formData.pondId || !user) return;
    if (!canEditHarvest) return;

    try {
      const entries = [...harvestBatch, formData];
      const selectedPonds = entries.map((entry) => selectedCyclePonds.find((pond) => pond.id === entry.pondId));
      if (selectedPonds.some((pond) => !pond)) return;
      for (let index = 0; index < entries.length; index += 1) {
        const selectedPond = selectedPonds[index]!;
        const harvestSampling = getHarvestDateSampling(selectedPond, formData.date);
        if (!harvestSampling) {
          alert(t.harvest.samplingRequiredMessage
            .replace('{{pondName}}', selectedPond.pondName)
            .replace('{{date}}', formData.date));
          return;
        }
        if (
          (harvestSizeDiffersFromSampling(entries[index].size, harvestSampling)
            || harvestSizeDiffersFromSampling(entries[index].subSize, harvestSampling))
          && !window.confirm(t.harvest.sizeDifferenceMessage.replace('{{pondName}}', selectedPond.pondName))
        ) return;
        const removal = calculateHarvestRemoval(entries[index]);
        const estimatedBiomass = calculatePondMetricsWithHarvest(selectedPond).currentBiomass;
        if (estimatedBiomass > 0 && removal.biomass > estimatedBiomass * 1.1 && !window.confirm(
          `${selectedPond.pondName}: recorded harvest (${removal.biomass.toFixed(1)} kg) is higher than estimated pond biomass (${estimatedBiomass.toFixed(1)} kg). This can happen when sampling underestimates stock or MBW. Continue saving?`
        )) return;
      }

      const harvestRef = doc(collection(db, 'companies', companyId, 'harvestRecords'));
      const firstPond = selectedPonds[0]!;
      const newRecord: HarvestRecord = {
        id: harvestRef.id,
        date: formData.date,
        cycleId: firstPond.cycleId || selectedCycle?.id,
        cycleName: firstPond.cycleName || selectedCycle?.cycleName,
        blockId: firstPond.blockId || selectedCycle?.blockId,
        blockName: firstPond.blockName || selectedCycle?.blockName || selectedCycle?.blockNames?.[0],
        ponds: entries.map((entry, index) => {
          return {
            pondId: entry.pondId,
            harvestType: entry.harvestType,
            biomass: entry.biomass,
            size: entry.size,
            price: entry.price,
            subBiomass: entry.subBiomass,
            subSize: entry.subSize,
            subPrice: entry.subPrice,
            pondName: selectedPonds[index]!.pondName,
            cycleId: selectedPonds[index]!.cycleId || selectedCycle?.id,
            cycleName: selectedPonds[index]!.cycleName || selectedCycle?.cycleName,
            pondCycleId: selectedPonds[index]!.pondCycleId || selectedPonds[index]!.id,
            blockId: selectedPonds[index]!.blockId,
            blockName: selectedPonds[index]!.blockName,
          };
        }),
      };

      await runTransaction(db, async (transaction) => {
        const pondRefs = selectedPonds.map((pond) => doc(db, 'companies', companyId, 'ponds', pond!.id));
        const pondSnapshots = await Promise.all(pondRefs.map((pondRef) => transaction.get(pondRef)));
        if (pondSnapshots.some((snapshot) => !snapshot.exists())) throw new Error('A selected pond was not found');

        const canonicalPonds = pondSnapshots.map((pondSnapshot, index) => {
          const serverPond = { id: pondSnapshot.id, ...pondSnapshot.data() } as Pond;
          const harvestPond = newRecord.ponds[index];
          if (!getHarvestDateSampling(serverPond, newRecord.date)) {
            throw new Error(`${serverPond.pondName} requires a positive-MBW sampling on ${newRecord.date}`);
          }
          const partialHarvestNumber = harvestPond.harvestType === 'partial' ? getNextPartialHarvestNumber(serverPond) : undefined;
          const canonicalHarvestPond = withHarvestReference(serverPond, { ...harvestPond, partialHarvestNumber });
          const updatedPond = applyHarvestImpactToPond(serverPond, canonicalHarvestPond, newRecord.date, partialHarvestNumber);
          transaction.update(pondSnapshot.ref, {
            totalHarvestedBiomass: updatedPond.totalHarvestedBiomass,
            totalHarvestedPopulation: updatedPond.totalHarvestedPopulation,
            partialHarvestCount: updatedPond.partialHarvestCount || 0,
            postHarvestBaselineDate: updatedPond.postHarvestBaselineDate || null,
            postHarvestRemainingBiomass: updatedPond.postHarvestRemainingBiomass ?? null,
            postHarvestRemainingPopulation: updatedPond.postHarvestRemainingPopulation ?? null,
            postHarvestReferenceSamplingId: updatedPond.postHarvestReferenceSamplingId || null,
            postHarvestReferenceSamplingDate: updatedPond.postHarvestReferenceSamplingDate || null,
            postHarvestReferenceMbw: updatedPond.postHarvestReferenceMbw || 0,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
          });
          return canonicalHarvestPond;
        });
        transaction.set(harvestRef, {
          ...newRecord,
          ponds: canonicalPonds,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        });
        const revenue = buildHarvestRevenue({ ...newRecord, ponds: canonicalPonds });
        if (revenue.amount > 0) {
          transaction.set(doc(db, 'companies', companyId, 'revenues', financeSyncDocumentId(revenue.reference)), {
            ...revenue,
            companyId,
            addedBy: user.uid,
            addedByName: user.name || user.email || 'Unknown',
            timestamp: Date.now(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      });

      setModalOpen(false);
      setHarvestBatch([]);
      setFormData({
        date: today,
        pondId: '',
        harvestType: 'partial',
        biomass: '',
        size: '',
        price: '',
        subBiomass: '',
        subSize: '',
        subPrice: ''
      });
    } catch (error) {
      console.error('Error adding harvest record:', error);
      alert(t.harvestCycle.saveFailed);
    }
  };

  const addPondToBatch = () => {
    if (!formData.pondId || !formData.biomass || !formData.size || !formData.price) {
      alert(copy('Complete this pond before adding another.'));
      return;
    }
    const selectedPond = selectedCyclePonds.find((pond) => pond.id === formData.pondId);
    if (!selectedPond || !getHarvestDateSampling(selectedPond, formData.date)) {
      alert(t.harvest.samplingRequired);
      return;
    }
    if (harvestBatch.some((entry) => entry.pondId === formData.pondId)) return;
    setHarvestBatch((current) => [...current, { ...formData }]);
    setFormData((current) => ({
      ...current,
      pondId: '', biomass: '', size: '', price: '', subBiomass: '', subSize: '', subPrice: '',
    }));
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!companyId || !user || !window.confirm(t.harvestCycle.deleteConfirm)) return;
    if (!canEditHarvest) return;
    const localRecord = harvestRecords.find((record) => record.id === recordId);
    if (
      company?.businessSize === 'enterprise'
      && user.role === 'technician'
      && (!localRecord || !localRecord.ponds.every((pond) => accessiblePondIds.has(pond.pondId)))
    ) return;
    try {
      const harvestRef = doc(db, 'companies', companyId, 'harvestRecords', recordId);
      await runTransaction(db, async (transaction) => {
        const harvestSnapshot = await transaction.get(harvestRef);
        if (!harvestSnapshot.exists()) return;
        const record = { id: harvestSnapshot.id, ...harvestSnapshot.data() } as HarvestRecord;
        const uniquePondIds = Array.from(new Set(record.ponds.map((pond) => pond.pondId)));
        const pondRefs = uniquePondIds.map((pondId) => doc(db, 'companies', companyId, 'ponds', pondId));
        const pondSnapshots = await Promise.all(pondRefs.map((pondRef) => transaction.get(pondRef)));
        const pondSnapshotsById = new Map(pondSnapshots.map((snapshot) => [snapshot.id, snapshot]));

        record.ponds.forEach((harvestPond) => {
          const pondSnapshot = pondSnapshotsById.get(harvestPond.pondId);
          if (!pondSnapshot?.exists()) return;
          const pond = { id: pondSnapshot.id, ...pondSnapshot.data() } as Pond;
          const updatedPond = reverseHarvestImpactOnPond(pond, harvestPond);
          transaction.update(pondSnapshot.ref, {
            totalHarvestedBiomass: updatedPond.totalHarvestedBiomass,
            totalHarvestedPopulation: updatedPond.totalHarvestedPopulation,
            postHarvestRemainingBiomass: updatedPond.postHarvestRemainingBiomass ?? null,
            postHarvestRemainingPopulation: updatedPond.postHarvestRemainingPopulation ?? null,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
          });
        });
        transaction.delete(harvestRef);
        transaction.delete(doc(db, 'companies', companyId, 'revenues', financeSyncDocumentId(`HARVEST-${recordId}`)));
      });
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  const openCycleIds = useMemo(() => new Set(
    cycles.filter(isEnterpriseCycleOpen).map((cycle) => cycle.id),
  ), [cycles]);
  const accessibleHarvestRecords = useMemo(() => harvestRecords
    .map((record) => ({
      ...record,
      ponds: record.ponds.filter((pond) => accessiblePondIds.has(pond.pondId)),
    }))
    .filter((record) => record.ponds.length > 0), [accessiblePondIds, harvestRecords]);
  const canModifyHarvestRecord = useCallback((recordId: string) => {
    if (company?.businessSize !== 'enterprise' || user?.role !== 'technician') return true;
    const record = harvestRecords.find((item) => item.id === recordId);
    return Boolean(record?.ponds.every((pond) => accessiblePondIds.has(pond.pondId)));
  }, [accessiblePondIds, company?.businessSize, harvestRecords, user?.role]);

  const visibleHarvestRecords = useMemo(() => {
    return accessibleHarvestRecords.filter((harvest) =>
      harvestFilter === 'current'
        ? Boolean(effectiveSelectedCycleId && (
          harvestRecordMatchesCycle(harvest, effectiveSelectedCycleId)
          || harvest.ponds.some((pond) => selectedCyclePondIds.has(pond.pondId))
        ))
        : historyCycleId === 'all'
          ? isHistoricalHarvestRecord(harvest, openCycleIds)
            && !harvest.ponds.some((pond) => activePondIds.has(pond.pondId))
          : harvestRecordMatchesCycle(harvest, historyCycleId)
    );
  }, [accessibleHarvestRecords, activePondIds, effectiveSelectedCycleId, harvestFilter, historyCycleId, openCycleIds, selectedCyclePondIds]);

  const filteredRecords = useMemo(() => {
    return visibleHarvestRecords.filter(r =>
      r.ponds.some(p => p.pondName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [visibleHarvestRecords, searchTerm]);

  const totalRevenue = useMemo(() => {
    return visibleHarvestRecords.reduce((total, record) => {
      return total + record.ponds.reduce((pondTotal, p) => {
        const main = (parseFloat(p.biomass) || 0) * (parseFloat(p.price) || 0);
        const sub = (parseFloat(p.subBiomass) || 0) * (parseFloat(p.subPrice) || 0);
        return pondTotal + main + sub;
      }, 0);
    }, 0);
  }, [visibleHarvestRecords]);

  const totalBiomass = useMemo(() => {
    return visibleHarvestRecords.reduce((acc, r) =>
      acc + r.ponds.reduce((pAcc, p) => pAcc + (parseFloat(p.biomass) || 0) + (parseFloat(p.subBiomass) || 0), 0)
    , 0);
  }, [visibleHarvestRecords]);

  const getHarvestTypeLabel = (pond: HarvestPond) => {
    if (pond.harvestType === 'partial') {
      return t.harvest.partialHarvestNumber.replace('{{number}}', String(pond.partialHarvestNumber || 1));
    }
    if (pond.harvestType === 'final') return t.harvest.finalHarvest;
    return t.harvest.harvest;
  };

  if (loading) {
    return (
      <div className="dashboard-page-relaxed authenticated-compact-page" aria-label={copy('Loading harvest data')} style={{ minHeight: '55vh', display: 'grid', placeItems: 'center' }}>
        <Loader2 className="animate-spin" size={34} color="#0F4C75" />
      </div>
    );
  }

  return (
    <div className="dashboard-page-relaxed authenticated-compact-page" style={{ maxWidth: '1200px', margin: '0 auto' }}>

      {/* Toolbar */}
      <div className="glass-card dashboard-toolbar-card animate-fade-up">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
          <input
            placeholder={t.harvestCycle.searchPond}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '10px 16px 10px 40px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', width: '100%', fontSize: '14px', outline: 'none' }}
          />
        </div>
        {canEditHarvest && (
          <button
            className="dashboard-action dashboard-action-primary"
            disabled={selectedCyclePonds.length === 0}
            onClick={() => {
            setFormData(prev => ({ ...prev, date: today, pondId: '' }));
            setModalOpen(true);
          }} style={selectedCyclePonds.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
            <Plus size={20} />
            <span>{t.harvestCycle.logHarvest}</span>
          </button>
        )}
      </div>

      {/* Financial Overview */}
      <div className="responsive-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <div className="glass-card" style={{ padding: '20px', background: '#FFFFFF' }}>
          <div style={{ color: '#27ae60', marginBottom: '10px' }}><DollarSign size={22} /></div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{t.harvestCycle.totalEstimatedRevenue}</div>
          <div style={{ fontSize: '21px', fontWeight: 600 }}>{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', background: '#FFFFFF' }}>
          <div style={{ color: '#0d2137', marginBottom: '10px' }}><Scale size={22} /></div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{t.harvestCycle.totalHarvestedBiomass}</div>
          <div style={{ fontSize: '21px', fontWeight: 600 }}>{totalBiomass.toLocaleString()}</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', background: '#FFFFFF' }}>
          <div style={{ color: '#3282B8', marginBottom: '10px' }}><History size={22} /></div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{harvestFilter === 'current' ? t.harvestCycle.currentCycleRecords : t.harvestCycle.historicalRecordLabel}</div>
          <div style={{ fontSize: '21px', fontWeight: 600 }}>{visibleHarvestRecords.length}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="glass-card" style={{ padding: '24px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '18px' }}>{harvestFilter === 'current' ? selectedCycle?.cycleName || t.harvestCycle.currentHarvests : t.harvestCycle.harvestHistory}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
              {harvestFilter === 'current'
                ? t.harvestCycle.activePondsAvailable
                  .replace('{{blockName}}', selectedCycle?.blockName || selectedCycle?.blockNames?.[0] || selectedCyclePonds[0]?.blockName || t.harvestCycle.blockFallback)
                  .replace('{{count}}', String(selectedCyclePonds.length))
                : t.harvestCycle.completedRecords}
            </p>
          </div>
          <div style={{ display: 'flex', background: 'var(--bg-mid)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            {[
              { key: 'current' as const, label: t.harvestCycle.currentCycle },
              { key: 'history' as const, label: t.harvestCycle.history },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setHarvestFilter(item.key)}
                style={{
                  padding: '9px 14px',
                  borderRadius: '9px',
                  background: harvestFilter === item.key ? '#fff' : 'transparent',
                  color: harvestFilter === item.key ? 'var(--primary)' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: harvestFilter === item.key ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 360px)', marginBottom: '20px' }}>
          {harvestFilter === 'current' ? (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t.harvestCycle.productionCycle}
              <select
                value={effectiveSelectedCycleId}
                onChange={(event) => setSelectedCycleId(event.target.value)}
                style={{ minHeight: '48px', padding: '11px 13px', borderRadius: '11px', border: '1px solid var(--border)', background: 'var(--bg-mid)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}
              >
                <option value="">{t.harvestCycle.selectActiveCycle}</option>
                {activeCycles.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.cycleName}{cycle.blockName || cycle.blockNames?.[0] ? ` — ${cycle.blockName || cycle.blockNames?.[0]}` : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t.harvestCycle.cycleHistory}
              <select
                value={historyCycleId}
                onChange={(event) => setHistoryCycleId(event.target.value)}
                style={{ minHeight: '48px', padding: '11px 13px', borderRadius: '11px', border: '1px solid var(--border)', background: 'var(--bg-mid)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}
              >
                <option value="all">{t.harvestCycle.allHistory}</option>
                {historicalCycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.cycleName}</option>)}
              </select>
            </label>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Loader2 className="animate-spin" /></div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <Wallet size={48} style={{ opacity: 0.1, margin: '0 auto 16px' }} />
            <p>{harvestFilter === 'current' ? t.harvestCycle.noCurrentRecords : t.harvestCycle.noHistoricalRecords}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredRecords.map((record) => (
              <div key={record.id} className="glass-card" style={{ padding: '18px', background: '#FFFFFF', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Calendar size={18} color="var(--primary)" />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600 }}>{new Date(record.date).toLocaleDateString()}</div>
                      {record.cycleName ? <div style={{ marginTop: '3px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>{record.cycleName}{record.blockName ? ` · ${record.blockName}` : ''}</div> : null}
                    </div>
                  </div>
                  {canEditHarvest && canModifyHarvestRecord(record.id) ? (
                    <button onClick={() => handleDeleteRecord(record.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', opacity: 0.5, cursor: 'pointer' }}><Trash2 size={18} /></button>
                  ) : null}
                </div>

                <div className="responsive-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                  {record.ponds.map((p, idx) => (
                    <div key={idx} style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-mid)' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>{p.pondName}</div>
                      <div style={{ display: 'inline-flex', padding: '4px 9px', borderRadius: '999px', background: '#BBE1FA', color: '#0F4C75', fontSize: '11px', fontWeight: 600, marginBottom: '10px' }}>
                        {getHarvestTypeLabel(p)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.harvest.totalBiomass}</span>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{parseFloat(p.biomass) + (parseFloat(p.subBiomass) || 0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.harvest.averageSize}</span>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{p.size} <span style={{ fontSize: '11px' }}>pcs/kg</span></span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.finance.revenue}</span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#27ae60' }}>
                            {formatCurrency((parseFloat(p.biomass) * parseFloat(p.price)) + (parseFloat(p.subBiomass) * parseFloat(p.subPrice)))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className={`responsive-modal-overlay ${styles.harvestOverlay}`} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px' }}>
          <div className={`glass-card responsive-modal ${styles.harvestModal}`} style={{ width: '100%', maxWidth: '700px', background: '#FFFFFF', padding: '0', overflow: 'hidden' }}>
            <div className={`responsive-modal-header ${styles.harvestHeader}`} style={{ padding: '18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className={styles.harvestTitle} style={{ fontSize: '20px', fontWeight: 600 }}>{t.harvestCycle.logHarvest}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>{t.harvest.recordHarvestDescription}</p>
              </div>
              <button className={styles.closeButton} aria-label={copy('Close')} onClick={() => setModalOpen(false)} style={{ border: 'none', padding: '8px', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form className={`responsive-modal-body ${styles.harvestForm}`} onSubmit={handleAddHarvest}>
              <div className={styles.harvestFormScroll}>
              <div className={styles.cycleSummary} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '12px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600 }}>{selectedCycle?.cycleName}</div>
                  <div style={{ marginTop: '3px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>{selectedCycle?.blockName || selectedCycle?.blockNames?.[0] || selectedCyclePonds[0]?.blockName || t.harvestCycle.blockNotAssigned}</div>
                </div>
                <div style={{ flexShrink: 0, alignSelf: 'center', padding: '7px 10px', borderRadius: '999px', background: '#EAF6FD', color: '#0F4C75', fontSize: '11px', fontWeight: 600 }}>
                  {selectedCyclePonds.length} {t.harvest.pond}
                </div>
              </div>
              <div className={`responsive-form-grid ${styles.harvestGrid}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className={styles.dateField} style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>{t.harvestCycle.harvestDate}</label>
                  <input
                    type="date"
                    max={today}
                    value={formData.date}
                    onChange={(event) => {
                      setFormData({
                        ...formData,
                        date: event.target.value,
                        pondId: '',
                        biomass: '',
                        size: '',
                        price: '',
                        subBiomass: '',
                        subSize: '',
                        subPrice: '',
                      });
                      setHarvestBatch([]);
                    }}
                    onKeyDown={(event) => event.preventDefault()}
                    onPaste={(event) => event.preventDefault()}
                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }}
                  />
                </div>

                {missingSamplingPonds.length > 0 && (
                  <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', borderRadius: '12px', border: '1px solid #F1C27D', background: '#FFF8EA' }}>
                    <div>
                      <div style={{ color: '#8A5700', fontSize: '14px', fontWeight: 700 }}>{t.harvest.samplingRequired}</div>
                      <div style={{ color: '#6B4B16', fontSize: '12px', marginTop: '4px' }}>{t.harvest.samplingGuardHelp}</div>
                    </div>
                    {missingSamplingPonds.map((pond) => (
                      <div key={pond.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', alignItems: 'end' }}>
                        <div style={{ minHeight: '40px', display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 600 }}>{pond.pondName}</div>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#6B4B16', fontSize: '11px', fontWeight: 600 }}>
                          {t.harvest.samplingMbw}
                          <input
                            min="0.01"
                            step="0.01"
                            type="number"
                            value={samplingMbwDrafts[pond.id] || ''}
                            onChange={(event) => setSamplingMbwDrafts((current) => ({ ...current, [pond.id]: event.target.value }))}
                            style={{ minWidth: 0, padding: '10px', borderRadius: '8px', border: '1px solid #D7B36F', background: '#FFF' }}
                          />
                        </label>
                        <button
                          type="button"
                          disabled={samplingSavingPondId !== null}
                          onClick={() => saveRequiredSampling(pond)}
                          style={{ minHeight: '40px', padding: '0 12px', border: 0, borderRadius: '8px', background: '#0F4C75', color: '#FFF', fontWeight: 600, cursor: samplingSavingPondId ? 'wait' : 'pointer', opacity: samplingSavingPondId && samplingSavingPondId !== pond.id ? 0.55 : 1 }}
                        >
                          {samplingSavingPondId === pond.id ? `${t.harvest.saveSampling}…` : t.harvest.saveSampling}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.pondField} style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>{t.harvestCycle.selectPond}</label>
                  <select
                    required
                    value={formData.pondId}
                    onChange={(event) => {
                      const pond = selectedCyclePonds.find((item) => item.id === event.target.value);
                      const sampling = pond ? getHarvestDateSampling(pond, formData.date) : undefined;
                      setFormData({
                        ...formData,
                        pondId: event.target.value,
                        size: sampling ? String(getSamplingSize(sampling)) : '',
                      });
                    }}
                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none' }}
                  >
                    <option value="">{t.harvestCycle.choosePond}</option>
                    {selectedCyclePonds
                      .filter((pond) => !harvestBatch.some((entry) => entry.pondId === pond.id))
                      .map((pond) => {
                        const ready = Boolean(getHarvestDateSampling(pond, formData.date));
                        return <option key={pond.id} value={pond.id} disabled={!ready}>{pond.pondName}{ready ? '' : ` — ${t.harvest.samplingRequired}`}</option>;
                      })}
                  </select>
                </div>

                {harvestBatch.length > 0 && (
                  <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {harvestBatch.map((entry) => (
                      <div key={entry.pondId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', background: '#EAF6FD' }}>
                        <span style={{ fontWeight: 600 }}>{selectedCyclePonds.find((pond) => pond.id === entry.pondId)?.pondName} · {entry.biomass} kg</span>
                        <button type="button" onClick={() => setHarvestBatch((current) => current.filter((item) => item.pondId !== entry.pondId))} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#e74c3c' }} aria-label={copy('Remove pond from harvest batch')}><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.typeField} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>{t.harvest.harvestType}</label>
                  <div style={{ display: 'flex', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }}>
                    {(['partial', 'final'] as HarvestType[]).map((harvestType) => (
                      <button
                        key={harvestType}
                        type="button"
                        onClick={() => setFormData({ ...formData, harvestType })}
                        style={{
                          flex: 1,
                          padding: '9px 10px',
                          border: 'none',
                          borderRadius: '7px',
                          background: formData.harvestType === harvestType ? '#0F4C75' : 'transparent',
                          color: formData.harvestType === harvestType ? '#FFFFFF' : 'var(--text-muted)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {harvestType === 'partial' ? t.harvest.partialHarvest : t.harvest.finalHarvest}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedFormSampling && (
                  <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px', background: '#EAF7F1', color: '#246B52', fontSize: '12px', fontWeight: 600 }}>
                    {t.harvest.samplingReady
                      .replace('{{mbw}}', getSamplingMbw(selectedFormSampling).toFixed(2))
                      .replace('{{size}}', String(getSamplingSize(selectedFormSampling)))}
                  </div>
                )}

                <div className={styles.sizeField} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>{t.harvestCycle.averageSize}</label>
                  <input required min="0.01" step="0.01" type="number" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
                </div>

                <div className={styles.metricsPanel} style={{ display: 'flex', flexDirection: 'column', gap: '12px', gridColumn: 'span 2', padding: '14px', background: 'var(--bg-mid)', borderRadius: '16px' }}>
                  <div className={`responsive-two-column ${styles.primaryMetrics}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>{t.harvestCycle.mainBiomass}</label>
                      <input required min="0.01" type="number" step="0.1" value={formData.biomass} onChange={e => setFormData({...formData, biomass: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#FFF' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>{t.harvestCycle.mainPrice.replace('{{currency}}', currencyConfig.symbol)}</label>
                      <input required min="0.01" type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#FFF' }} />
                    </div>
                  </div>

                  <div style={{ height: '1px', background: 'var(--border)' }} />

                  <div className={`responsive-card-grid ${styles.secondaryMetrics}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-faint)' }}>{t.harvestCycle.subBiomass}</label>
                      <input required={Boolean(formData.subSize || formData.subPrice)} min="0.01" type="number" step="0.1" value={formData.subBiomass} onChange={e => setFormData({...formData, subBiomass: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#FFF' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-faint)' }}>{t.harvestCycle.subSize}</label>
                      <input required={Boolean(formData.subBiomass || formData.subPrice)} min="0.01" step="0.01" type="number" value={formData.subSize} onChange={e => setFormData({...formData, subSize: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#FFF' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-faint)' }}>{t.harvestCycle.subPrice.replace('{{currency}}', currencyConfig.symbol)}</label>
                      <input required={Boolean(formData.subBiomass || formData.subSize)} min="0.01" type="number" value={formData.subPrice} onChange={e => setFormData({...formData, subPrice: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#FFF' }} />
                    </div>
                  </div>
                </div>
                {selectedCyclePonds.length > harvestBatch.length + 1 && (
                  <button type="button" onClick={addPondToBatch} style={{ gridColumn: 'span 2', minHeight: '40px', borderRadius: '10px', border: '1px solid #0F4C75', color: '#0F4C75', background: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}>
                    <Plus size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> {copy('Add another pond to this harvest')}
                  </button>
                )}
              </div>
              </div>

              <div className={`responsive-modal-footer ${styles.harvestFooter}`} style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ flex: 1, minHeight: '40px', padding: '0 12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }}>{t.actions.cancel}</button>
                <button type="submit" className={`btn-primary ${styles.saveButton}`} style={{ flex: 1, minHeight: '40px', padding: '0 12px', borderRadius: '12px', fontWeight: 600 }}>{t.actions.save} {t.harvest.harvest}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { showAppAlert, confirmAppAction } from '@/lib/appDialogs';


import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Plus,
  Wallet,
  Search,
  Scale,
  DollarSign,
  X,
  Loader2,
  Calendar,
  Pencil,
  Trash2,
  History
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardCopy } from '@/hooks/useDashboardCopy';
import { useFarmDateKey } from '@/hooks/useFarmDateKey';
import {
  buildHarvestDateSampling,
  calculateHarvestRemoval,
  getHarvestDateSampling,
  getInvalidHarvestDraftLine,
  getSamplingSize,
  harvestSizeDiffersFromSampling,
  reverseHarvestImpactOnPond,
  type HarvestDayFeedStatus,
  type HarvestType,
} from '../../../../../shared/harvestCalculations';
import { calculatePondMetricsWithHarvest, getSamplingMbw } from '../../../../../shared/pondCalculations';
import { buildHarvestRevenue, financeSyncDocumentId, financeSourceEntry } from '../../../../../shared/financeSync';
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
import { createHarvestOperation, groupHarvestEntriesByDate, type HarvestOperation } from '../../../../../shared/harvestOperation';
import { commitHarvestOperation } from '../../../../../shared/commitHarvestOperation';
import styles from './HarvestPage.module.css';
import { getHarvestDoc } from './harvestDoc';
import { getHarvestSaveError, HarvestSaveError, isValidHarvestDate, prepareHarvestWriteData } from './harvestPersistence';
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
  finalHarvestDates?: string[] | null;
  docStart?: string;
  baselineDate?: string;
  baselineDoc?: number;
  id: string;
  pondName: string;
  blockId?: string;
  blockName?: string;
  initialPopulation?: number;
  initialWeight?: number;
  samplings?: { date?: string; mbw?: number; abw?: number; mortality?: number; feed?: number; feedEntryStatus?: 'not_recorded' | 'fasted' | 'recorded' }[];
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

type HarvestFormEntry = Omit<HarvestPond, 'pondName' | 'harvestType'> & { date: string; harvestType: HarvestType };

export default function HarvestPage() {
  const copy = useDashboardCopy();
  const { company, user } = useAuth();
  const { t } = useLanguage();
  const { formatCurrency, currencyConfig } = useCurrency();
  const today = useFarmDateKey(company?.timeZone);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [cycles, setCycles] = useState<FarmCycle[]>([]);
  const [harvestRecords, setHarvestRecords] = useState<HarvestRecord[]>([]);
  const [pondsResolved, setPondsResolved] = useState(false);
  const [cyclesResolved, setCyclesResolved] = useState(false);
  const [harvestRecordsResolved, setHarvestRecordsResolved] = useState(false);
  const companyId = user?.companyId || null;
  const loading = !pondsResolved || !cyclesResolved || !harvestRecordsResolved;

  const [isModalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HarvestRecord | null>(null);
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
  const [samplingFeedStatuses, setSamplingFeedStatuses] = useState<Record<string, HarvestDayFeedStatus>>({});
  const [samplingSavingPondId, setSamplingSavingPondId] = useState<string | null>(null);
  const [isSavingHarvest, setIsSavingHarvest] = useState(false);
  const harvestSubmitLock = useRef(false);
  const pendingHarvest = useRef<{ id: string; operation?: HarvestOperation<HarvestRecord> } | null>(null);
  const autoFilledSizes = useRef<Record<string, string>>({});
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
  const selectedCyclePondIds = useMemo(
    () => new Set(selectedCyclePonds.map((pond) => pond.id)),
    [selectedCyclePonds],
  );
  const activePondIds = useMemo(() => new Set(activePonds.map((pond) => pond.id)), [activePonds]);
  const accessiblePondIds = useMemo(
    () => new Set(accessiblePonds.map((pond) => pond.id)),
    [accessiblePonds],
  );
  const formPonds = useMemo(() => editingRecord
    ? editingRecord.ponds
        .map((harvestPond) => accessiblePonds.find((pond) => pond.id === harvestPond.pondId))
        .filter(Boolean) as Pond[]
    : selectedCyclePonds,
  [accessiblePonds, editingRecord, selectedCyclePonds]);
  const missingSamplingPonds = useMemo(
    () => formPonds.filter((pond) => pond.id === formData.pondId && !getHarvestDateSampling(pond, formData.date)),
    [formData.date, formData.pondId, formPonds],
  );
  const selectedFormPond = formPonds.find((pond) => pond.id === formData.pondId);
  const selectedFormSampling = selectedFormPond
    ? getHarvestDateSampling(selectedFormPond, formData.date)
    : undefined;
  const formCycle = useMemo(() => editingRecord
    ? cycles.find((cycle) => cycle.id === editingRecord.cycleId)
    : selectedCycle,
  [cycles, editingRecord, selectedCycle]);

  useEffect(() => {
    setPonds([]);
    setHarvestRecords([]);
    setPondsResolved(!companyId);
    setHarvestRecordsResolved(!companyId);
    if (!companyId) return;
    let active = true;
    // Load Ponds
    const unsubPonds = onSnapshot(collection(db, 'companies', companyId, 'ponds'), (snapshot) => {
      if (!active) return;
      setPonds(snapshot.docs
        .map(doc => ({
          id: doc.id,
          pondName: doc.data().pondName,
          docStart: doc.data().docStart,
          baselineDate: doc.data().baselineDate,
          baselineDoc: doc.data().baselineDoc,
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
      if (!active) return;
      console.error('Error loading harvest ponds:', error);
      setPondsResolved(true);
    });
    // Load Harvest Records
    const q = query(collection(db, 'companies', companyId, 'harvestRecords'), orderBy('date', 'desc'));
    const unsubHarvest = onSnapshot(q, (snapshot) => {
      if (!active) return;
      setHarvestRecords(snapshot.docs.filter(doc => !doc.data().voided).map(doc => ({ id: doc.id, ...doc.data() } as HarvestRecord)));
      setHarvestRecordsResolved(true);
    }, (error) => {
      if (!active) return;
      console.error('Error loading harvest records:', error);
      setHarvestRecordsResolved(true);
    });
    return () => {
      active = false;
      unsubPonds();
      unsubHarvest();
    };
  }, [companyId, user?.uid]);

  useEffect(() => {
    setCycles([]);
    setCyclesResolved(!companyId);
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
    if (!companyId || !user || !canEditHarvest || samplingSavingPondId || harvestSubmitLock.current) return;
    if (!isValidHarvestDate(formData.date, today)) {
      showAppAlert(copy('Choose a valid harvest date that is not in the future.'));
      return;
    }
    const mbw = Number(samplingMbwDrafts[pond.id]);
    if (!Number.isFinite(mbw) || mbw <= 0) {
      showAppAlert(t.harvest.samplingMbwRequired);
      return;
    }

    setSamplingSavingPondId(pond.id);
    try {
      const pondRef = doc(db, 'companies', companyId, 'ponds', pond.id);
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(pondRef);
        if (!snapshot.exists()) throw new HarvestSaveError('A selected pond is no longer available. Refresh the pond list before saving.');
        const serverPond = { id: snapshot.id, ...snapshot.data() } as Pond;
        if (getHarvestDateSampling(serverPond, formData.date)) return;
        transaction.update(pondRef, prepareHarvestWriteData({
          samplings: [
            ...(serverPond.samplings || []),
            buildHarvestDateSampling({
              id: `harvest-sampling-${Date.now()}`,
              date: formData.date,
              mbw,
              feedStatus: samplingFeedStatuses[pond.id] || 'not_recorded',
              cycleId: serverPond.cycleId,
              cycleName: serverPond.cycleName,
              pondCycleId: serverPond.pondCycleId || serverPond.id,
            }),
          ],
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        }));
      });
      setSamplingMbwDrafts((current) => ({ ...current, [pond.id]: '' }));
    } catch (error) {
      console.error('Error adding harvest-date sampling:', error);
      showAppAlert(getHarvestSaveError(error, t.harvestCycle.saveFailed, copy));
    } finally {
      setSamplingSavingPondId(null);
    }
  };

  const handleAddHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !formData.pondId || !user) return;
    if (!canEditHarvest || samplingSavingPondId || harvestSubmitLock.current) return;
    harvestSubmitLock.current = true;
    setIsSavingHarvest(true);

    try {
      const entries = (pendingHarvest.current?.operation?.records.flatMap((record) => record.ponds.map((pond) => ({ ...pond, date: record.date }))) || [...harvestBatch, formData]).map((entry) => ({
        ...entry,
        date: entry.date ?? formData.date,
        biomass: String(entry.biomass ?? '').trim(),
        size: String(entry.size ?? '').trim(),
        price: String(entry.price ?? '').trim(),
        subBiomass: String(entry.subBiomass ?? '').trim(),
        subSize: String(entry.subSize ?? '').trim(),
        subPrice: String(entry.subPrice ?? '').trim(),
      }));
      if (entries.some((entry) => !isValidHarvestDate(entry.date, today))) {
        throw new HarvestSaveError('Choose a valid harvest date that is not in the future.');
      }
      if (new Set(entries.map((entry) => entry.pondId)).size !== entries.length) {
        throw new HarvestSaveError('Each pond can appear only once in a harvest. Remove the duplicate pond before saving.');
      }
      if (entries.some((entry) => !entry.biomass?.trim() || !entry.size?.trim() || !entry.price?.trim()
        || getInvalidHarvestDraftLine(entry))) {
        throw new HarvestSaveError('Enter a positive biomass, size, and price for every harvest grade, including queued ponds.');
      }
      const selectedPonds = entries.map((entry) => formPonds.find((pond) => pond.id === entry.pondId));
      if (selectedPonds.some((pond) => !pond)) {
        throw new HarvestSaveError('A selected pond is no longer available. Refresh the pond list before saving.');
      }
      if (new Set(selectedPonds.map((pond) => pond!.cycleId).filter(Boolean)).size > 1) {
        throw new HarvestSaveError('All ponds in a harvest must belong to the same cycle.');
      }
      for (let index = 0; index < entries.length; index += 1) {
        const selectedPond = selectedPonds[index]!;
        const harvestSampling = getHarvestDateSampling(selectedPond, entries[index].date);
        if (!harvestSampling) {
          showAppAlert(t.harvest.samplingRequiredMessage
            .replace('{{pondName}}', selectedPond.pondName)
            .replace('{{date}}', entries[index].date));
          return;
        }
        if (
          (harvestSizeDiffersFromSampling(entries[index].size, harvestSampling)
            || harvestSizeDiffersFromSampling(entries[index].subSize, harvestSampling))
          && !(await confirmAppAction(t.harvest.sizeDifferenceMessage.replace('{{pondName}}', selectedPond.pondName)))
        ) return;
        const removal = calculateHarvestRemoval(entries[index]);
        const previousHarvestPond = editingRecord?.ponds.find((pond) => pond.pondId === entries[index].pondId);
        const estimatedBiomass = calculatePondMetricsWithHarvest(selectedPond).currentBiomass
          + (previousHarvestPond ? calculateHarvestRemoval(previousHarvestPond).biomass : 0);
        if (estimatedBiomass > 0 && removal.biomass > estimatedBiomass * 1.1 && !(await confirmAppAction(`${selectedPond.pondName}: recorded harvest (${removal.biomass.toFixed(1)} kg) is higher than estimated pond biomass (${estimatedBiomass.toFixed(1)} kg). This can happen when sampling underestimates stock or MBW. Continue saving?`))) return;
      }

      if (!pendingHarvest.current) {
        pendingHarvest.current = { id: doc(collection(db, 'companies', companyId, 'harvestRecords')).id };
      }
      if (!pendingHarvest.current.operation) {
        const records = groupHarvestEntriesByDate(entries, today).map((group, index) => {
          const firstPond = selectedPonds.find((pond) => pond!.id === group.entries[0].pondId)!;
          return {
            id: index === 0 ? pendingHarvest.current!.id : doc(collection(db, 'companies', companyId, 'harvestRecords')).id,
            date: group.date,
            cycleId: editingRecord?.cycleId || firstPond.cycleId || formCycle?.id,
            cycleName: editingRecord?.cycleName || firstPond.cycleName || formCycle?.cycleName,
            blockId: editingRecord?.blockId || firstPond.blockId || formCycle?.blockId,
            blockName: editingRecord?.blockName || firstPond.blockName || formCycle?.blockName || formCycle?.blockNames?.[0],
            ponds: group.entries.map((entry) => {
              const pond = selectedPonds.find((pond) => pond!.id === entry.pondId)!;
              return { ...entry, pondName: pond.pondName, cycleId: pond.cycleId || editingRecord?.cycleId || formCycle?.id,
                cycleName: pond.cycleName || editingRecord?.cycleName || formCycle?.cycleName,
                pondCycleId: pond.pondCycleId || pond.id, blockId: pond.blockId, blockName: pond.blockName };
            }),
          };
        });
        pendingHarvest.current.operation = createHarvestOperation<HarvestRecord>(pendingHarvest.current.id, records, editingRecord || undefined);
      }
      const { alreadySaved } = await commitHarvestOperation(db, pendingHarvest.current.operation, {
        companyId, user, timeZone: company?.timeZone,
      }, { runTransaction, doc, serverTimestamp });

      if (alreadySaved) {
        showAppAlert(copy('This harvest was already saved. Review it in the harvest list before making further changes.'));
      }
      pendingHarvest.current = null;
      setModalOpen(false);
      setEditingRecord(null);
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
      console.error('Error saving harvest record:', error);
      showAppAlert(getHarvestSaveError(error, t.harvestCycle.saveFailed, copy));
    } finally {
      harvestSubmitLock.current = false;
      setIsSavingHarvest(false);
    }
  };

  const changePondDate = (date: string) => {
    const pond = formPonds.find((pond) => pond.id === formData.pondId);
    const sampling = pond ? getHarvestDateSampling(pond, date) : undefined;
    const wasAutoFilled = autoFilledSizes.current[formData.pondId] === formData.size;
    const size = wasAutoFilled ? (sampling ? String(getSamplingSize(sampling)) : '') : formData.size;
    if (wasAutoFilled) autoFilledSizes.current[formData.pondId] = size;
    setFormData((current) => ({ ...current, date, size }));
    setSamplingMbwDrafts((current) => ({ ...current, [formData.pondId]: '' }));
    setSamplingFeedStatuses((current) => ({ ...current, [formData.pondId]: 'not_recorded' }));
  };

  const editQueuedPond = (entry: HarvestFormEntry) => {
    if (formData.pondId) {
      if (!formData.biomass || !formData.size || !formData.price || getInvalidHarvestDraftLine(formData)) {
        showAppAlert(copy('Complete this pond before adding another.'));
        return;
      }
    }
    setHarvestBatch((current) => [...current.filter((pond) => pond.pondId !== entry.pondId),
      ...(formData.pondId ? [{ ...formData }] : [])]);
    setFormData({ ...entry });
  };

  const addPondToBatch = () => {
    if (harvestSubmitLock.current) return;
    if (!formData.pondId || !formData.biomass || !formData.size || !formData.price) {
      showAppAlert(copy('Complete this pond before adding another.'));
      return;
    }
    const selectedPond = formPonds.find((pond) => pond.id === formData.pondId);
    if (!selectedPond || !getHarvestDateSampling(selectedPond, formData.date)) {
      showAppAlert(t.harvest.samplingRequired);
      return;
    }
    if (harvestBatch.some((entry) => entry.pondId === formData.pondId)) return;
    setHarvestBatch((current) => [...current, { ...formData }]);
    setFormData((current) => ({
      ...current,
      pondId: '', biomass: '', size: '', price: '', subBiomass: '', subSize: '', subPrice: '',
    }));
  };

  const closeHarvestModal = () => {
    if (harvestSubmitLock.current || samplingSavingPondId) return;
    pendingHarvest.current = null;
    autoFilledSizes.current = {};
    setModalOpen(false);
    setEditingRecord(null);
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
      subPrice: '',
    });
  };

  const openCreateHarvest = () => {
    if (harvestSubmitLock.current) return;
    pendingHarvest.current = null;
    autoFilledSizes.current = {};
    setEditingRecord(null);
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
      subPrice: '',
    });
    setModalOpen(true);
  };

  const openEditRecord = (record: HarvestRecord, pondId?: string) => {
    if (harvestSubmitLock.current) return;
    if (!canEditHarvest || !canModifyHarvestRecord(record.id)) return;
    pendingHarvest.current = null;
    autoFilledSizes.current = {};
    const targetPond = record.ponds.find((pond) => pond.pondId === pondId) || record.ponds[record.ponds.length - 1];
    const orderedPonds = targetPond
      ? [...record.ponds.filter((pond) => pond.pondId !== targetPond.pondId), targetPond]
      : record.ponds;
    const entries: HarvestFormEntry[] = orderedPonds.map((pond) => ({
      date: record.date,
      pondId: pond.pondId,
      cycleId: pond.cycleId,
      cycleName: pond.cycleName,
      pondCycleId: pond.pondCycleId,
      blockId: pond.blockId,
      blockName: pond.blockName,
      harvestType: pond.harvestType || 'partial',
      partialHarvestNumber: pond.partialHarvestNumber,
      harvestReferenceSamplingId: pond.harvestReferenceSamplingId,
      harvestReferenceSamplingDate: pond.harvestReferenceSamplingDate,
      harvestReferenceMbw: pond.harvestReferenceMbw,
      biomass: pond.biomass || '',
      size: pond.size || '',
      price: pond.price || '',
      subBiomass: pond.subBiomass || '',
      subSize: pond.subSize || '',
      subPrice: pond.subPrice || '',
    }));
    if (entries.length === 0) return;
    setEditingRecord(record);
    setHarvestBatch(entries.slice(0, -1));
    setFormData(entries[entries.length - 1]);
    setModalOpen(true);
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (harvestSubmitLock.current) return;
    if (!companyId || !user || !(await confirmAppAction('Void this harvest? Pond totals will be reversed and the sale excluded from profit reports. The original records and confirmed payments are retained; record any refund separately in Finance.'))) return;
    if (!canEditHarvest) return;
    const localRecord = harvestRecords.find((record) => record.id === recordId);
    if (
      company?.businessSize === 'enterprise'
      && user.role === 'technician'
      && (!localRecord || !localRecord.ponds.every((pond) => accessiblePondIds.has(pond.pondId)))
    ) return;
    harvestSubmitLock.current = true;
    setIsSavingHarvest(true);
    try {
      const harvestRef = doc(db, 'companies', companyId, 'harvestRecords', recordId);
      await runTransaction(db, async (transaction) => {
        const harvestSnapshot = await transaction.get(harvestRef);
        if (!harvestSnapshot.exists() || harvestSnapshot.data().voided) return;
        const record = { id: harvestSnapshot.id, ...harvestSnapshot.data() } as HarvestRecord;
        const uniquePondIds = Array.from(new Set(record.ponds.map((pond) => pond.pondId)));
        const pondRefs = uniquePondIds.map((pondId) => doc(db, 'companies', companyId, 'ponds', pondId));
        const pondSnapshots = await Promise.all(pondRefs.map((pondRef) => transaction.get(pondRef)));
        const pondSnapshotsById = new Map(pondSnapshots.map((snapshot) => [snapshot.id, snapshot]));

        if (pondSnapshots.some((snapshot) => !snapshot.exists())) {
          throw new HarvestSaveError('A selected pond is no longer available. Refresh the pond list before saving.');
        }
        record.ponds.forEach((harvestPond) => {
          const pondSnapshot = pondSnapshotsById.get(harvestPond.pondId);
          if (!pondSnapshot?.exists()) return;
          const pond = { id: pondSnapshot.id, ...pondSnapshot.data() } as Pond;
          const updatedPond = reverseHarvestImpactOnPond(pond, harvestPond, record.date);
          transaction.update(pondSnapshot.ref, prepareHarvestWriteData({
            finalHarvestDates: updatedPond.finalHarvestDates || [],
            totalHarvestedBiomass: updatedPond.totalHarvestedBiomass,
            totalHarvestedPopulation: updatedPond.totalHarvestedPopulation,
            postHarvestRemainingBiomass: updatedPond.postHarvestRemainingBiomass ?? null,
            postHarvestRemainingPopulation: updatedPond.postHarvestRemainingPopulation ?? null,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
          }));
        });
        const revenue = buildHarvestRevenue(record);
        const revenueId = financeSyncDocumentId(revenue.reference);
        transaction.update(harvestRef, prepareHarvestWriteData({ voided: true, voidedAt: serverTimestamp(), voidedBy: user.uid, financeEntry: { ...financeSourceEntry(revenue), id: revenueId, voided: true } }));
        transaction.set(doc(db, 'companies', companyId, 'revenues', revenueId), prepareHarvestWriteData({ ...revenue, companyId, addedBy: user.uid, timestamp: Date.now(), voided: true, voidedAt: serverTimestamp(), voidedBy: user.uid }), { merge: true });
      });
    } catch (error) {
      console.error('Error deleting record:', error);
      showAppAlert(getHarvestSaveError(error, t.harvestCycle.saveFailed, copy));
    } finally {
      harvestSubmitLock.current = false;
      setIsSavingHarvest(false);
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
      return total + buildHarvestRevenue(record).amount;
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
            onClick={openCreateHarvest}
            style={selectedCyclePonds.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button aria-label={`${t.actions.edit} ${t.harvest.harvest}`} onClick={() => openEditRecord(record)} style={{ background: '#EAF6FD', border: '1px solid #BBE1FA', borderRadius: '8px', color: '#0F4C75', padding: '7px', cursor: 'pointer' }}><Pencil size={17} /></button>
                      <button aria-label={`${t.actions.delete} ${t.harvest.harvest}`} onClick={() => handleDeleteRecord(record.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', opacity: 0.5, cursor: 'pointer', padding: '7px' }}><Trash2 size={18} /></button>
                    </div>
                  ) : null}
                </div>

                <div className="responsive-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                  {record.ponds.map((p, idx) => (
                    <div
                      key={idx}
                      role={canEditHarvest && canModifyHarvestRecord(record.id) ? 'button' : undefined}
                      tabIndex={canEditHarvest && canModifyHarvestRecord(record.id) ? 0 : undefined}
                      onClick={canEditHarvest && canModifyHarvestRecord(record.id) ? () => openEditRecord(record, p.pondId) : undefined}
                      onKeyDown={canEditHarvest && canModifyHarvestRecord(record.id) ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') openEditRecord(record, p.pondId);
                      } : undefined}
                      style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-mid)', cursor: canEditHarvest && canModifyHarvestRecord(record.id) ? 'pointer' : 'default' }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>{p.pondName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        <span style={{ display: 'inline-flex', padding: '4px 9px', borderRadius: '999px', background: '#BBE1FA', color: '#0F4C75', fontSize: '11px', fontWeight: 600 }}>
                          {getHarvestTypeLabel(p)}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                          DOC {getHarvestDoc(ponds.find(pond => pond.id === p.pondId
                            && (!(p.cycleId || record.cycleId) || pond.cycleId === (p.cycleId || record.cycleId))
                            && (!p.pondCycleId || pond.pondCycleId === p.pondCycleId)), record.date, company?.timeZone) ?? '—'}
                        </span>
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
                            {formatCurrency(buildHarvestRevenue({ ...record, ponds: [p] }).amount)}
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
                <h2 className={styles.harvestTitle} style={{ fontSize: '20px', fontWeight: 600 }}>
                  {editingRecord ? `${t.actions.edit} ${t.harvest.harvest}` : t.harvestCycle.logHarvest}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>{t.harvest.recordHarvestDescription}</p>
              </div>
              <button className={styles.closeButton} disabled={isSavingHarvest || samplingSavingPondId !== null} aria-label={copy('Close')} onClick={closeHarvestModal} style={{ border: 'none', padding: '8px', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form className={`responsive-modal-body ${styles.harvestForm}`} onSubmit={handleAddHarvest}>
              <fieldset className={styles.harvestFormScroll} disabled={isSavingHarvest || samplingSavingPondId !== null} style={{ border: 0, margin: 0, minWidth: 0 }}>
              <div className={styles.cycleSummary} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '12px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600 }}>{editingRecord?.cycleName || formCycle?.cycleName}</div>
                  <div style={{ marginTop: '3px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>{editingRecord?.blockName || formCycle?.blockName || formCycle?.blockNames?.[0] || formPonds[0]?.blockName || t.harvestCycle.blockNotAssigned}</div>
                </div>
                <div style={{ flexShrink: 0, alignSelf: 'center', padding: '7px 10px', borderRadius: '999px', background: '#EAF6FD', color: '#0F4C75', fontSize: '11px', fontWeight: 600 }}>
                  {formPonds.length} {t.harvest.pond}
                </div>
              </div>
              <div className={`responsive-form-grid ${styles.harvestGrid}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className={styles.dateField} style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
                  <label htmlFor="pond-harvest-date" style={{ fontSize: '13px', fontWeight: 600 }}>{t.harvestCycle.harvestDate}{selectedFormPond && <span style={{ fontWeight: 400 }}> · {selectedFormPond.pondName}</span>}</label>
                  <input
                    id="pond-harvest-date"
                    type="date"
                    required
                    max={today}
                    value={formData.date}
                    onChange={(event) => changePondDate(event.target.value)}
                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }}
                  />
                </div>

                {missingSamplingPonds.length > 0 && (
                  <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', borderRadius: '10px', border: '1px solid #F1C27D', background: '#FFF8EA' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', color: '#8A5700', fontSize: '12px', fontWeight: 700 }}>
                      <span>{t.harvest.samplingRequired}</span>
                      <span>{formData.date}</span>
                    </div>
                    {missingSamplingPonds.map((pond) => (
                      <div key={pond.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '6px', alignItems: 'end' }}>
                        <div style={{ minHeight: '36px', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 600 }}>{pond.pondName}</div>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#6B4B16', fontSize: '11px', fontWeight: 600 }}>
                          {t.harvest.samplingMbw}
                          <input
                            min="0.01"
                            step="0.01"
                            type="number"
                            value={samplingMbwDrafts[pond.id] || ''}
                            onChange={(event) => setSamplingMbwDrafts((current) => ({ ...current, [pond.id]: event.target.value }))}
                            style={{ minWidth: 0, minHeight: '36px', padding: '7px 9px', borderRadius: '7px', border: '1px solid #D7B36F', background: '#FFF' }}
                          />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#6B4B16', fontSize: '11px', fontWeight: 600 }}>
                          {t.harvest.feedStatusLabel}
                          <select
                            value={samplingFeedStatuses[pond.id] || 'not_recorded'}
                            onChange={(event) => setSamplingFeedStatuses((current) => ({ ...current, [pond.id]: event.target.value as HarvestDayFeedStatus }))}
                            style={{ minWidth: 0, minHeight: '36px', padding: '7px', borderRadius: '7px', border: '1px solid #D7B36F', background: '#FFF' }}
                          >
                            <option value="not_recorded">{t.harvest.enterFeedLater}</option>
                            <option value="fasted">{t.harvest.fasted}</option>
                          </select>
                        </label>
                        <button
                          type="button"
                          disabled={samplingSavingPondId !== null}
                          onClick={() => saveRequiredSampling(pond)}
                          style={{ minHeight: '36px', padding: '0 10px', border: 0, borderRadius: '7px', background: '#0F4C75', color: '#FFF', fontSize: '12px', fontWeight: 600, cursor: samplingSavingPondId ? 'wait' : 'pointer', opacity: samplingSavingPondId && samplingSavingPondId !== pond.id ? 0.55 : 1 }}
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
                    disabled={Boolean(editingRecord)}
                    value={formData.pondId}
                    onChange={(event) => {
                      const pond = formPonds.find((item) => item.id === event.target.value);
                      const sampling = pond ? getHarvestDateSampling(pond, formData.date) : undefined;
                      if (pond && sampling) autoFilledSizes.current[pond.id] = String(getSamplingSize(sampling));
                      setFormData({
                        ...formData,
                        pondId: event.target.value,
                        size: sampling ? String(getSamplingSize(sampling)) : '',
                      });
                    }}
                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none' }}
                  >
                    <option value="">{t.harvestCycle.choosePond}</option>
                    {formPonds
                      .filter((pond) => !harvestBatch.some((entry) => entry.pondId === pond.id))
                      .map((pond) => {
                        const ready = Boolean(getHarvestDateSampling(pond, formData.date));
                        return <option key={pond.id} value={pond.id}>{pond.pondName}{ready ? '' : ` — ${t.harvest.samplingRequired}`}</option>;
                      })}
                  </select>
                </div>

                {harvestBatch.length > 0 && (
                  <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {harvestBatch.map((entry) => (
                      <div key={entry.pondId} className={styles.queuedPond}>
                        <div className={styles.queuedPondCopy}><strong>{formPonds.find((pond) => pond.id === entry.pondId)?.pondName} · {entry.biomass} kg</strong><span>{entry.date}</span></div>
                        <button type="button" className={styles.queuedEdit} onClick={() => editQueuedPond(entry)} aria-label={`${t.actions.edit} ${formPonds.find((pond) => pond.id === entry.pondId)?.pondName}`}>{t.actions.edit}</button>
                        {!editingRecord && <button type="button" onClick={() => setHarvestBatch((current) => current.filter((item) => item.pondId !== entry.pondId))} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#e74c3c' }} aria-label={copy('Remove pond from harvest batch')}><Trash2 size={16} /></button>}
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
                  <input required min="0.01" step="0.01" type="number" value={formData.size} onChange={e => { delete autoFilledSizes.current[formData.pondId]; setFormData({...formData, size: e.target.value}); }} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
                </div>

                <div className={styles.metricsPanel} style={{ display: 'flex', flexDirection: 'column', gap: '12px', gridColumn: 'span 2', padding: '14px', background: 'var(--bg-mid)', borderRadius: '16px' }}>
                  <div className={`responsive-two-column ${styles.primaryMetrics}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>{t.harvestCycle.mainBiomass}</label>
                      <input required min="0.01" type="number" step="0.01" value={formData.biomass} onChange={e => setFormData({...formData, biomass: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#FFF' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>{t.harvestCycle.mainPrice.replace('{{currency}}', currencyConfig.symbol)}</label>
                      <input required min="0.01" step="0.01" type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#FFF' }} />
                    </div>
                  </div>

                  <div style={{ height: '1px', background: 'var(--border)' }} />

                  <div className={`responsive-card-grid ${styles.secondaryMetrics}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-faint)' }}>{t.harvestCycle.subBiomass}</label>
                      <input required={Boolean(formData.subSize || formData.subPrice)} min="0.01" type="number" step="0.01" value={formData.subBiomass} onChange={e => setFormData({...formData, subBiomass: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#FFF' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-faint)' }}>{t.harvestCycle.subSize}</label>
                      <input required={Boolean(formData.subBiomass || formData.subPrice)} min="0.01" step="0.01" type="number" value={formData.subSize} onChange={e => setFormData({...formData, subSize: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#FFF' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-faint)' }}>{t.harvestCycle.subPrice.replace('{{currency}}', currencyConfig.symbol)}</label>
                      <input required={Boolean(formData.subBiomass || formData.subSize)} min="0.01" step="0.01" type="number" value={formData.subPrice} onChange={e => setFormData({...formData, subPrice: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#FFF' }} />
                    </div>
                  </div>
                </div>
                {!editingRecord && formPonds.length > harvestBatch.length + 1 && (
                  <button type="button" onClick={addPondToBatch} style={{ gridColumn: 'span 2', minHeight: '40px', borderRadius: '10px', border: '1px solid #0F4C75', color: '#0F4C75', background: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}>
                    <Plus size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> {copy('Add another pond to this harvest')}
                  </button>
                )}
              </div>
              </fieldset>

              <div className={`responsive-modal-footer ${styles.harvestFooter}`} style={{ display: 'flex', gap: '10px' }}>
                <button type="button" disabled={isSavingHarvest || samplingSavingPondId !== null} onClick={closeHarvestModal} style={{ flex: 1, minHeight: '40px', padding: '0 12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }}>{t.actions.cancel}</button>
                <button type="submit" disabled={isSavingHarvest || samplingSavingPondId !== null} aria-busy={isSavingHarvest} className={`btn-primary ${styles.saveButton}`} style={{ flex: 1, minHeight: '40px', padding: '0 12px', borderRadius: '12px', fontWeight: 600 }}>{isSavingHarvest ? copy('Saving harvest…') : `${t.actions.save} ${t.harvest.harvest}`}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

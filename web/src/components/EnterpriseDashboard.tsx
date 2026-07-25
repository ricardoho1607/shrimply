"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Lock, Maximize2, Play, Plus, Save, X } from 'lucide-react';
import { addDoc, collection, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  useCompanyBlocks,
  useCompanyCycles,
  useCompanyHarvestRecords,
  useCompanyMembers,
  useCompanyPhysicalPonds,
} from '@/hooks/useDashboardData';
import {
  getEnterpriseTechnicianLabel,
  getEnterprisePondStatus,
  sortFarmBlocks,
  type EnterprisePond,
  type EnterprisePondRisk,
  type FarmBlock,
} from '../../../shared/enterpriseBlocks';
import styles from './EnterpriseDashboard.module.css';
import EnterpriseHealthDisplay from './EnterpriseHealthDisplay';
import ProfileCompletionCard from './ProfileCompletionCard';
import StartPondCycleModal from './StartPondCycleModal';
import { getFarmDateKey } from '../../../shared/farmDate';
import { hasFinalHarvestForPondCycle } from '../../../shared/harvestCalculations';
import {
  StartPondCycleError,
  startPondCycle,
  type StartPondCycleFormValue,
} from '@/lib/startPondCycle';

interface EnterpriseDashboardProps {
  ponds: EnterprisePond[];
  timeZone?: string;
}

interface FarmCycle {
  id: string;
  cycleName: string;
  status: 'planning' | 'stocking' | 'active' | 'closing' | 'closed';
  plannedStartDate?: string;
  stockingStartDate?: string;
  stockingEndDate?: string;
  closedAt?: string;
  createdAt?: unknown;
  createdBy?: string;
}

interface PhysicalPond {
  id: string;
  pondName: string;
  pondArea: number;
  blockId?: string | null;
  blockName?: string | null;
  status?: 'idle' | 'active';
  activePondId?: string | null;
}

interface HarvestRecord {
  id: string;
  cycleId?: string | null;
  ponds: Array<{
    pondId: string;
    cycleId?: string | null;
    pondCycleId?: string | null;
    harvestType?: 'partial' | 'final';
  }>;
}

type EnterpriseCycleFilter = 'active' | 'inactive' | 'ended';
type EnterpriseDashboardRecord = EnterprisePond | PhysicalPond;

interface EnterpriseGroupedPondGridProps {
  ponds: EnterprisePond[];
  onSelect: (pond: EnterprisePond) => void;
  getTone?: (pond: EnterprisePond) => EnterprisePondRisk | 'neutral';
  getSubtitle?: (pond: EnterprisePond) => string | undefined;
  emptyMessage: string;
}

interface CompanyMember {
  id: string;
  uid?: string;
  name?: string;
  email?: string;
  role?: string;
}

const riskClass: Record<EnterprisePondRisk, string> = {
  stable: styles.stable,
  warning: styles.warning,
  'high-risk': styles.highRisk,
};

export default function EnterpriseDashboard({ ponds, timeZone }: EnterpriseDashboardProps) {
  const router = useRouter();
  const { user, company } = useAuth();
  const { t } = useLanguage();
  const { data: blocks, loading, error } = useCompanyBlocks<FarmBlock>('asc');
  const { data: members } = useCompanyMembers<CompanyMember>();
  const { data: cycles } = useCompanyCycles<FarmCycle>('asc');
  const { data: physicalPonds } = useCompanyPhysicalPonds<PhysicalPond>('asc');
  const { data: harvestRecords } = useCompanyHarvestRecords<HarvestRecord>('desc');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPond, setSelectedPond] = useState<EnterprisePond | null>(null);
  const [blockName, setBlockName] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [assignmentBlock, setAssignmentBlock] = useState<FarmBlock | null>(null);
  const [assignmentTechnicianId, setAssignmentTechnicianId] = useState('');
  const [saving, setSaving] = useState(false);
  const [cycleSaving, setCycleSaving] = useState(false);
  const [cycleFilter, setCycleFilter] = useState<EnterpriseCycleFilter>('active');
  const [cycleManagerExpanded, setCycleManagerExpanded] = useState(false);
  const [startCyclePond, setStartCyclePond] = useState<EnterpriseDashboardRecord | null>(null);
  const [startingPondCycle, setStartingPondCycle] = useState(false);
  const [officeDisplayOpen, setOfficeDisplayOpen] = useState(false);
  const activeFarmCycle = useMemo(() => cycles.find((cycle) => (
    ['planning', 'stocking', 'active'].includes(cycle.status)
  )), [cycles]);
  const [cycleNameDraft, setCycleNameDraft] = useState('');

  React.useEffect(() => {
    queueMicrotask(() => setCycleNameDraft(activeFarmCycle?.cycleName || ''));
  }, [activeFarmCycle?.cycleName, activeFarmCycle?.id]);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setOfficeDisplayOpen(false);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  React.useEffect(() => {
    if (!officeDisplayOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [officeDisplayOpen]);

  const technicians = useMemo(() => members
    .filter((member) => member.role === 'technician')
    .map((member) => ({
      id: member.id,
      uid: member.id,
      name: member.name?.trim() || '',
      email: member.email || '',
    }))
    .sort((first, second) => getEnterpriseTechnicianLabel(first.name, first.email, '')
      .localeCompare(getEnterpriseTechnicianLabel(second.name, second.email, ''))), [members]);
  const currentCyclePonds = useMemo(() => {
    const activePondRecords = ponds.filter((pond) => pond.cycleStatus !== 'ended');
    if (!activeFarmCycle) return activePondRecords;
    return ponds.filter((pond) => (
      pond.cycleId === activeFarmCycle.id
      || (!pond.cycleId && pond.cycleStatus !== 'ended')
    ));
  }, [activeFarmCycle, ponds]);
  const activeFarmCyclePonds = useMemo(
    () => currentCyclePonds.filter((pond) => pond.cycleStatus !== 'ended'),
    [currentCyclePonds],
  );
  const activePonds = useMemo(
    () => ponds.filter((pond) => pond.cycleStatus !== 'ended'),
    [ponds],
  );
  const endedPonds = useMemo(() => ponds.filter((pond) => pond.cycleStatus === 'ended'), [ponds]);
  const inactivePonds = useMemo<EnterpriseDashboardRecord[]>(() => {
    const normalizePondName = (pondName: string) => pondName.trim().toLowerCase();
    const activePondNames = new Set(activePonds.map((pond) => normalizePondName(pond.pondName)));
    return physicalPonds.filter((pond) => (
      pond.status !== 'active'
      && !pond.activePondId
      && !activePondNames.has(normalizePondName(pond.pondName))
    ));
  }, [activePonds, physicalPonds]);
  const displayedRecords = useMemo<EnterpriseDashboardRecord[]>(() => {
    if (cycleFilter === 'inactive') return inactivePonds;
    if (cycleFilter === 'ended') return endedPonds;
    return activePonds;
  }, [activePonds, cycleFilter, endedPonds, inactivePonds]);
  const statusByPond = useMemo(() => new Map(ponds.map((pond) => [
    pond.id,
    getEnterprisePondStatus(pond, timeZone),
  ])), [ponds, timeZone]);
  const unassignedPonds = useMemo(() => displayedRecords.filter((pond) => !pond.blockId), [displayedRecords]);
  const sortedBlocks = useMemo(() => [
    ...sortFarmBlocks(blocks),
    ...(unassignedPonds.length > 0 ? [{ id: '__unassigned__', companyId: company?.id || '', name: t.enterprise.unassignedPonds }] : []),
  ], [blocks, company?.id, t.enterprise.unassignedPonds, unassignedPonds.length]);
  const selectedStatus = selectedPond ? statusByPond.get(selectedPond.id) : undefined;

  const riskCounts = useMemo(() => activePonds.reduce((counts, pond) => {
    counts[statusByPond.get(pond.id)?.risk || 'stable'] += 1;
    return counts;
  }, { stable: 0, warning: 0, 'high-risk': 0 } as Record<EnterprisePondRisk, number>), [activePonds, statusByPond]);

  const pondsForBlock = (blockId: string) => blockId === '__unassigned__'
    ? unassignedPonds
    : displayedRecords.filter((pond) => pond.blockId === blockId);

  const getBlockCycleMeta = (blockId: string) => {
    const matchesBlock = (pond: { blockId?: string | null }) => (
      blockId === '__unassigned__' ? !pond.blockId : pond.blockId === blockId
    );
    return [
      `${t.farmCycle.filterActive} ${activePonds.filter(matchesBlock).length}`,
      `${t.farmCycle.filterInactive} ${inactivePonds.filter(matchesBlock).length}`,
      `${t.farmCycle.filterEnded} ${endedPonds.filter(matchesBlock).length}`,
    ].join(' • ');
  };

  const openPondCycleForm = (pond: EnterpriseDashboardRecord) => {
    if (!activeFarmCycle) {
      setCycleManagerExpanded(true);
      alert(t.enterprise.ownerMustStartCycle);
      return;
    }
    setStartCyclePond(pond);
  };

  const handleStartPondCycle = async (form: StartPondCycleFormValue) => {
    if (!company?.id || !user?.uid || !activeFarmCycle || !startCyclePond) return;

    setStartingPondCycle(true);
    try {
      await startPondCycle({
        companyId: company.id,
        userId: user.uid,
        pond: startCyclePond,
        pondType: 'cycleStatus' in startCyclePond ? 'cycle' : 'physical',
        activeCycle: activeFarmCycle,
        form,
        today: getFarmDateKey(new Date(), timeZone),
        activePonds: ponds,
      });
      setStartCyclePond(null);
      setCycleFilter('active');
    } catch (startError) {
      console.error('Failed to start enterprise pond cycle:', startError);
      const errorCode = startError instanceof StartPondCycleError ? startError.code : 'failed';
      alert(t.startPondCycle.errors[errorCode]);
    } finally {
      setStartingPondCycle(false);
    }
  };

  const startFarmCycle = async () => {
    if (!company?.id || !user?.uid || activeFarmCycle || cycleSaving) return;
    setCycleSaving(true);
    try {
      const today = getFarmDateKey(new Date(), timeZone);
      await addDoc(collection(db, 'companies', company.id, 'cycles'), {
        cycleName: `Cycle ${cycles.length + 1}`,
        status: 'stocking',
        plannedStartDate: today,
        stockingStartDate: today,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
    } catch (cycleError) {
      console.error('Failed to start enterprise farm cycle:', cycleError);
      alert(t.farmCycle.cycleStartFailed);
    } finally {
      setCycleSaving(false);
    }
  };

  const renameFarmCycle = async () => {
    const nextName = cycleNameDraft.trim();
    if (!company?.id || !user?.uid || !activeFarmCycle || !nextName || cycleSaving) return;
    setCycleSaving(true);
    try {
      for (let index = 0; index < currentCyclePonds.length; index += 400) {
        const batch = writeBatch(db);
        currentCyclePonds.slice(index, index + 400).forEach((pond) => {
          batch.update(doc(db, 'companies', company.id, 'ponds', pond.id), {
            cycleName: nextName,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
          });
        });
        await batch.commit();
      }
      await updateDoc(doc(db, 'companies', company.id, 'cycles', activeFarmCycle.id), {
        cycleName: nextName,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
    } catch (cycleError) {
      console.error('Failed to rename enterprise farm cycle:', cycleError);
      alert(t.farmCycle.cycleUpdateFailed);
    } finally {
      setCycleSaving(false);
    }
  };

  const closeFarmCycle = async () => {
    if (!company?.id || !user?.uid || !activeFarmCycle || cycleSaving) return;
    const missingFinalHarvestPonds = activeFarmCyclePonds.filter((pond) => (
      !hasFinalHarvestForPondCycle(harvestRecords, pond)
    ));
    if (missingFinalHarvestPonds.length > 0) {
      alert(t.farmCycle.finalHarvestRequiredMessage.replace(
        '{{pondNames}}',
        missingFinalHarvestPonds.map((pond) => pond.pondName).join(', '),
      ));
      return;
    }
    if (!window.confirm(t.farmCycle.endFarmCycleMessage
      .replace('{{cycleName}}', activeFarmCycle.cycleName)
      .replace('{{pondCount}}', String(currentCyclePonds.length)))) return;

    setCycleSaving(true);
    try {
      const today = getFarmDateKey(new Date(), timeZone);
      const activePondIds = new Set(activeFarmCyclePonds.map((pond) => pond.id));
      const activePondNames = new Set(activeFarmCyclePonds.map((pond) => pond.pondName.trim().toLowerCase()));
      const lifecycleUpdates: Array<{
        ref: ReturnType<typeof doc>;
        data: Record<string, unknown>;
      }> = [];
      activeFarmCyclePonds.forEach((pond) => {
        lifecycleUpdates.push({ ref: doc(db, 'companies', company.id, 'ponds', pond.id), data: {
          cycleStatus: 'ended',
          cycleEndedAt: today,
          cycleEndReason: 'harvested',
          cycleEndedBy: user.uid,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        } });
      });
      physicalPonds
        .filter((pond) => (
          (pond.activePondId && activePondIds.has(pond.activePondId))
          || (pond.status === 'active' && activePondNames.has(pond.pondName.trim().toLowerCase()))
        ))
        .forEach((pond) => {
          lifecycleUpdates.push({ ref: doc(db, 'companies', company.id, 'physicalPonds', pond.id), data: {
            status: 'idle',
            activePondId: null,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
          } });
        });
      for (let index = 0; index < lifecycleUpdates.length; index += 400) {
        const batch = writeBatch(db);
        lifecycleUpdates.slice(index, index + 400).forEach((update) => {
          batch.update(update.ref, update.data);
        });
        await batch.commit();
      }
      await updateDoc(doc(db, 'companies', company.id, 'cycles', activeFarmCycle.id), {
        status: 'closed',
        closedAt: today,
        stockingEndDate: activeFarmCycle.stockingEndDate || today,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      setCycleFilter('ended');
      const openReport = window.confirm(
        `${t.farmCycle.endFarmCycleSuccess.replace('{{cycleName}}', activeFarmCycle.cycleName)}\n\n${t.farmCycle.viewCycleReport}`,
      );
      if (openReport) router.push(`/dashboard/reports/cycles?cycleId=${encodeURIComponent(activeFarmCycle.id)}`);
    } catch (cycleError) {
      console.error('Failed to close enterprise farm cycle:', cycleError);
      alert(t.farmCycle.endCycleFailed);
    } finally {
      setCycleSaving(false);
    }
  };

  const saveBlock = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = blockName.trim();
    if (!company?.id || !user?.uid || !name || saving) return;
    if (blocks.some((block) => block.name.trim().toLowerCase() === name.toLowerCase())) {
      alert(t.enterprise.blockNameRequired);
      return;
    }
    const technician = technicians.find((candidate) => candidate.uid === technicianId);
    setSaving(true);
    try {
      await addDoc(collection(db, 'companies', company.id, 'blocks'), {
        companyId: company.id,
        name,
        assignedTechnicianId: technician?.uid || null,
        assignedTechnicianName: technician?.name.trim() || null,
        assignedTechnicianEmail: technician?.email || null,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      setBlockName('');
      setTechnicianId('');
      setCreateOpen(false);
    } catch (createError) {
      console.error('Failed to create enterprise block:', createError);
      alert(t.enterprise.blockCreateFailed);
    } finally {
      setSaving(false);
    }
  };

  const saveAssignment = async (event: React.FormEvent) => {
    event.preventDefault();
    const block = blocks.find((candidate) => candidate.id === assignmentBlock?.id);
    const technician = technicians.find((candidate) => candidate.uid === assignmentTechnicianId);
    if (!company?.id || !user?.uid || !block || block.assignedTechnicianId || !technician || saving) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'companies', company.id, 'blocks', block.id), {
        assignedTechnicianId: technician.uid,
        assignedTechnicianName: technician.name.trim() || null,
        assignedTechnicianEmail: technician.email,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      setAssignmentBlock(null);
      setAssignmentTechnicianId('');
    } catch (assignmentError) {
      console.error('Failed to assign enterprise block technician:', assignmentError);
      alert(t.enterprise.blockAssignmentFailed);
    } finally {
      setSaving(false);
    }
  };

  const enterOfficeDisplay = () => {
    setOfficeDisplayOpen(true);
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => {
        // Keep the fixed display open when browser fullscreen is unavailable.
      });
    }
  };

  const exitOfficeDisplay = () => {
    setOfficeDisplayOpen(false);
    window.requestAnimationFrame(() => {
      if (!document.fullscreenElement) return;
      void document.exitFullscreen().catch(() => {
        // The display is already hidden, even if the browser rejects this request.
      });
    });
  };

  return (
    <div className={styles.page}>
      {officeDisplayOpen ? (
        <EnterpriseHealthDisplay
          blocks={blocks}
          ponds={activePonds}
          companyId={company?.id}
          companyName={company?.companyName}
          timeZone={timeZone}
          onExit={exitOfficeDisplay}
        />
      ) : null}
      <ProfileCompletionCard company={company} />
      <section className={`${styles.cycleCard} ${!cycleManagerExpanded ? styles.cycleCardCollapsed : ''}`}>
        <button
          type="button"
          className={styles.cycleCardHeader}
          onClick={() => setCycleManagerExpanded((expandedState) => !expandedState)}
          aria-expanded={cycleManagerExpanded}
        >
          <span className={styles.cycleHeaderLeft}>
            {cycleManagerExpanded ? (
              <>
                <span className={styles.eyebrow}>{t.farmCycle.currentCycle}</span>
                <strong className={styles.cycleTitle}>
                  {activeFarmCycle?.cycleName || t.farmCycle.noActiveCycle}
                </strong>
                <span className={styles.cycleMeta}>
                  {activeFarmCycle
                    ? t.farmCycle.cycleMeta
                      .replace('{{pondCount}}', String(currentCyclePonds.length))
                      .replace('{{activeCount}}', String(activeFarmCyclePonds.length))
                    : t.farmCycle.addPondToCreateCycle.replace('{{cycleNumber}}', String(cycles.length + 1))}
                </span>
              </>
            ) : (
              <span className={styles.cycleCollapsedContent}>
                <i className={`${styles.cycleStatusDot} ${!activeFarmCycle ? styles.cycleStatusDotMuted : ''}`} />
                <strong className={styles.cycleCollapsedTitle}>
                  {activeFarmCycle?.cycleName || t.farmCycle.noActiveCycle}
                </strong>
                <span className={styles.cycleCollapsedMeta}>
                  {activeFarmCycle
                    ? `${t.enterprise.pondCount.replace('{{count}}', String(currentCyclePonds.length))} | ${activeFarmCycle.status.toUpperCase()}`
                    : t.farmCycle.addPondToCreateCycle.replace('{{cycleNumber}}', String(cycles.length + 1))}
                </span>
              </span>
            )}
          </span>
          <span className={styles.cycleHeaderRight}>
            {cycleManagerExpanded ? (
              <span className={`${styles.cycleStatus} ${!activeFarmCycle ? styles.cycleStatusMuted : ''}`}>
                {activeFarmCycle?.status || t.farmCycle.status.waiting}
              </span>
            ) : null}
            {cycleManagerExpanded ? <ChevronUp size={20} /> : <ChevronDown size={18} />}
          </span>
        </button>
        {cycleManagerExpanded && activeFarmCycle ? (
          <>
            <div className={styles.cycleStats}>
              <span>
                <b>{currentCyclePonds.length}</b>
                <small>{t.enterprise.pondCount.replace('{{count}}', '').trim()}</small>
              </span>
              <span><b>{activeFarmCycle.stockingStartDate || activeFarmCycle.plannedStartDate || '-'}</b><small>{t.farmCycle.stockingStart}</small></span>
            </div>
            <div className={styles.cycleActions}>
              <input
                value={cycleNameDraft}
                onChange={(event) => setCycleNameDraft(event.target.value)}
                placeholder={t.farmCycle.cycleName}
              />
              <button type="button" onClick={renameFarmCycle} disabled={cycleSaving || !cycleNameDraft.trim()}>
                <Save size={15} /> {t.farmCycle.rename}
              </button>
            </div>
            <div className={styles.cyclePondList}>
              {currentCyclePonds.slice(0, 4).map((pond) => (
                <span key={pond.id} className={pond.cycleStatus === 'ended' ? styles.cyclePondChipEnded : ''}>
                  {pond.pondName}
                </span>
              ))}
              {currentCyclePonds.length > 4 ? <span>+{currentCyclePonds.length - 4} more</span> : null}
            </div>
            <button type="button" className={styles.endCycleButton} onClick={closeFarmCycle} disabled={cycleSaving}>
              <Lock size={15} /> {t.farmCycle.endCycleAction}
            </button>
          </>
        ) : cycleManagerExpanded ? (
          <button type="button" className={styles.addButton} onClick={startFarmCycle} disabled={cycleSaving}>
            <Play size={17} /> {t.farmCycle.startFarmCycle}
          </button>
        ) : null}
      </section>

      <header className={styles.blockSectionHeader}>
        <div>
          <h1>{t.enterprise.title}</h1>
          <p>{t.enterprise.summary
            .replace('{{blockCount}}', String(blocks.length))
            .replace('{{pondCount}}', String(activePonds.length))}</p>
        </div>
        <div className={styles.blockHeaderActions}>
          <button type="button" className={styles.displayButton} onClick={enterOfficeDisplay}>
            <Maximize2 size={19} /> {t.enterprise.officeDisplay}
          </button>
          <button type="button" className={styles.addButton} onClick={() => setCreateOpen(true)}>
            <Plus size={20} /> {t.enterprise.addBlock}
          </button>
        </div>
      </header>

      <div className={styles.legend}>
        {([
          ['stable', t.enterprise.stable],
          ['warning', t.enterprise.warning],
          ['high-risk', t.enterprise.highRisk],
        ] as const).map(([risk, label]) => (
          <span key={risk}><i className={`${styles.legendDot} ${riskClass[risk]}`} />{label} {riskCounts[risk]}</span>
        ))}
      </div>

      <div className={styles.cycleFilters}>
        {(['active', 'inactive', 'ended'] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            className={cycleFilter === filter ? styles.cycleFilterActive : ''}
            onClick={() => setCycleFilter(filter)}
            aria-pressed={cycleFilter === filter}
          >
            {filter === 'active'
              ? t.farmCycle.filterActive
              : filter === 'inactive'
                ? t.farmCycle.filterInactive
                : t.farmCycle.filterEnded}
          </button>
        ))}
      </div>

      {error ? <p className={styles.error}>{error.message}</p> : null}
      {loading ? <div className={styles.loading}>{t.enterprise.loadingBlocks}</div> : null}
      {!loading && sortedBlocks.length === 0 ? (
        <div className={styles.empty}>
          <h2>{t.enterprise.noBlocks}</h2>
          <p>{t.enterprise.noBlocksDescription}</p>
          <button className={styles.addButton} onClick={() => setCreateOpen(true)}>
            <Plus size={18} /> {t.enterprise.createFirstBlock}
          </button>
        </div>
      ) : (
        <div className={styles.blockList}>
          {sortedBlocks.map((block) => {
            const blockPonds = pondsForBlock(block.id);
            const isExpanded = Boolean(expanded[block.id]);
            const currentTechnician = technicians.find((technician) => technician.uid === block.assignedTechnicianId);
            const technicianLabel = getEnterpriseTechnicianLabel(
              currentTechnician?.name,
              currentTechnician?.email,
              getEnterpriseTechnicianLabel(
                block.assignedTechnicianName,
                block.assignedTechnicianEmail,
                t.enterprise.unassigned,
              ),
            );
            const canAssignTechnician = block.id !== '__unassigned__' && !block.assignedTechnicianId;
            return (
              <section key={block.id} className={styles.block}>
                <div className={styles.blockHeader}>
                  <button
                  className={styles.blockCopyButton}
                  onClick={() => setExpanded((current) => ({ ...current, [block.id]: !current[block.id] }))}
                  aria-expanded={isExpanded}
                  >
                    <span className={styles.blockCopy}>
                      <strong>{block.name}</strong>
                    <small>{getBlockCycleMeta(block.id)}</small>
                    </span>
                  </button>
                  {canAssignTechnician ? (
                    <button
                      type="button"
                      className={`${styles.technicianBadge} ${styles.technicianBadgeButton}`}
                      onClick={() => {
                        setAssignmentBlock(block);
                        setAssignmentTechnicianId('');
                      }}
                    >
                      {technicianLabel}
                    </button>
                  ) : <span className={styles.technicianBadge}>{technicianLabel}</span>}
                  <button
                    type="button"
                    className={styles.blockChevron}
                    onClick={() => setExpanded((current) => ({ ...current, [block.id]: !current[block.id] }))}
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${block.name}`}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
                {isExpanded ? (
                  blockPonds.length > 0 ? (
                    <div className={styles.pondGrid}>
                      {blockPonds.map((pond) => {
                        const status = cycleFilter !== 'inactive'
                          ? statusByPond.get(pond.id)
                          : undefined;
                        const toneClass = cycleFilter === 'ended'
                          ? styles.ended
                          : cycleFilter === 'inactive'
                            ? styles.neutral
                            : status
                              ? riskClass[status.risk]
                              : styles.neutral;
                        return (
                          <button
                            key={pond.id}
                            className={`${styles.pondTile} ${toneClass}`}
                            aria-label={cycleFilter === 'inactive'
                              ? `${t.startPondCycle.submit}: ${pond.pondName}`
                              : `${pond.pondName}, ${cycleFilter}`}
                            onClick={() => {
                              if (cycleFilter === 'inactive') {
                                openPondCycleForm(pond);
                                return;
                              }
                              setSelectedPond(pond as EnterprisePond);
                            }}
                          >
                            {cycleFilter === 'inactive' ? <Play size={14} /> : null}
                            {pond.pondName}
                          </button>
                        );
                      })}
                    </div>
                  ) : <p className={styles.noPonds}>{t.enterprise.noPondsForFilter}</p>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      {startCyclePond ? (
        <StartPondCycleModal
          key={startCyclePond.id}
          pond={startCyclePond}
          today={getFarmDateKey(new Date(), timeZone)}
          saving={startingPondCycle}
          onClose={() => setStartCyclePond(null)}
          onSubmit={handleStartPondCycle}
        />
      ) : null}

      {createOpen ? (
        <div className={styles.overlay} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setCreateOpen(false)}>
          <form className={styles.modal} onSubmit={saveBlock}>
            <div className={styles.modalHeader}>
              <div><h2>{t.enterprise.addBlock}</h2><p>{t.enterprise.addBlockDescription}</p></div>
              <button type="button" className={styles.iconButton} onClick={() => setCreateOpen(false)} aria-label="Close"><X size={20} /></button>
            </div>
            <label>{t.enterprise.blockName}
              <input required maxLength={80} value={blockName} onChange={(event) => setBlockName(event.target.value)} placeholder={t.enterprise.blockNamePlaceholder} />
            </label>
            <label>{t.enterprise.assignTechnician}
              <select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}>
                <option value="">{t.enterprise.unassigned}</option>
                {technicians.map((technician) => (
                  <option key={technician.uid} value={technician.uid}>
                    {getEnterpriseTechnicianLabel(technician.name, technician.email)}
                  </option>
                ))}
              </select>
            </label>
            {technicians.length === 0 ? <small>{t.enterprise.noTechnicians}</small> : null}
            <button className={styles.saveButton} disabled={saving}>{saving ? t.enterprise.loadingBlocks : t.enterprise.saveBlock}</button>
          </form>
        </div>
      ) : null}

      {assignmentBlock ? (
        <div
          className={styles.overlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setAssignmentBlock(null);
              setAssignmentTechnicianId('');
            }
          }}
        >
          <form className={styles.modal} onSubmit={saveAssignment}>
            <div className={styles.modalHeader}>
              <div><h2>{t.enterprise.saveAssignment}</h2><p>{assignmentBlock.name}</p></div>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => {
                  setAssignmentBlock(null);
                  setAssignmentTechnicianId('');
                }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <label>{t.enterprise.assignTechnician}
              <select required value={assignmentTechnicianId} onChange={(event) => setAssignmentTechnicianId(event.target.value)}>
                <option value="" disabled>{t.enterprise.unassigned}</option>
                {technicians.map((technician) => (
                  <option key={technician.uid} value={technician.uid}>
                    {getEnterpriseTechnicianLabel(technician.name, technician.email)}
                  </option>
                ))}
              </select>
            </label>
            {technicians.length === 0 ? <small>{t.enterprise.noTechnicians}</small> : null}
            <button className={styles.saveButton} disabled={saving || !assignmentTechnicianId}>
              {saving ? t.enterprise.loadingBlocks : t.enterprise.saveAssignment}
            </button>
          </form>
        </div>
      ) : null}

      {selectedPond && selectedStatus ? (
        <div className={styles.overlay} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedPond(null)}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label={selectedPond.pondName}>
            <div className={styles.modalHeader}>
              <div><h2>{selectedPond.pondName}</h2><p>DOC {selectedStatus.doc}</p></div>
              <button className={styles.iconButton} onClick={() => setSelectedPond(null)} aria-label="Close"><X size={20} /></button>
            </div>
            {selectedStatus.risk === 'stable' ? (
              <div className={styles.stablePanel}><CheckCircle2 size={21} />{t.enterprise.pondStable}</div>
            ) : (
              <div className={styles.warningList}>
                {selectedStatus.warnings.map((warning) => (
                  <div key={warning.code}><AlertTriangle size={18} />
                    <span>{t.enterprise.warningMessages[warning.code]}
                      {warning.value !== undefined ? ` (${warning.value.toFixed(warning.code === 'mortality' ? 2 : 1)}${warning.unit || ''})` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {selectedStatus.mortalityCount > 0 ? (
              <div className={styles.mortalityPanel}>
                <strong>{t.enterprise.latestMortality}</strong>
                <div>
                  <span><b>{selectedStatus.mortalityCount.toLocaleString()}</b><small>{t.enterprise.shrimpCount}</small></span>
                  <span><b>{selectedStatus.mortalityBiomassKg.toFixed(2)} kg</b><small>{t.enterprise.estimatedWeight}</small></span>
                  <span><b>{selectedStatus.mortalityPercent.toFixed(2)}%</b><small>{t.enterprise.populationImpact}</small></span>
                </div>
              </div>
            ) : null}
            {selectedStatus.warnings.some((warning) => warning.code !== 'mortality') ? (
              <Link className={styles.saveButton} href="/dashboard/water">{t.enterprise.openWaterQuality}</Link>
            ) : (
              <Link className={styles.saveButton} href={`/dashboard/ponds/detail?id=${selectedPond.id}`}>{t.enterprise.openPondDetails}</Link>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function EnterpriseGroupedPondGrid({
  ponds,
  onSelect,
  getTone = () => 'neutral',
  getSubtitle,
  emptyMessage,
}: EnterpriseGroupedPondGridProps) {
  const { t } = useLanguage();
  const { company } = useAuth();
  const { data: blocks } = useCompanyBlocks<FarmBlock>('asc');
  const { data: members } = useCompanyMembers<CompanyMember>();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const technicians = useMemo(() => members
    .filter((member) => member.role === 'technician')
    .map((member) => ({
      id: member.id,
      uid: member.id,
      name: member.name?.trim() || '',
      email: member.email || '',
    })), [members]);
  const unassigned = useMemo(() => ponds.filter((pond) => !pond.blockId), [ponds]);
  const displayBlocks = useMemo(() => [
    ...sortFarmBlocks(blocks),
    ...(unassigned.length > 0 ? [{ id: '__unassigned__', companyId: company?.id || '', name: t.enterprise.unassignedPonds }] : []),
  ], [blocks, company?.id, t.enterprise.unassignedPonds, unassigned.length]);

  if (displayBlocks.length === 0) return <div className={styles.empty}><p>{emptyMessage}</p></div>;

  return (
    <div className={styles.blockList}>
      {displayBlocks.map((block) => {
        const blockPonds = block.id === '__unassigned__' ? unassigned : ponds.filter((pond) => pond.blockId === block.id);
        const isExpanded = Boolean(expanded[block.id]);
        const currentTechnician = technicians.find((technician) => technician.uid === block.assignedTechnicianId);
        const technicianLabel = getEnterpriseTechnicianLabel(
          currentTechnician?.name,
          currentTechnician?.email,
          getEnterpriseTechnicianLabel(
            block.assignedTechnicianName,
            block.assignedTechnicianEmail,
            t.enterprise.unassigned,
          ),
        );
        return (
          <section key={block.id} className={styles.block}>
            <button className={styles.blockHeader} onClick={() => setExpanded((current) => ({ ...current, [block.id]: !current[block.id] }))} aria-expanded={isExpanded}>
              <span className={styles.blockCopy}>
                <span className={styles.blockTitleRow}>
                  <strong>{block.name}</strong>
                  <span className={styles.technicianBadge}>{technicianLabel}</span>
                </span>
                <small>{t.enterprise.pondCount.replace('{{count}}', String(blockPonds.length))}</small>
              </span>
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {isExpanded ? blockPonds.length > 0 ? (
              <div className={styles.pondGrid}>
                {blockPonds.map((pond) => {
                  const tone = getTone(pond);
                  const toneClass = tone === 'neutral' ? styles.neutral : riskClass[tone];
                  return (
                    <button key={pond.id} className={`${styles.pondTile} ${toneClass}`} onClick={() => onSelect(pond)}>
                      <span>{pond.pondName}</span>
                      {getSubtitle ? <small>{getSubtitle(pond)}</small> : null}
                    </button>
                  );
                })}
              </div>
            ) : <p className={styles.noPonds}>{t.enterprise.noPondsInBlock}</p> : null}
          </section>
        );
      })}
    </div>
  );
}

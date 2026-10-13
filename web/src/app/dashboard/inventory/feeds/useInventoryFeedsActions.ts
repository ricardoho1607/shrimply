"use client";
import { auth, db } from '@/lib/firebase';
import { prepareSaveData as removeUndefinedFields, updateRecordOnline } from '@/lib/saveData';
import {
  arrayUnion,
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import React from 'react';
import { removeAdditiveUsage } from "../../../../../../shared/additiveUsageRemoval";
import { getFarmDateKey } from "../../../../../../shared/farmDate";
import { requireAvailableStock } from "../../../../../../shared/financeIntegrity";
import { buildInventoryExpense, financeSourceEntry, financeSyncDocumentId } from "../../../../../../shared/financeSync";
import { mergeOrsonOperation, type OrsonCommand, type OrsonOperation } from "../../../../../../shared/orsonAgentContract";
import { buildInventoryProductLabel } from "../../../../../../shared/productLabel";
import { AcceptedVoid, formatQuantity, InventoryItem, isVoidRetryable, isVoidSaved, matchesVoidOperation, StockHistory, UsageHistory } from './InventoryFeedsModel';

import type { useInventoryFeedsState } from './useInventoryFeedsState';
type Context = Pick<ReturnType<typeof useInventoryFeedsState>,
  'modalType'
  | 'itemType'
  | 'save'
  | 'canEditInventory'
  | 'voidActionLock'
  | 'agent'
  | 'setUsageRemovalError'
  | 'acceptedVoidRef'
  | 'setVoidPreparationError'
  | 'setModalType'
  | 'setItemType'
  | 'setSelectedItem'
  | 'setFormData'
  | 'formData'
  | 'company'
  | 'setModalOpen'
  | 'setAcceptedVoid'
  | 'copy'
  | 'setVoidStatusUncertain'
  | 'companyId'
  | 'selectedItem'
  | 'canUseOrson'
  | 'hasOpenVoidOperation'
  | 'userUid'
  | 'setPreparingVoidRecordId'
  | 'setCheckingVoidStatus'
  | 'canRetryVoid'
  | 'voidStatusUncertain'
  | 'existingItems'
  | 'normalizeItemText'
  | 'user'
  | 'activePonds'
  | 'formatDate'
  | 'setRemovingUsageId'>;
export function useInventoryFeedsActions(context: Context) {
  const {
    modalType,
    itemType,
    save,
    canEditInventory,
    voidActionLock,
    agent,
    setUsageRemovalError,
    acceptedVoidRef,
    setVoidPreparationError,
    setModalType,
    setItemType,
    setSelectedItem,
    setFormData,
    formData,
    company,
    setModalOpen,
    setAcceptedVoid,
    copy,
    setVoidStatusUncertain,
    companyId,
    selectedItem,
    canUseOrson,
    hasOpenVoidOperation,
    userUid,
    setPreparingVoidRecordId,
    setCheckingVoidStatus,
    canRetryVoid,
    voidStatusUncertain,
    existingItems,
    normalizeItemText,
    user,
    activePonds,
    formatDate,
    setRemovingUsageId,
  } = context;
  const handleOpenModal = (type: typeof modalType, item?: InventoryItem, iType?: typeof itemType) => {
    if (!save.reset()) return;
    if (!canEditInventory && type !== 'history') return;
    if (save.busy || voidActionLock.current || agent.busy) return;
    setUsageRemovalError('');
    if (!acceptedVoidRef.current) setVoidPreparationError('');
    const effectiveItemType = iType || itemType;
    setModalType(type);
    setItemType(effectiveItemType);
    if (item) {
      setSelectedItem(item);
      const productLabel = effectiveItemType === 'additive' ? item.productLabel : undefined;
      setFormData({
        ...formData,
        itemName: item.itemName,
        brand: item.brand || '',
        category: item.feedType || item.category,
        unit: item.unit || 'kg',
        reorderLevel: String(item.reorderLevel || ''),
        quantity: '',
        unitPrice: '',
        notes: '',
        stockDate: getFarmDateKey(new Date(), company?.timeZone),
        expiry: '',
        pondId: '',
        manufacturer: productLabel?.manufacturer || '',
        ingredients: productLabel?.ingredients?.join('\n') || '',
        labelSourceUrl: productLabel?.sourceUrl || '',
      });
    } else {
      setSelectedItem(null);
      setFormData({
        itemName: '',
        brand: '',
        category: effectiveItemType === 'feed' ? 'Grower' : 'Water Conditioner',
        quantity: '',
        unitPrice: '',
        pondId: '',
        notes: '',
        unit: 'kg',
        stockDate: getFarmDateKey(new Date(), company?.timeZone),
        expiry: '',
        reorderLevel: '',
        manufacturer: '',
        ingredients: '',
        labelSourceUrl: '',
      });
    }
    setModalOpen(true);
  };

  const closeInventoryModal = () => {
    if (save.busy || voidActionLock.current || agent.busy) return;
    setModalOpen(false);
  };

  const saveAcceptedVoid = (accepted: AcceptedVoid) => {
    const previous = acceptedVoidRef.current;
    const next = previous && previous.companyId === accepted.companyId && previous.uid === accepted.uid &&
      matchesVoidOperation(previous.operation, accepted.command, accepted.operation.id)
      ? { ...accepted, operation: mergeOrsonOperation(previous.operation, accepted.operation) }
      : accepted;
    acceptedVoidRef.current = next;
    setAcceptedVoid(next);
    return next;
  };

  const uncertainVoidMessage = copy('Could not verify the removal. Check save status before retrying.');

  const acceptVoidResult = (accepted: AcceptedVoid, result: OrsonOperation | null | undefined) => {
    if (matchesVoidOperation(result, accepted.command, accepted.operation.id)) {
      const next = saveAcceptedVoid({ ...accepted, operation: result, retryVerified: isVoidRetryable(result) });
      if ((isVoidSaved(result) && isVoidSaved(next.operation)) ||
        (isVoidRetryable(result) && isVoidRetryable(next.operation))) {
        setVoidStatusUncertain(false);
        const rowError = result.rows[0]?.error;
        const failedReceipt = result.receipts.find(r => r.status === 'failed')?.message;
        setVoidPreparationError(rowError || failedReceipt || '');
        return;
      }
    }
    saveAcceptedVoid({ ...(acceptedVoidRef.current ?? accepted), retryVerified: false });
    setVoidStatusUncertain(true);
    setVoidPreparationError(uncertainVoidMessage);
  };

  const prepareVoidStockIn = async (record: StockHistory) => {
    const previous = acceptedVoidRef.current;
    if (
      voidActionLock.current || !companyId || !selectedItem || !(itemType === 'feed' || itemType === 'additive') ||
      !canEditInventory || !canUseOrson || !record.id || !record.date || agent.busy ||
      hasOpenVoidOperation || (previous?.companyId === companyId && previous.uid === userUid &&
        !isVoidSaved(previous.operation) && previous.operation.state !== 'discarded')
    ) return;

    voidActionLock.current = true;
    setPreparingVoidRecordId(record.id);
    setVoidPreparationError('');
    setVoidStatusUncertain(false);
    let accepted: AcceptedVoid | null = null;
    try {
      const command: OrsonCommand = {
        id: crypto.randomUUID(),
        type: 'void_inventory_purchase',
        date: record.date,
        itemType,
        itemId: selectedItem.id,
        recordId: record.id,
        values: {},
      };
      const operation = await agent.prepare([command]);
      if (!matchesVoidOperation(operation, command) || operation.state !== 'draft' ||
        operation.rows[0].valid !== true || operation.rows[0].error || operation.receipts.length !== 0 ||
        !Number.isFinite(operation.expiresAt) || operation.expiresAt <= 0) {
        const rowErrors = Array.isArray(operation?.rows)
          ? operation.rows.map(row => row?.error).filter(error => typeof error === 'string' && error).join(' ') : '';
        setVoidPreparationError(rowErrors || copy('Could not verify the removal draft. Check your connection and try again.'));
        return;
      }
      accepted = { command, operation, companyId, uid: userUid, retryVerified: false };
      saveAcceptedVoid(accepted);
      const result = await agent.confirm(operation, [command.id]);
      acceptVoidResult(accepted, result);
    } catch (err: unknown) {
      const errMessage = err instanceof Error && err.message ? err.message : '';
      setVoidStatusUncertain(!!accepted);
      setVoidPreparationError(accepted ? (errMessage ? `${uncertainVoidMessage} (${errMessage})` : uncertainVoidMessage) :
        (errMessage || copy('Could not verify the removal draft. Check your connection and try again.')));
    } finally {
      voidActionLock.current = false;
      setPreparingVoidRecordId(null);
    }
  };

  const recoverVoidStockIn = async () => {
    const accepted = acceptedVoidRef.current;
    if (voidActionLock.current || agent.busy || !accepted ||
      accepted.companyId !== companyId || accepted.uid !== userUid ||
      !matchesVoidOperation(accepted.operation, accepted.command, accepted.operation.id)) return;
    voidActionLock.current = true;
    setCheckingVoidStatus(true);
    setVoidPreparationError('');
    saveAcceptedVoid({ ...accepted, retryVerified: false });
    try {
      const result = await agent.recover(accepted.operation);
      acceptVoidResult(accepted, result);
    } catch (err: unknown) {
      const errMessage = err instanceof Error && err.message ? err.message : '';
      setVoidStatusUncertain(true);
      setVoidPreparationError(errMessage ? `${uncertainVoidMessage} (${errMessage})` : uncertainVoidMessage);
    } finally {
      voidActionLock.current = false;
      setCheckingVoidStatus(false);
    }
  };

  const retryVoidStockIn = async () => {
    const accepted = acceptedVoidRef.current;
    if (voidActionLock.current || agent.busy || !accepted || !canRetryVoid ||
      !canEditInventory || !canUseOrson || voidStatusUncertain || !accepted.retryVerified ||
      accepted.companyId !== companyId || accepted.uid !== userUid ||
      !matchesVoidOperation(accepted.operation, accepted.command, accepted.operation.id) ||
      !isVoidRetryable(accepted.operation)) return;
    voidActionLock.current = true;
    setPreparingVoidRecordId(accepted.command.recordId ?? null);
    setVoidPreparationError('');
    saveAcceptedVoid({ ...accepted, retryVerified: false });
    try {
      const result = await agent.confirm(accepted.operation, [accepted.command.id]);
      acceptVoidResult(accepted, result);
    } catch (err: unknown) {
      const errMessage = err instanceof Error && err.message ? err.message : '';
      setVoidStatusUncertain(true);
      setVoidPreparationError(errMessage ? `${uncertainVoidMessage} (${errMessage})` : uncertainVoidMessage);
    } finally {
      voidActionLock.current = false;
      setPreparingVoidRecordId(null);
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (save.busy) return;
    if (!companyId) return;
    if (!canEditInventory) return;

    if (modalType === 'add') {
      const duplicate = existingItems.find(item =>
        normalizeItemText(item.itemName) === normalizeItemText(formData.itemName) &&
        normalizeItemText(itemType === 'feed' ? item.brand || '' : item.productLabel?.manufacturer || item.brand || '') ===
        normalizeItemText(itemType === 'feed' ? formData.brand : formData.manufacturer) &&
        (item.feedType || item.category) === formData.category && item.unit === formData.unit
      );
      if (duplicate) {
        alert(copy('This item already exists. Restock the existing item to keep its history together.'));
        handleOpenModal('stockIn', duplicate, itemType);
        return;
      }
    }

    if (!save.acquire()) return;
    try {
      const qty = Number(formData.quantity);
      const price = Number(formData.unitPrice);
      const reorder = Number(formData.reorderLevel);
      if (['add', 'stockIn', 'usage'].includes(modalType) && (!Number.isFinite(qty) || qty <= 0)) {
        alert(copy('Quantity must be greater than 0.'));
        return;
      }
      if (['add', 'stockIn'].includes(modalType) && (!Number.isFinite(price) || price <= 0)) {
        alert(copy('Unit price must be greater than 0.'));
        return;
      }

      if (modalType === 'add') {
        const collectionName = itemType === 'feed' ? 'feeds' : 'additives';
        const now = serverTimestamp();
        const itemRef = doc(db, 'companies', companyId, collectionName, save.id(`item:${companyId}:${itemType}`));
        const stockId = save.id(`initial-stock:${companyId}:${itemType}`);
        const stockDate = formData.stockDate;
        const productLabel = itemType === 'additive' ? buildInventoryProductLabel({
          manufacturer: formData.manufacturer,
          ingredientsText: formData.ingredients,
          sourceUrl: formData.labelSourceUrl,
          recordedAt: getFarmDateKey(new Date(), company?.timeZone),
        }) : undefined;
        const itemData: Record<string, unknown> = {
          companyId,
          [itemType === 'feed' ? 'feedName' : 'additiveName']: formData.itemName,
          brand: formData.brand || '',
          [itemType === 'feed' ? 'feedType' : 'category']: formData.category,
          ...(productLabel ? { productLabel } : {}),
          unit: formData.unit,
          reorderLevel: isNaN(reorder) ? 0 : reorder,
          totalStock: qty,
          totalCost: qty * price,
          stockInHistory: [{
            id: stockId,
            date: stockDate,
            quantity: qty,
            price: price,
            notes: formData.notes,
            expiry: formData.expiry,
            createdAt: Timestamp.now()
          }],
          usageHistory: [],
          lastUpdated: now,
          createdAt: now
        };
        const expense = buildInventoryExpense({
          id: stockId,
          itemId: itemRef.id,
          type: itemType,
          itemName: formData.itemName,
          quantity: qty,
          price,
          unit: formData.unit,
          date: stockDate,
          notes: formData.notes,
        });
        await runTransaction(db, async (tx) => {
          if ((await tx.get(itemRef)).exists()) return;
          tx.set(itemRef, removeUndefinedFields({ ...itemData, financeEntries: { [financeSyncDocumentId(expense.reference)]: financeSourceEntry(expense) } }));
          tx.set(doc(db, 'companies', companyId, 'expenses', financeSyncDocumentId(expense.reference)), removeUndefinedFields({
            ...expense,
            companyId,
            addedBy: user?.uid || '',
            addedByName: user?.name || user?.email || 'Unknown',
            timestamp: Date.now(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }), { merge: true });
        });
      }
      else if (modalType === 'stockIn' && selectedItem) {
        const collectionName = itemType === 'feed' ? 'feeds' : 'additives';
        const ref = doc(db, 'companies', companyId, collectionName, selectedItem.id);
        const stockId = save.id(`stock:${selectedItem.id}`);
        const stockDate = formData.stockDate;
        const expense = buildInventoryExpense({
          id: stockId,
          itemId: selectedItem.id,
          type: itemType,
          itemName: selectedItem.itemName,
          quantity: qty,
          price,
          unit: selectedItem.unit,
          date: stockDate,
          notes: formData.notes,
        });

        await runTransaction(db, async (tx) => {
          const snapshot = await tx.get(ref);
          if (!snapshot.exists()) throw new Error('Item not found');
          const data = snapshot.data();
          if ((data.stockInHistory || []).some((entry: { id?: string }) => entry.id === stockId)) return;
          expense.sourceStockIndex = (data.stockInHistory || []).length;

          const newStock = (data.totalStock || 0) + qty;
          const newCost = (data.totalCost || 0) + (qty * price);

          tx.update(ref, removeUndefinedFields({
            archived: false,
            financeEntries: { ...(data.financeEntries || {}), [financeSyncDocumentId(expense.reference)]: financeSourceEntry(expense) },
            totalStock: newStock,
            totalCost: newCost,
            stockInHistory: arrayUnion({
              id: stockId,
              date: stockDate,
              quantity: qty,
              price: price,
              notes: formData.notes,
              expiry: formData.expiry,
              createdAt: Timestamp.now()
            }),
            lastUpdated: serverTimestamp()
          }));
          tx.set(doc(db, 'companies', companyId, 'expenses', financeSyncDocumentId(expense.reference)), removeUndefinedFields({
            ...expense,
            companyId,
            addedBy: user?.uid || '',
            addedByName: user?.name || user?.email || 'Unknown',
            timestamp: Date.now(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }), { merge: true });
        });
      }
      else if (modalType === 'usage' && selectedItem) {
        const collectionName = itemType === 'feed' ? 'feeds' : 'additives';
        const ref = doc(db, 'companies', companyId, collectionName, selectedItem.id);
        const selectedPond = activePonds.find((pond) => pond.id === formData.pondId);
        const usageId = save.id(`usage:${selectedItem.id}`);

        await runTransaction(db, async (tx) => {
          const snapshot = await tx.get(ref);
          if (!snapshot.exists()) throw new Error('Item not found');
          const data = snapshot.data();
          if ((data.usageHistory || []).some((entry: { id?: string }) => entry.id === usageId) || data.removedUsageIds?.includes(usageId)) return;

          const newStock = requireAvailableStock(data.totalStock, qty);
          const currentStock = data.totalStock || 0;
          const currentCost = data.totalCost || 0;
          const unitPrice = currentStock > 0 ? currentCost / currentStock : 0;
          if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
            throw new Error('Item cost is missing. Stock this item with a price before recording usage.');
          }

          tx.update(ref, removeUndefinedFields({
            totalStock: newStock,
            totalCost: Math.max(0, currentCost - (qty * unitPrice)),
            usageHistory: arrayUnion({
              id: usageId,
              date: getFarmDateKey(new Date(), company?.timeZone),
              quantity: qty,
              unitPrice,
              totalCost: qty * unitPrice,
              pondId: formData.pondId || null,
              cycleId: selectedPond?.cycleId || null,
              cycleName: selectedPond?.cycleName || null,
              pondCycleId: selectedPond?.pondCycleId || selectedPond?.id || null,
              notes: formData.notes,
              createdAt: Timestamp.now()
            }),
            lastUpdated: serverTimestamp()
          }));
        });
      }
      else if (modalType === 'editReorder' && selectedItem) {
        const collectionName = itemType === 'feed' ? 'feeds' : 'additives';
        const ref = doc(db, 'companies', companyId, collectionName, selectedItem.id);
        await updateRecordOnline(db, ref, removeUndefinedFields({
          reorderLevel: isNaN(reorder) ? 0 : reorder,
          ...(itemType === 'additive' ? {
            productLabel: buildInventoryProductLabel({
              manufacturer: formData.manufacturer,
              ingredientsText: formData.ingredients,
              sourceUrl: formData.labelSourceUrl,
              recordedAt: getFarmDateKey(new Date(), company?.timeZone),
            }) || null,
          } : {}),
          lastUpdated: serverTimestamp()
        }));
      }

      save.complete();
      setModalOpen(false);
    } catch (err) {
      console.error('Inventory action failed:', err);
      alert(copy('Operation failed. Please try again.'));
    } finally {
      save.release();
    }
  };

  const handleRemoveUsage = async (item: InventoryItem, usage: UsageHistory) => {
    if (!companyId || !userUid || auth.currentUser?.uid !== userUid || !canEditInventory || itemType !== 'additive' || save.busy) return;
    if (!window.confirm(`Remove ${formatQuantity(usage.quantity)} ${item.unit || 'kg'} used on ${formatDate(usage.date)}? This restores the recorded stock and cost and removes this usage expense.`)) return;
    if (!save.acquire()) return;
    setRemovingUsageId(usage.id);
    setUsageRemovalError('');
    try {
      const ref = doc(db, 'companies', companyId, 'additives', item.id);
      await runTransaction(db, async tx => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists()) throw new Error('Additive not found.');
        const update = removeAdditiveUsage(snapshot.data(), usage.id);
        if (update) tx.update(ref, { ...update, lastUpdated: serverTimestamp() });
      });
      save.complete();
    } catch (error) {
      setUsageRemovalError(error instanceof Error ? error.message : 'Could not remove usage. Please try again.');
    } finally {
      setRemovingUsageId(null);
      save.release();
    }
  };

  const handleDeleteItem = async (item: InventoryItem, type: 'feed' | 'additive') => {
    if (!companyId || !window.confirm(`${item.archived ? 'Restore' : 'Archive'} ${item.itemName}? Purchase and usage history will be retained. Only empty-stock items can be archived.`)) return;
    if (!canEditInventory) return;
    try {
      const collectionName = type === 'feed' ? 'feeds' : 'additives';
      const itemRef = doc(db, 'companies', companyId, collectionName, item.id);
      await runTransaction(db, async (tx) => {
        const snapshot = await tx.get(itemRef);
        if (!snapshot.exists()) return;
        if (!item.archived && Number(snapshot.data().totalStock) > 0) throw new Error('Use or correct the remaining stock before archiving.');
        tx.update(itemRef, removeUndefinedFields({ archived: !item.archived, lastUpdated: serverTimestamp() }));
      });
    } catch (err) {
      console.error('Delete failed:', err);
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };
  return {
    handleOpenModal,
    closeInventoryModal,
    prepareVoidStockIn,
    recoverVoidStockIn,
    retryVoidStockIn,
    handleAction,
    handleRemoveUsage,
    handleDeleteItem,
  };
}

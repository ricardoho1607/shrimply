import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PondCostAllocation } from '../../shared/financeCycleAllocation';
import { pondPlQuantity, type ExpensePond, type ProductionAllocationPreview } from '../../shared/financeExpenseAllocation';
import type { FinanceAllocationCopy } from '../../shared/financeAllocationCopy';

export function FinanceAllocationBreakdown({ rows, copy, formatCurrency }: { rows: PondCostAllocation[]; copy: FinanceAllocationCopy; formatCurrency: (value: number) => string }) {
  const [expanded, setExpanded] = useState(false);
  if (!rows.length) return null;
  return <View style={styles.breakdown}>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={styles.toggle}><Text style={styles.link}>{copy.breakdown} · {rows.length} {copy.ponds} {expanded ? '−' : '+'}</Text></TouchableOpacity>
    {expanded && rows.map(row => <View key={row.pondCycleId || row.pondId} style={styles.row}>
      <View style={styles.rowLabel}><Text style={styles.title}>{row.pondName}</Text><Text style={styles.detail}>{[row.blockName, row.cycleName].filter(Boolean).join(' · ')}</Text>
        {(row.pondArea !== undefined || row.plQuantity !== undefined) && <Text style={styles.detail}>{(row.pondArea ?? row.plQuantity)?.toLocaleString()} {row.pondArea !== undefined ? 'm²' : 'PL'}</Text>}
      </View><Text style={styles.title}>{formatCurrency(row.amount)}</Text>
    </View>)}
  </View>;
}

export default function FinanceAllocationPanel({ method, ponds, preview, selectedIds, quantities, onSelection, onQuantity, copy, formatCurrency, currencySymbol, usingSaved, onRecalculate }: {
  method: 'active_pond_area' | 'pl_quantity'; ponds: ExpensePond[]; preview: ProductionAllocationPreview;
  selectedIds: string[]; quantities: Record<string, string | number>; onSelection: (ids: string[]) => void;
  onQuantity: (pondId: string, quantity: string) => void; copy: FinanceAllocationCopy;
  formatCurrency: (value: number) => string; currencySymbol: string; usingSaved?: boolean; onRecalculate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const visiblePonds = ponds.filter(pond => `${pond.pondName} ${pond.blockName || ''} ${pond.cycleName || ''}`.toLowerCase().includes(search.toLowerCase()));
  const groups = new Map<string, { name: string; ponds: ExpensePond[] }>();
  visiblePonds.forEach(pond => {
    const key = pond.blockId || pond.blockName || '__unassigned__';
    const group = groups.get(key) || { name: pond.blockName || copy.unassigned, ponds: [] };
    group.ponds.push(pond); groups.set(key, group);
  });
  const toggle = (ids: string[]) => {
    const allSelected = ids.every(id => selectedIds.includes(id));
    onSelection(allSelected ? selectedIds.filter(id => !ids.includes(id)) : [...new Set([...selectedIds, ...ids])]);
  };
  return <View style={styles.panel}>
    <Text style={styles.title}>{method === 'active_pond_area' ? copy.production : copy.selectPonds}</Text>
    <Text style={styles.detail}>{method === 'active_pond_area' ? copy.areaHint : copy.plHint}</Text>
    {method === 'pl_quantity' ? <TouchableOpacity accessibilityRole="button" style={styles.selector} onPress={() => { setSearch(''); setOpen(true); }}><Text style={styles.white}>{copy.selectPonds} · {selectedIds.length} {copy.selected}</Text></TouchableOpacity> : preview.error ? <Text style={styles.detail}>{ponds.length} {copy.ponds}</Text> : null}
    {usingSaved && <><Text style={styles.detail}>{copy.saved}</Text>{onRecalculate && <TouchableOpacity accessibilityRole="button" style={styles.toggle} onPress={onRecalculate}><Text style={styles.link}>{copy.recalculate}</Text></TouchableOpacity>}</>}
    {preview.error && preview.error !== 'invalidAmount' && <Text accessibilityRole="alert" style={styles.error}>{copy[preview.error]}</Text>}
    {!preview.error && <><Text style={styles.detail}>{preview.allocations.length} {preview.allocations.length === 1 ? copy.pond : copy.ponds} · {preview.blockCount} {preview.blockCount === 1 ? copy.block : copy.blocks}</Text>
      <Text style={styles.detail}>{method === 'active_pond_area' ? copy.totalArea : copy.totalPl}: {preview.totalBasis.toLocaleString()} {method === 'active_pond_area' ? 'm²' : 'PL'}</Text>
      <Text style={styles.detail}>{currencySymbol} {preview.rate.toLocaleString(undefined, { maximumFractionDigits: 4 })} / {method === 'active_pond_area' ? 'm²' : 'PL'}</Text>
      <FinanceAllocationBreakdown rows={preview.allocations} copy={copy} formatCurrency={formatCurrency} /></>}
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}><SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.header}><Text style={styles.heading}>{copy.selectPonds}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={copy.close} onPress={() => setOpen(false)} style={styles.toggle}><Text style={styles.link}>×</Text></TouchableOpacity></View>
        <TextInput accessibilityLabel={copy.search} placeholder={copy.search} value={search} onChangeText={setSearch} style={styles.input} />
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.options}>{Array.from(groups, ([key, group]) => <View key={key}>
          <View style={styles.group}><Text style={styles.title}>{group.name}</Text><TouchableOpacity accessibilityRole="button" style={styles.toggle} onPress={() => toggle(group.ponds.map(pond => pond.id))}><Text style={styles.link}>{group.ponds.every(pond => selectedIds.includes(pond.id)) ? copy.clearBlock : copy.selectBlock}</Text></TouchableOpacity></View>
          {group.ponds.map(pond => <View key={pond.id} style={styles.option}>
            <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel={`${pond.pondName}, ${pond.cycleName || pond.cycleId}`} accessibilityState={{ checked: selectedIds.includes(pond.id) }} style={styles.checkboxRow} onPress={() => toggle([pond.id])}>
              <View style={[styles.checkbox, selectedIds.includes(pond.id) && styles.checked]}><Text style={styles.white}>{selectedIds.includes(pond.id) ? '✓' : ''}</Text></View>
              <View style={styles.rowLabel}><Text style={styles.title}>{pond.pondName}</Text><Text style={styles.detail}>{pond.cycleName || pond.cycleId}</Text></View>
            </TouchableOpacity>
            {selectedIds.includes(pond.id) && <View style={styles.quantity}><Text style={styles.detail}>{copy.quantity}</Text><TextInput accessibilityLabel={`${pond.pondName} ${copy.quantity}`} keyboardType="number-pad" value={String(quantities[pond.id] ?? pondPlQuantity(pond) ?? '')} onChangeText={value => onQuantity(pond.id, value)} style={[styles.input, styles.quantityInput]} /></View>}
          </View>)}
        </View>)}{!visiblePonds.length && <Text style={styles.detail}>{copy.noPonds}</Text>}</ScrollView>
        <View style={styles.footer}><Text style={styles.detail}>{selectedIds.length} {copy.ponds} {copy.selected}</Text><TouchableOpacity accessibilityRole="button" style={styles.selector} onPress={() => setOpen(false)}><Text style={styles.white}>{copy.done}</Text></TouchableOpacity></View>
      </SafeAreaView></KeyboardAvoidingView>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  panel: { padding: 16, borderWidth: 1, borderColor: '#d9e6ee', borderRadius: 12, backgroundColor: '#f6f9fb', gap: 8 },
  title: { color: '#17394f', fontSize: 14, fontWeight: '600' }, detail: { color: '#526b7c', fontSize: 14, lineHeight: 21 },
  link: { color: '#0f4c75', fontSize: 14, fontWeight: '600' }, white: { color: '#fff', fontSize: 14, fontWeight: '600' },
  selector: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, backgroundColor: '#0f4c75' }, toggle: { paddingVertical: 12, paddingHorizontal: 4 },
  breakdown: { marginTop: 8 }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: '#d9e6ee', paddingVertical: 10 }, rowLabel: { flex: 1 },
  error: { color: '#a13429', fontSize: 14, lineHeight: 21 }, overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0f263b80' }, sheet: { backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heading: { color: '#17394f', fontSize: 20, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#c7d9e6', borderRadius: 8, padding: 12, fontSize: 15, color: '#17394f', marginVertical: 12 }, options: { flexGrow: 0 },
  group: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#d9e6ee' },
  option: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eef3f6' }, checkboxRow: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 44 },
  checkbox: { width: 24, height: 24, borderRadius: 5, borderWidth: 1, borderColor: '#8da9ba', alignItems: 'center', justifyContent: 'center' }, checked: { backgroundColor: '#0f4c75', borderColor: '#0f4c75' },
  quantity: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, quantityInput: { width: 145, marginVertical: 8 }, footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 12 },
});

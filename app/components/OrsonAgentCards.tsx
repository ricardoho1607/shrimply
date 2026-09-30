import React, { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import type { AgentController } from "../../orson/useAgentOperations";
import type {
  OrsonCommand,
  OrsonOperation,
} from "../../shared/orsonAgentContract";
import {
  agentFields,
  agentActivityLabel,
  agentFieldLabel,
  agentFieldOptions,
} from "../../shared/orsonAgentPresentation";
function Button({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && { opacity: 0.45 }]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}
function Choice({
  label,
  value,
  options,
  onChange,
  onOpen,
}: {
  label: string;
  value: string;
  options: { id: string; name: string }[];
  onChange: (value: string) => void;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Button
        title={
          options.find((o) => o.id === value)?.name ||
          value ||
          `Select ${label.toLowerCase()}`
        }
        onPress={() => {
          setOpen(!open);
          onOpen?.();
        }}
      />
      {open &&
        options.map((o) => (
          <Button
            key={o.id}
            title={o.name}
            onPress={() => {
              onChange(o.id);
              setOpen(false);
            }}
          />
        ))}
    </View>
  );
}
function Card({ op, agent, onDismiss }: { op: OrsonOperation; agent: AgentController; onDismiss?: (operationId: string) => void }) {
  const router = useRouter();
  const saved = new Set(
    op.receipts.filter((r) => r.status === "saved").flatMap((r) => r.rowIds),
  );
  const remaining = op.rows.filter((r) => !saved.has(r.command.id));
  const [commands, setCommands] = useState<OrsonCommand[]>(() =>
    remaining.map((r) => r.command),
  );
  const [selected, setSelected] = useState<string[]>(() =>
    remaining.filter((r) => r.valid).map((r) => r.command.id),
  );
  const [editingRows, setEditingRows] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [showSaveStatus, setShowSaveStatus] = useState(false);
  const closed = op.state === "completed" || op.state === "discarded";
  const selectedTypes = commands
    .filter((command) => selected.includes(command.id))
    .map((command) => command.type);
  const includesDelete = selectedTypes.includes("delete_inventory_item");
  const includesVoid = selectedTypes.includes("void_inventory_purchase");
  const confirmLabel = `Confirm ${selected.length} selected`;
  const edit = (i: number, patch: Partial<OrsonCommand>) => {
    if (agent.busy) return;
    setCommands((old) => old.map((c, j) => (i === j ? { ...c, ...patch } : c)));
    setDirty(true);
  };
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {closed
          ? op.state === "completed"
            ? "Saved records"
            : "Draft discarded"
          : "Review farm entries"}
      </Text>
      {!closed && (
        <Text style={styles.text}>
          {includesDelete
            ? "Check the item and stock details. Deletion is permanent."
            : includesVoid
              ? "Check the purchase and stock details. Voiding is auditable and permanent."
              : "Check the target, date, and changes. Selected entries for each pond save together."}
        </Text>
      )}
      {op.receipts.map((r, i) => (
        <View key={i}>
          <Text style={[styles.text, r.status === "failed" && styles.error]}>
            {r.status === "saved" ? "Saved" : "Not saved"} — {r.message}
          </Text>
          {r.links?.map((link, j) => (
            <Button
              key={j}
              title={link.label}
              onPress={() => router.push(link.mobile as never)}
            />
          ))}
        </View>
      ))}
      {closed && onDismiss && (
        <Button
          title="Dismiss"
          disabled={agent.busy}
          onPress={() => onDismiss(op.id)}
        />
      )}
      {!closed &&
        commands.map((c, i) => {
          const row = remaining.find((r) => r.command.id === c.id)!;
          return (
            <View key={c.id} style={styles.row}>
              <Text style={styles.title}>
                {row.title}
                {row.target ? ` · ${row.target}` : ""}
              </Text>
              {remaining.filter((item) => item.valid).length > 1 && <Button
                title={`${selected.includes(c.id) ? "☑" : "☐"} Include entry`}
                disabled={agent.busy || dirty || !row.valid}
                onPress={() =>
                  setSelected((old) =>
                    old.includes(c.id)
                      ? old.filter((id) => id !== c.id)
                      : [...old, c.id],
                  )
                }
              />}
              {row.error && <Text style={styles.error}>{row.error}</Text>}
              <Text style={styles.text}>Date: {c.date || "Not set"}</Text>
              {c.type === "void_inventory_purchase" && (
                <View style={{
                  marginVertical: 8,
                  padding: 10,
                  backgroundColor: "#fef2f2",
                  borderWidth: 1,
                  borderColor: "#fecaca",
                  borderRadius: 6,
                }}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <View style={{
                      backgroundColor: "#ef4444",
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}>
                      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>TO BE REMOVED</Text>
                    </View>
                    <Text style={{ color: "#991b1b", fontWeight: "700", fontSize: 13 }}>Remove from active stock and Finance on confirmation</Text>
                  </View>
                  <Text style={[styles.text, { fontSize: 12, color: "#4b5563" }]}>
                    The purchase and linked expense will remain in audit history as voided records.
                  </Text>
                  {row.before?.purchaseId ? (
                    <Text style={[styles.text, { fontSize: 12, color: "#4b5563" }]}>
                      Purchase: {String(row.before.quantity ?? "")} {String(row.before.unit ?? "kg")} @ {String(row.before.price ?? "")} ({String(row.before.date ?? "")})
                    </Text>
                  ) : null}
                  {row.before?.expenseId ? (
                    <Text style={[styles.text, { fontSize: 12, color: "#4b5563" }]}>
                      Linked expense: {String(row.before.expenseId)}
                    </Text>
                  ) : null}
                  {row.effects && row.effects.length > 0 ? (
                    <View style={{ marginTop: 8, borderTopWidth: 1, borderColor: '#fecaca', paddingTop: 6 }}>
                      <Text style={{ color: '#991b1b', fontWeight: '700', fontSize: 12, marginBottom: 3 }}>
                        Previewed inventory & finance changes:
                      </Text>
                      {row.effects.map((effect, idx) => (
                        <Text key={idx} style={{ color: '#7f1d1d', fontSize: 12, lineHeight: 18 }}>
                          • {effect}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              )}
              {agentFields(c).map((field) => {
                const hasPrevious = Object.hasOwn(row.before || {}, field);
                const previous = row.before?.[field];
                const proposed = c.values?.[field];
                return (
                  <Text key={field} style={styles.text}>
                    {agentFieldLabel(field)}: {hasPrevious ? `${previous === null || previous === undefined ? "Missing" : String(previous)} → ` : ""}{proposed === null || proposed === undefined || proposed === "" ? "Missing" : String(proposed)}
                  </Text>
                );
              })}
              {c.type === "record_feeding" && (c.allocations || []).map((allocation, j) => (
                <Text key={`${allocation.inventoryFeedId}-${j}`} style={styles.text}>
                  Feed: {agent.catalog.feeds.find((feed) => feed.id === allocation.inventoryFeedId)?.name || allocation.inventoryFeedId || "Not selected"} · {allocation.quantityKg} kg/day
                </Text>
              ))}
              {c.type !== "void_inventory_purchase" && c.type !== "delete_inventory_item" && (
                <Button
                  title={editingRows.includes(c.id) ? "Done editing" : "Edit details"}
                  disabled={agent.busy}
                  onPress={() => setEditingRows((old) => old.includes(c.id) ? old.filter((id) => id !== c.id) : [...old, c.id])}
                />
              )}
              {editingRows.includes(c.id) && <View>
              <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={c.date || ""}
                editable={!agent.busy}
                onChangeText={(date) => edit(i, { date })}
              />
              {("pondId" in c ||
                [
                  "record_sampling",
                  "record_mortality",
                  "record_feeding",
                  "upsert_water_quality",
                  "record_harvest",
                  "apply_pond_treatment",
                  "start_cycle",
                  "end_cycle",
                ].includes(c.type)) && (
                <Choice
                  label="Pond"
                  value={c.pondId || ""}
                  options={agent.catalog.ponds}
                  onOpen={() => void agent.loadCatalog()}
                  onChange={(pondId) => edit(i, { pondId })}
                />
              )}
              {[
                "stock_in_inventory",
                "update_inventory_details",
                "delete_inventory_item",
                "apply_pond_treatment",
              ].includes(c.type) && (
                <>
                  <Choice
                    label="Inventory type"
                    value={c.itemType || ""}
                    options={[
                      { id: "feed", name: "Feed" },
                      { id: "additive", name: "Additive" },
                    ]}
                    onChange={(itemType) =>
                      edit(i, {
                        itemType: itemType as "feed" | "additive",
                        itemId: "",
                      })
                    }
                  />
                  <Choice
                    label="Inventory item"
                    value={c.itemId || ""}
                    options={
                      c.itemType === "feed"
                        ? agent.catalog.feeds
                        : agent.catalog.additives
                    }
                    onOpen={() => void agent.loadCatalog()}
                    onChange={(itemId) => edit(i, { itemId })}
                  />
                </>
              )}
              {agentFields(c).map((field) => (
                <View key={field}>
                  <Text style={styles.label}>{agentFieldLabel(field)}</Text>
                  {agentFieldOptions[field] ? (
                    <Choice
                      label={agentFieldLabel(field)}
                      value={String(c.values?.[field] ?? "")}
                      options={agentFieldOptions[field]}
                      onChange={(value) =>
                        edit(i, { values: { ...c.values, [field]: value } })
                      }
                    />
                  ) : (
                    <TextInput
                      style={styles.input}
                      editable={!agent.busy}
                      value={String(c.values?.[field] ?? "")}
                      onChangeText={(value) =>
                        edit(i, { values: { ...c.values, [field]: value } })
                      }
                    />
                  )}
                </View>
              ))}
              {c.type === "record_feeding" && (
                <>
                  {(c.allocations || []).map((a, j) => (
                    <View key={j}>
                      <Choice
                        label="Feed item"
                        value={a.inventoryFeedId}
                        options={agent.catalog.feeds}
                        onOpen={() => void agent.loadCatalog()}
                        onChange={(value) =>
                          edit(i, {
                            allocations: c.allocations!.map((r, k) =>
                              j === k ? { ...r, inventoryFeedId: value } : r,
                            ),
                          })
                        }
                      />
                      <Text style={styles.label}>Desired daily total (kg)</Text>
                      <TextInput
                        keyboardType="decimal-pad"
                        style={styles.input}
                        value={String(a.quantityKg)}
                        editable={!agent.busy}
                        onChangeText={(value) =>
                          edit(i, {
                            allocations: c.allocations!.map((r, k) =>
                              j === k ? { ...r, quantityKg: Number(value) } : r,
                            ),
                          })
                        }
                      />
                      <Button
                        title="Remove feed"
                        disabled={agent.busy}
                        onPress={() =>
                          edit(i, {
                            allocations: c.allocations!.filter(
                              (_, k) => j !== k,
                            ),
                          })
                        }
                      />
                    </View>
                  ))}
                  <Button
                    title="Add feed allocation"
                    disabled={agent.busy}
                    onPress={() =>
                      edit(i, {
                        allocations: [
                          ...(c.allocations || []),
                          { inventoryFeedId: "", quantityKg: 0 },
                        ],
                      })
                    }
                  />
                </>
              )}
              </View>}
              {row.warnings.map((w) => (
                <Text style={styles.warning} key={w}>
                  {w}
                </Text>
              ))}
              {c.type !== "void_inventory_purchase" && row.effects.map((effect) => (
                <Text style={styles.text} key={effect}>
                  {effect}
                </Text>
              ))}
            </View>
          );
        })}
      {!closed && (
        <>
          {dirty && <Button
            title="Refresh review"
            disabled={agent.busy || !commands.length}
            onPress={() => void agent.update(op, commands)}
          />}
          <Button
            title={confirmLabel}
            disabled={agent.busy || dirty || !selected.length}
            onPress={() => void agent.confirm(op, selected)}
          />
          <Text style={styles.text}>
            {commands.length - selected.length} not selected
          </Text>
          <Button
            title="Discard"
            disabled={agent.busy}
            onPress={() => void agent.discard(op)}
          />
        </>
      )}
      <Button
        title="Save status"
        disabled={agent.busy}
        onPress={() => setShowSaveStatus((old) => !old)}
      />
      {showSaveStatus && <View>
        <Button
          title={checkingStatus ? "Checking…" : "Check now"}
          disabled={agent.busy || checkingStatus}
          onPress={async () => {
            setCheckingStatus(true);
            try { await agent.recover(op); }
            finally { setCheckingStatus(false); }
          }}
        />
        {!!agent.recoveryStatus[op.id] && (
          <Text accessibilityLiveRegion="polite" style={styles.text}>
            {agent.recoveryStatus[op.id]}
          </Text>
        )}
      </View>}
    </View>
  );
}
export default function OrsonAgentCards({ agent, operationIds, showStatus = true, onDismiss }: {
  agent: AgentController;
  operationIds: string[];
  showStatus?: boolean;
  onDismiss?: (operationId: string) => void;
}) {
  const operations = agent.operations.filter((op) => operationIds.includes(op.id));
  const draftOperationKey = operations
    .filter((op) => op.state === "draft" || op.state === "partial")
    .map((op) => op.id)
    .join(":");
  const { loadCatalog } = agent;
  useEffect(() => {
    if (draftOperationKey) void loadCatalog();
  }, [draftOperationKey, loadCatalog]);
  return (
    <View>
      {operations.map((op) => (
        <Card
          key={`${op.id}:${op.revision}:${JSON.stringify(op.receipts)}`}
          op={op}
          agent={agent}
          onDismiss={onDismiss}
        />
      ))}
      {showStatus && agent.operationBusy && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ActivityIndicator size="small" color="#0f4c75" />
          <Text accessibilityLiveRegion="polite">
            {agentActivityLabel(agent.busyStep)}…
            {agent.elapsed >= 10 ? ` (${agent.elapsed}s)` : ""}
          </Text>
        </View>
      )}
      {showStatus && !!agent.error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {agent.error}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#cbdce8",
    borderRadius: 12,
    backgroundColor: "#f8fbfd",
    gap: 10,
  },
  title: { fontSize: 16, fontWeight: "600", color: "#17324d" },
  text: { fontSize: 14, lineHeight: 21, color: "#17324d" },
  label: { fontSize: 14, color: "#17324d", marginTop: 8, marginBottom: 4 },
  input: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#cbdce8",
    borderRadius: 6,
    backgroundColor: "#fff",
    color: "#17324d",
    fontSize: 15,
  },
  row: { borderTopWidth: 1, borderColor: "#d9e4ec", paddingTop: 12, gap: 6 },
  button: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#0f4c75",
    borderRadius: 6,
    marginVertical: 3,
  },
  buttonText: { color: "#0f4c75", fontSize: 14, fontWeight: "500" },
  error: { color: "#b3261e", fontSize: 14 },
  warning: { color: "#805a00", fontSize: 14 },
});

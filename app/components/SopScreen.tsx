import { sopText, sopFieldLabel } from "../../shared/sop/uiCopy";
import { SopFlowPreview } from "./SopFlowPreview";
import { enableSopPush } from "../hooks/useSopPush";
import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { useSopWorkspace } from "../hooks/useSopWorkspace";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { sopCopy } from "../../shared/sop/copy";
import { sopSummary, type SopDocument } from "../../shared/sop/client";
import {
  emptySopStep,
  SOP_STAGES,
  SOP_TEMPLATES,
  type SopDefinition,
  type SopStep,
  type SopTask,
  type SopAttachment,
} from "../../shared/sop/contracts";
import { SOP_FIELDS } from "../../shared/sop/registry";
import { validateSop } from "../../shared/sop/engine";
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
      accessibilityLabel={title}
      disabled={disabled}
      style={[styles.button, disabled && { opacity: 0.45 }]}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}
function Input({
  label,
  value,
  onChange,
  numeric = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? "decimal-pad" : "default"}
        multiline={multiline}
        style={[
          styles.input,
          multiline && { minHeight: 84, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}
function Choices({
  label,
  values,
  selected,
  onChange,
}: {
  label: string;
  values: { id: string; title: string }[];
  selected: string[];
  onChange: (id: string) => void;
}) {
  const { currentLanguage } = useLanguage();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {values.map((v) => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: selected.includes(v.id) }}
            key={v.id}
            style={[
              styles.choice,
              selected.includes(v.id) && styles.selectedChoice,
            ]}
            onPress={() => onChange(v.id)}
          >
            <Text
              style={
                selected.includes(v.id) ? styles.selectedText : styles.text
              }
            >
              {v.id === v.title || !v.id
                ? sopText(v.title, currentLanguage)
                : v.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
const vals = (values: readonly string[]) =>
  values.map((id) => ({ id, title: id }));
const toggle = (arr: string[], id: string) =>
  arr.includes(id) ? arr.filter((v) => v !== id) : [...arr, id];
export function SopScreen({ mode }: { mode: "sops" | "todo" }) {
  const { user, company } = useAuth();
  return <SopScreenContent key={`${user?.uid}:${company?.id}`} mode={mode} />;
}
function SopScreenContent({ mode }: { mode: "sops" | "todo" }) {
  const client = useSopWorkspace(),
    w = client.workspace,
    { currentLanguage } = useLanguage(),
    { user, company } = useAuth(),
    c = sopCopy(currentLanguage),
    router = useRouter(),
    params = useLocalSearchParams<{
      taskId?: string;
      adoptionId?: string;
      issueId?: string;
    }>();
  const ui = (value: string) => sopText(value, currentLanguage);
  const [versionHistory, setVersionHistory] = useState<{
    sopId: string;
    items: import("../../shared/sop/client").SopVersion[];
    nextCursor: string;
  } | null>(null);
  const [updateReview, setUpdateReview] = useState<{
    adoptionId: string;
    sopId: string;
    revision: number;
    result: Record<string, unknown>;
  } | null>(null);
  const [tab, setTab] = useState("library"),
    [definition, setDefinition] = useState<SopDefinition | null>(null),
    [editing, setEditing] = useState<SopDocument | null>(null),
    [openStep, setOpenStep] = useState(0),
    [message, setMessage] = useState(""),
    [aiText, setAiText] = useState("");
  const [adopting, setAdopting] = useState<SopDocument | null>(null),
    [blocks, setBlocks] = useState<string[]>([]),
    [ponds, setPonds] = useState<string[]>([]),
    [manager, setManager] = useState(""),
    [lifetime, setLifetime] = useState("cycle"),
    [recipients, setRecipients] = useState<string[]>([]),
    [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [task, setTask] = useState<SopTask | null>(null),
    [notes, setNotes] = useState(""),
    [observedAt, setObservedAt] = useState(""),
    [attachments, setAttachments] = useState<SopAttachment[]>([]),
    [reason, setReason] = useState(""),
    [newDue, setNewDue] = useState(""),
    [newAssignee, setNewAssignee] = useState("");
  const [manualScope, setManualScope] = useState("company"),
    [manualTarget, setManualTarget] = useState(""),
    [manualSeverity, setManualSeverity] = useState("low");
  const [manual, setManual] = useState(false),
    [title, setTitle] = useState(""),
    [instructions, setInstructions] = useState(""),
    [due, setDue] = useState(""),
    [assignee, setAssignee] = useState("");
  const [status, setStatus] = useState("active"),
    [person, setPerson] = useState(""),
    [pond, setPond] = useState(""),
    [block, setBlock] = useState(""),
    [urgency, setUrgency] = useState(""),
    [date, setDate] = useState("");
  const [quietStart, setQuietStart] = useState("22:00"),
    [quietEnd, setQuietEnd] = useState("06:00");
  const [stageTarget, setStageTarget] = useState(""),
    [stage, setStage] = useState("preparation"),
    [stageReason, setStageReason] = useState(""),
    [actual, setActual] = useState(false),
    [override, setOverride] = useState(false);
  const openedLink = useRef("");
  useEffect(() => {
    if (!params.taskId || openedLink.current === params.taskId) return;
    const linked = w.tasks.find((t) => t.id === params.taskId);
    if (!linked) return;
    const timer = setTimeout(() => {
      openedLink.current = params.taskId || "";
      setTask(linked);
      setNotes(linked.notes);
      setObservedAt(
        linked.evidenceObservedAt
          ? new Date(linked.evidenceObservedAt).toISOString()
          : " ".trim(),
      );
      setAttachments(linked.attachments);
    }, 0);
    return () => clearTimeout(timer);
  }, [params.taskId, w.tasks]);
  useEffect(() => {
    if (!task) return;
    const live = w.tasks.find((t) => t.id === task.id);
    if (
      !live ||
      live.revision === task.revision ||
      notes !== task.notes ||
      JSON.stringify(attachments) !== JSON.stringify(task.attachments)
    )
      return;
    const timer = setTimeout(() => {
      setTask(live);
      setNotes(live.notes);
      setAttachments(live.attachments);
    }, 0);
    return () => clearTimeout(timer);
  }, [w.tasks, task, notes, attachments]);
  const run = async (fn: () => Promise<unknown>) => {
    try {
      setMessage("");
      return await fn();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to complete the change.",
      );
      return null;
    }
  };
  const pick = async (taskId?: string) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return null;
    return client.upload(result.assets[0], taskId);
  };
  const patch = (i: number, change: Partial<SopStep>) =>
    setDefinition((d) =>
      d
        ? {
            ...d,
            steps: d.steps.map((s, index) =>
              index === i ? { ...s, ...change } : s,
            ),
          }
        : d,
    );
  const beginAdoption = (s: SopDocument) => {
    setAdopting(s);
    setManager(
      w.members.find((m) => ["owner", "co-owner", "manager"].includes(m.role))
        ?.id || "",
    );
    setPreview(null);
    setPonds([]);
    setBlocks([]);
  };
  const filtered = w.tasks.filter(
    (t) =>
      (status === "all" ||
        (status === "active" &&
          !["completed", "waived", "cancelled"].includes(t.status)) ||
        t.status === status) &&
      (!person || t.assigneeId === person) &&
      (!pond || t.target.id === pond) &&
      (!block || t.target.blockId === block) &&
      (!urgency || t.step?.severity === urgency) &&
      (!date ||
        new Intl.DateTimeFormat("en-CA", {
          timeZone: w.timeZone || "UTC",
        }).format(new Date(t.dueAt)) === date) &&
      (!params.adoptionId || t.adoptionId === params.adoptionId) &&
      (!params.issueId || t.issueId === params.issueId),
  );
  const summary = sopSummary(w);
  const submitTask = async () => {
    if (!task) return;
    const result = await client.command({
      action: "submitEvidence",
      taskId: task.id,
      expectedRevision: task.revision,
      observedAt,
      notes,
      attachments,
    });
    setMessage(
      result.pending ? c.pending : ui("Evidence submitted for verification."),
    );
    setTask(null);
  };
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Button title={c.back} onPress={() => router.back()} />
        <Text style={styles.heading}>{mode === "sops" ? c.sops : c.todo}</Text>
        <Button
          title={mode === "sops" ? c.todo : c.sops}
          onPress={() => router.push(mode === "sops" ? "/todo" : "/sops")}
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {client.loading && <ActivityIndicator color="#0F4C75" />}
        {!!(message || client.error) && (
          <Text accessibilityRole="alert" style={styles.alert}>
            {message || client.error}
          </Text>
        )}
        {!!client.pending.length && (
          <Text style={styles.text}>
            {c.pending}: {client.pending.length}
          </Text>
        )}
        {mode === "sops" && !definition && !adopting && (
          <Choices
            label=""
            values={[
              { id: "library", title: c.library },
              { id: "community", title: c.community },
              { id: "adopted", title: c.adopted },
              { id: "dashboard", title: c.dashboard },
              { id: "history", title: c.history },
            ]}
            selected={[tab]}
            onChange={setTab}
          />
        )}
        {mode === "sops" && tab === "library" && !definition && !adopting && (
          <>
            <Button
              title={c.create}
              onPress={() => {
                setEditing(null);
                setDefinition(JSON.parse(JSON.stringify(SOP_TEMPLATES[0])));
              }}
            />
            <Text style={styles.subheading}>{ui("Starter templates")}</Text>
            {SOP_TEMPLATES.map((t) => (
              <View key={t.title} style={styles.card}>
                <Text style={styles.subheading}>{ui(t.title)}</Text>
                <Text style={styles.text}>{ui(t.description)}</Text>
                <Button
                  title={ui("Customize template")}
                  onPress={() => {
                    setEditing(null);
                    setDefinition(JSON.parse(JSON.stringify(t)));
                  }}
                />
              </View>
            ))}
            {w.sops.map((s) => (
              <View style={styles.card} key={s.id}>
                <Text style={styles.subheading}>{s.title}</Text>
                <Text style={styles.text}>
                  {ui(s.status)} {ui("· revision")} {s.revision}
                </Text>
                {s.source && (
                  <Text style={styles.text}>
                    {s.source.author} · {s.source.versionId}
                  </Text>
                )}
                <Button
                  title={ui("Edit / view")}
                  onPress={() => {
                    setEditing(s);
                    setDefinition(JSON.parse(JSON.stringify(s.definition)));
                  }}
                />
                <Button
                  title={ui("Version history")}
                  onPress={() =>
                    void run(async () =>
                      setVersionHistory({
                        sopId: s.id,
                        ...(await client.versions(s.id)),
                      }),
                    )
                  }
                />
                <Button
                  title={c.translate}
                  onPress={() =>
                    void run(async () => {
                      const translation = await client.assist({
                        mode: "translate",
                        sopId: s.id,
                        language: currentLanguage,
                      });
                      setMessage(
                        `${c.original}\n${(translation.translation as { title: string }).title}\n${((translation.translation as { steps: { title: string; instructions: string }[] }).steps || []).map((s) => `${s.title}\n${s.instructions}`).join("\n\n")}`,
                      );
                    })
                  }
                />
                {w.manage && (
                  <>
                    <Button
                      title={c.approve}
                      disabled={client.busy}
                      onPress={() =>
                        void run(() =>
                          client.command({
                            action: "approve",
                            sopId: s.id,
                            expectedRevision: s.revision,
                          }),
                        )
                      }
                    />
                    {s.approvedVersionId && s.status === "approved" && (
                      <>
                        <Button
                          title={c.publish}
                          disabled={client.busy}
                          onPress={() =>
                            void run(() =>
                              client.command({
                                action: "publish",
                                sopId: s.id,
                                expectedRevision: s.revision,
                              }),
                            )
                          }
                        />
                        <Button
                          title={c.adopt}
                          onPress={() => beginAdoption(s)}
                        />
                      </>
                    )}
                  </>
                )}
              </View>
            ))}
          </>
        )}
        {mode === "sops" &&
          tab === "community" &&
          w.community.map((s) => (
            <View style={styles.card} key={s.id}>
              <Text style={styles.subheading}>{s.title}</Text>
              <Text style={styles.text}>
                {s.author} · {s.adoptionCount} {ui("adopting farms")}
              </Text>
              <Text style={styles.text}>{s.definition.description}</Text>
              {(s.definition.attachments || []).map((a) => (
                <Button
                  key={a.path}
                  title={a.name}
                  onPress={() => void run(() => client.openAttachment(a))}
                />
              ))}
              {s.definition.steps.map((step) => (
                <View key={step.id}>
                  <Text style={styles.label}>{step.title}</Text>
                  <Text style={styles.text}>{step.instructions}</Text>
                </View>
              ))}
              <Button
                title={ui("Create editable farm copy")}
                onPress={() =>
                  void run(async () => {
                    await client.command({
                      action: "copyPublication",
                      publicationId: s.id,
                    });
                    setTab("library");
                  })
                }
              />
              <Input
                label={ui("Report / withdrawal reason")}
                value={reason}
                onChange={setReason}
              />
              <Button
                title={ui("Report")}
                onPress={() =>
                  void run(() =>
                    client.command({
                      action: "report",
                      publicationId: s.id,
                      reason,
                    }),
                  )
                }
              />
              {w.manage && (
                <Button
                  title={ui("Withdraw own publication")}
                  onPress={() =>
                    void run(() =>
                      client.command({
                        action: "withdraw",
                        publicationId: s.id,
                        reason,
                      }),
                    )
                  }
                />
              )}
            </View>
          ))}
        {mode === "sops" && tab === "dashboard" && (
          <>
            {[
              [c.recorded, `${summary.recorded}/${summary.total}`],
              [
                c.targets,
                `${summary.pass} pass · ${summary.fail} outside target`,
              ],
              [c.missing, String(summary.missing)],
              [c.exceptions, String(summary.exempt)],
              [c.issues, String(summary.issues)],
            ].map(([label, value]) => (
              <View key={label} style={styles.card}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.heading}>{value}</Text>
              </View>
            ))}
          </>
        )}
        {mode === "sops" &&
          tab === "history" &&
          w.issues.map((i) => (
            <View style={styles.card} key={i.id}>
              <Text style={styles.subheading}>{i.title}</Text>
              <Text style={styles.text}>
                {i.target.name} · {i.severity} · {i.status}
              </Text>
              <Text style={styles.text}>
                {i.rechecks} {ui("rechecks ·")}{" "}
                {i.recoveryVerified
                  ? ui("Recovery verified")
                  : ui("Recovery required")}
              </Text>
              {i.failureExplanation && (
                <Text style={styles.text}>{i.failureExplanation}</Text>
              )}
              {i.openedAt && (
                <Text style={styles.text}>
                  {ui("Opened")}:{" "}
                  {new Date(i.openedAt).toLocaleString(currentLanguage)}
                  {i.closedAt
                    ? ` · ${ui("Closed")}: ${new Date(i.closedAt).toLocaleString(currentLanguage)}`
                    : ""}
                </Text>
              )}
              <Button
                title={c.review}
                onPress={() =>
                  router.push({ pathname: "/todo", params: { issueId: i.id } })
                }
              />
            </View>
          ))}
        {mode === "sops" && tab === "adopted" && (
          <>
            {w.adoptions.map((ad) => (
              <View style={styles.card} key={ad.id}>
                <Text style={styles.subheading}>{ad.title}</Text>
                <Text style={styles.text}>
                  {ui(ad.status)} · {ui(ad.lifetime)} · {ad.targets.length}{" "}
                  {ui("targets")}
                </Text>
                <Button
                  title={c.todo}
                  onPress={() =>
                    router.push({
                      pathname: "/todo",
                      params: { adoptionId: ad.id },
                    })
                  }
                />
                {w.manage && (
                  <>
                    <Button
                      title={ui("Preview membership")}
                      onPress={() =>
                        void run(async () => {
                          const result = await client.command({
                            action: "previewMembership",
                            adoptionId: ad.id,
                            expectedRevision: ad.revision,
                          });
                          setMessage(
                            `Targets: ${(result.targets as { name: string }[]).map((t) => t.name).join(", ")}\n${(result.conflicts as string[]).join("\n")}`,
                          );
                        })
                      }
                    />
                    <Button
                      title={ui("Apply reviewed membership")}
                      onPress={() =>
                        void run(() =>
                          client.command({
                            action: "refreshMembership",
                            adoptionId: ad.id,
                            expectedRevision: ad.revision,
                          }),
                        )
                      }
                    />
                    <Button
                      title={ui("Pause")}
                      onPress={() =>
                        void run(() =>
                          client.command({
                            action: "pause",
                            adoptionId: ad.id,
                            expectedRevision: ad.revision,
                          }),
                        )
                      }
                    />
                    <Button
                      title={ui("Retire")}
                      onPress={() =>
                        void run(() =>
                          client.command({
                            action: "retire",
                            adoptionId: ad.id,
                            expectedRevision: ad.revision,
                          }),
                        )
                      }
                    />
                    <Button
                      title={ui("Review update and unresolved work")}
                      onPress={() =>
                        void run(async () => {
                          const result = await client.command({
                            action: "previewUpdate",
                            adoptionId: ad.id,
                            sopId: ad.sopId,
                            expectedRevision: ad.revision,
                          });
                          setUpdateReview({
                            adoptionId: ad.id,
                            sopId: ad.sopId,
                            revision: ad.revision,
                            result,
                          });
                        })
                      }
                    />
                  </>
                )}
              </View>
            ))}
            {
              <View style={styles.card}>
                <Text style={styles.subheading}>{ui("Production stage")}</Text>
                <Choices
                  label={ui("Pond")}
                  values={w.physicalPonds.map((p) => ({
                    id: p.id,
                    title: p.pondName,
                  }))}
                  selected={[stageTarget]}
                  onChange={setStageTarget}
                />
                <Choices
                  label={ui("Next stage")}
                  values={vals(SOP_STAGES)}
                  selected={[stage]}
                  onChange={setStage}
                />
                <Input
                  label={ui("Exception / actual-event reason")}
                  value={stageReason}
                  onChange={setStageReason}
                />
                <View style={styles.switch}>
                  <Text>{ui("Event already happened")}</Text>
                  <Switch
                    value={w.manage ? actual : true}
                    disabled={!w.manage}
                    onValueChange={setActual}
                  />
                </View>
                <View style={styles.switch}>
                  <Text>{ui("Manager exception")}</Text>
                  <Switch
                    value={override}
                    disabled={!w.manage}
                    onValueChange={setOverride}
                  />
                </View>
                <Button
                  title={ui("Record transition")}
                  disabled={!stageTarget}
                  onPress={() =>
                    void run(() =>
                      client.command({
                        action: "stage",
                        targetId: stageTarget,
                        stage,
                        reason: stageReason,
                        actual: w.manage ? actual : true,
                        override: w.manage && override,
                      }),
                    )
                  }
                />
              </View>
            }
          </>
        )}
        {mode === "sops" && tab === "library" && w.nextSopCursor && (
          <Button
            title={ui("Load older SOPs")}
            onPress={() => void run(() => client.loadMore("sops"))}
          />
        )}
        {mode === "sops" && tab === "community" && w.nextCommunityCursor && (
          <Button
            title={ui("More community procedures")}
            onPress={() => void run(() => client.loadMore("community"))}
          />
        )}
        {mode === "sops" && tab === "adopted" && w.nextAdoptionCursor && (
          <Button
            title={ui("More adoptions")}
            onPress={() => void run(() => client.loadMore("adoptions"))}
          />
        )}
        {updateReview && (
          <View style={styles.card}>
            <Text style={styles.subheading}>
              {ui("Review approved version")}{" "}
              {String(updateReview.result.versionId)}
            </Text>
            <Text style={styles.text}>
              {String(updateReview.result.migrationTotal || 0)}{" "}
              {ui(
                "unresolved tasks affected. Future updates keep existing rules; migration retains prior history.",
              )}
            </Text>
            {(
              (updateReview.result.unresolved || []) as {
                id: string;
                title: string;
                target: string;
                oldInstructions: string;
                newInstructions: string;
                oldCheck: {
                  min: number | null;
                  max: number | null;
                  unit: string;
                };
                newCheck: {
                  min: number | null;
                  max: number | null;
                  unit: string;
                } | null;
                scopeReplacement: boolean;
              }[]
            ).map((t) => (
              <View key={t.id}>
                <Text style={styles.label}>
                  {t.title} · {t.target}
                </Text>
                <Text style={styles.text}>
                  {ui("Previous:")} {t.oldInstructions}
                </Text>
                <Text style={styles.text}>
                  {t.oldCheck?.min ?? "—"} {ui("to")} {t.oldCheck?.max ?? "—"}{" "}
                  {t.oldCheck?.unit}
                </Text>
                <Text style={styles.text}>
                  {ui("Approved:")} {t.newInstructions}
                </Text>
                <Text style={styles.text}>
                  {t.newCheck?.min ?? "—"} {ui("to")} {t.newCheck?.max ?? "—"}{" "}
                  {t.newCheck?.unit}
                </Text>
                {t.scopeReplacement && (
                  <Text>
                    {ui("Scope changed; this occurrence will be cancelled.")}
                  </Text>
                )}
              </View>
            ))}
            {((updateReview.result.conflicts as string[]) || []).map((c) => (
              <Text key={c}>{c}</Text>
            ))}
            <Button
              title={ui("Apply to future work")}
              disabled={
                client.busy ||
                !!(updateReview.result.conflicts as string[]).length
              }
              onPress={() =>
                void run(async () => {
                  await client.command({
                    action: "activate",
                    adoptionId: updateReview.adoptionId,
                    sopId: updateReview.sopId,
                    expectedRevision: updateReview.revision,
                    expectedVersionId: updateReview.result.versionId,
                  });
                  setUpdateReview(null);
                })
              }
            />
            <Button
              title={ui("Migrate reviewed unresolved work")}
              disabled={
                client.busy ||
                !!(updateReview.result.conflicts as string[]).length
              }
              onPress={() =>
                void run(async () => {
                  const result = await client.command({
                    action: "migrate",
                    adoptionId: updateReview.adoptionId,
                    sopId: updateReview.sopId,
                    expectedRevision: updateReview.revision,
                    expectedVersionId: updateReview.result.versionId,
                    confirmMigration: true,
                  });
                  setMessage(
                    `${result.migrationCount || 0} tasks migrated. ${result.migrationRemaining || 0} remain; preview the next batch.`,
                  );
                  setUpdateReview(null);
                })
              }
            />
            <Button title={ui("Close")} onPress={() => setUpdateReview(null)} />
          </View>
        )}
        {versionHistory && (
          <View style={styles.card}>
            <Text style={styles.subheading}>{ui("Approved versions")}</Text>
            {versionHistory.items.map((v) => (
              <View key={v.id}>
                <Text style={styles.label}>
                  {v.id} · {v.definition.title}
                </Text>
                <Text style={styles.text}>
                  {ui("Approved")} {new Date(v.approvedAt).toLocaleString()}
                </Text>
                {v.definition.steps.map((step) => (
                  <View key={step.id}>
                    <Text style={styles.label}>{step.title}</Text>
                    <Text style={styles.text}>{step.instructions}</Text>
                    <Text style={styles.text}>
                      {step.check.field} · {step.check.min ?? "—"} {ui("to")}{" "}
                      {step.check.max ?? "—"} {step.check.unit}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
            {versionHistory.nextCursor && (
              <Button
                title={ui("Older versions")}
                onPress={() =>
                  void run(async () => {
                    const next = await client.versions(
                      versionHistory.sopId,
                      versionHistory.nextCursor,
                    );
                    setVersionHistory({
                      ...versionHistory,
                      items: [...versionHistory.items, ...next.items],
                      nextCursor: next.nextCursor,
                    });
                  })
                }
              />
            )}
            <Button
              title={ui("Close")}
              onPress={() => setVersionHistory(null)}
            />
          </View>
        )}
        {definition && (
          <>
            <Button title={c.back} onPress={() => setDefinition(null)} />
            <Input
              label={ui("Title")}
              value={definition.title}
              onChange={(title) => setDefinition({ ...definition, title })}
            />
            <Input
              label={ui("Description")}
              value={definition.description}
              multiline
              onChange={(description) =>
                setDefinition({ ...definition, description })
              }
            />
            <Choices
              label={ui("Original language")}
              values={vals(["en", "id", "vi", "th", "zh"])}
              selected={[definition.language]}
              onChange={(language) =>
                setDefinition({ ...definition, language })
              }
            />
            <Button
              title={ui("Attach guidance for company readers")}
              onPress={() =>
                void run(async () => {
                  const a = await pick("guidance");
                  if (a)
                    setDefinition((d) =>
                      d
                        ? { ...d, attachments: [...(d.attachments || []), a] }
                        : d,
                    );
                })
              }
            />
            {(definition.attachments || []).map((a) => (
              <Button
                key={a.path}
                title={a.name}
                onPress={() => void run(() => client.openAttachment(a))}
              />
            ))}
            <View style={styles.card}>
              <Input
                label={ui("Describe your SOP for Orson")}
                value={aiText}
                multiline
                onChange={setAiText}
              />
              <Button
                title={c.draft}
                disabled={client.busy}
                onPress={() =>
                  void run(async () => {
                    const result = await client.assist({
                      mode: "draft",
                      text: aiText,
                      language: definition.language,
                    });
                    setDefinition(result.definition as SopDefinition);
                    setMessage((result.warnings as string[]).join("\n"));
                  })
                }
              />
              <Button
                title={ui("Import PDF / DOCX / text")}
                disabled={client.busy}
                onPress={() =>
                  void run(async () => {
                    const attachment = await pick();
                    if (!attachment) return;
                    const result = await client.assist({
                      mode: "draft",
                      attachment,
                      language: definition.language,
                    });
                    setDefinition(result.definition as SopDefinition);
                    setMessage((result.warnings as string[]).join("\n"));
                  })
                }
              />
            </View>
            {definition.steps.map((s, i) => (
              <View style={styles.card} key={s.id}>
                <Button
                  title={`${i + 1}. ${s.title}`}
                  onPress={() => setOpenStep(openStep === i ? -1 : i)}
                />
                {openStep === i && (
                  <>
                    <Input
                      label={ui("Step title")}
                      value={s.title}
                      onChange={(title) => patch(i, { title })}
                    />
                    <Input
                      label={ui("Instructions")}
                      value={s.instructions}
                      multiline
                      onChange={(instructions) => patch(i, { instructions })}
                    />
                    <Choices
                      label={ui("Applies to")}
                      values={vals(["pond", "block", "company"])}
                      selected={[s.scope]}
                      onChange={(scope) =>
                        patch(i, { scope: scope as SopStep["scope"] })
                      }
                    />
                    <Choices
                      label={ui("Stages")}
                      values={vals(SOP_STAGES)}
                      selected={s.stages}
                      onChange={(stage) =>
                        patch(i, {
                          stages: toggle(s.stages, stage) as SopStep["stages"],
                        })
                      }
                    />
                    <Choices
                      label={ui("Severity")}
                      values={vals(["low", "warning", "critical"])}
                      selected={[s.severity]}
                      onChange={(severity) =>
                        patch(i, { severity: severity as SopStep["severity"] })
                      }
                    />
                    <Choices
                      label={ui("When")}
                      values={vals([
                        "daily",
                        "weekly",
                        "doc",
                        "event",
                        "stage",
                        "manual",
                      ])}
                      selected={[s.trigger.kind]}
                      onChange={(kind) =>
                        patch(i, {
                          trigger: {
                            ...s.trigger,
                            kind: kind as SopStep["trigger"]["kind"],
                          },
                        })
                      }
                    />
                    <Input
                      label={ui("Local time (HH:MM)")}
                      value={s.trigger.at}
                      onChange={(at) =>
                        patch(i, { trigger: { ...s.trigger, at } })
                      }
                    />
                    {(
                      [
                        "windowMinutes",
                        "everyDays",
                        "docFrom",
                        "docTo",
                        "offsetMinutes",
                      ] as const
                    ).map((k) => (
                      <Input
                        key={k}
                        label={sopFieldLabel(k, currentLanguage)}
                        numeric
                        value={String(s.trigger[k])}
                        onChange={(v) =>
                          patch(i, {
                            trigger: { ...s.trigger, [k]: Number(v) },
                          })
                        }
                      />
                    ))}
                    <Choices
                      label={ui("Weekly days")}
                      values={[
                        "Sun",
                        "Mon",
                        "Tue",
                        "Wed",
                        "Thu",
                        "Fri",
                        "Sat",
                      ].map((title, i) => ({ id: String(i), title }))}
                      selected={s.trigger.weekDays.map(String)}
                      onChange={(id) =>
                        patch(i, {
                          trigger: {
                            ...s.trigger,
                            weekDays: s.trigger.weekDays.includes(Number(id))
                              ? s.trigger.weekDays.filter(
                                  (d) => d !== Number(id),
                                )
                              : [...s.trigger.weekDays, Number(id)],
                          },
                        })
                      }
                    />
                    <Choices
                      label={ui("Event / stage")}
                      values={vals([
                        "stocking",
                        "harvest",
                        "treatment",
                        "measurement",
                        ...definition.steps.map((step) => `step:${step.id}`),
                        ...SOP_STAGES,
                      ])}
                      selected={[s.trigger.event]}
                      onChange={(event) =>
                        patch(i, { trigger: { ...s.trigger, event } })
                      }
                    />
                    <Choices
                      label={ui("Check")}
                      values={SOP_FIELDS.map((f) => ({
                        id: f.key,
                        title: f.label,
                      }))}
                      selected={[s.check.field]}
                      onChange={(key) => {
                        const f = SOP_FIELDS.find((f) => f.key === key)!;
                        patch(i, {
                          check: {
                            ...s.check,
                            field: key,
                            unit: f.unit,
                            basis: "",
                            exactTime: f.exactTime,
                            operator:
                              key === "manual" ? "narrative" : "present",
                          },
                        });
                      }}
                    />
                    <Choices
                      label={ui("Inventory item / equipment binding")}
                      values={[
                        { id: "", title: "Not applicable / choose record" },
                        ...w.sources
                          .filter((source) =>
                            (
                              SOP_FIELDS.find((f) => f.key === s.check.field)
                                ?.sources || [
                                SOP_FIELDS.find((f) => f.key === s.check.field)
                                  ?.source,
                              ]
                            ).includes(source.source),
                          )
                          .map((source) => ({
                            id: `${source.source}/${source.id}`,
                            title: source.label,
                          })),
                      ]}
                      selected={[s.check.sourceId || ""]}
                      onChange={(sourceId) =>
                        patch(i, { check: { ...s.check, sourceId } })
                      }
                    />
                    <Choices
                      label={ui("Condition")}
                      values={vals([
                        "present",
                        "range",
                        "equals",
                        "count",
                        "trend",
                        "sequence",
                        "narrative",
                      ])}
                      selected={[s.check.operator]}
                      onChange={(operator) =>
                        patch(i, {
                          check: {
                            ...s.check,
                            operator: operator as SopStep["check"]["operator"],
                          },
                        })
                      }
                    />
                    <Input
                      label={ui("Minimum")}
                      numeric
                      value={s.check.min === null ? "" : String(s.check.min)}
                      onChange={(v) =>
                        patch(i, {
                          check: {
                            ...s.check,
                            min: v === "" ? null : Number(v),
                          },
                        })
                      }
                    />
                    <Input
                      label={ui("Maximum")}
                      numeric
                      value={s.check.max === null ? "" : String(s.check.max)}
                      onChange={(v) =>
                        patch(i, {
                          check: {
                            ...s.check,
                            max: v === "" ? null : Number(v),
                          },
                        })
                      }
                    />
                    <Input
                      label={ui("Required value / sequence")}
                      value={s.check.value}
                      onChange={(value) =>
                        patch(i, { check: { ...s.check, value } })
                      }
                    />
                    <Input
                      label={ui("Unit")}
                      value={s.check.unit}
                      onChange={(unit) =>
                        patch(i, { check: { ...s.check, unit } })
                      }
                    />
                    <Choices
                      label={ui("Analytical basis")}
                      values={vals([
                        "",
                        "TAN-N",
                        "TAN",
                        "NH3-N",
                        "NH3",
                        "NO2-N",
                        "NO2",
                        "N",
                        "pH",
                        "salinity",
                        "CaCO3",
                      ])}
                      selected={[s.check.basis]}
                      onChange={(basis) =>
                        patch(i, { check: { ...s.check, basis } })
                      }
                    />
                    <Input
                      label={ui("Minimum records")}
                      numeric
                      value={String(s.check.minCount)}
                      onChange={(v) =>
                        patch(i, { check: { ...s.check, minCount: Number(v) } })
                      }
                    />
                    <Input
                      label={ui("Freshness minutes")}
                      numeric
                      value={String(s.check.freshnessMinutes)}
                      onChange={(v) =>
                        patch(i, {
                          check: { ...s.check, freshnessMinutes: Number(v) },
                        })
                      }
                    />
                    <View style={styles.switch}>
                      <Text>{ui("Require exact time")}</Text>
                      <Switch
                        value={s.check.exactTime}
                        onValueChange={(exactTime) =>
                          patch(i, { check: { ...s.check, exactTime } })
                        }
                      />
                    </View>
                    <Input
                      label={ui("Written-evidence rubric")}
                      value={s.check.rubric}
                      multiline
                      onChange={(rubric) =>
                        patch(i, { check: { ...s.check, rubric } })
                      }
                    />
                    <Input
                      label={ui("Corrective instructions")}
                      value={s.correctiveInstructions}
                      multiline
                      onChange={(correctiveInstructions) =>
                        patch(i, { correctiveInstructions })
                      }
                    />
                    {(
                      [
                        "recheckMinutes",
                        "maxRechecks",
                        "escalationMinutes",
                      ] as const
                    ).map((k) => (
                      <Input
                        key={k}
                        label={sopFieldLabel(k, currentLanguage)}
                        numeric
                        value={String(s[k])}
                        onChange={(v) => patch(i, { [k]: Number(v) })}
                      />
                    ))}
                    <Choices
                      label={ui("Assignee override")}
                      values={[
                        { id: "", title: "Block technician / manager" },
                        ...w.members.map((m) => ({ id: m.id, title: m.name })),
                      ]}
                      selected={[s.assigneeId]}
                      onChange={(assigneeId) => patch(i, { assigneeId })}
                    />
                    {(["dependsOn", "onPass", "onFail"] as const).map((k) => (
                      <Choices
                        key={k}
                        label={ui(
                          k === "dependsOn"
                            ? "Dependencies"
                            : k === "onPass"
                              ? "On pass"
                              : "On failure",
                        )}
                        values={definition.steps
                          .filter((t) => t.id !== s.id)
                          .map((t) => ({ id: t.id, title: t.title }))}
                        selected={s[k]}
                        onChange={(id) => patch(i, { [k]: toggle(s[k], id) })}
                      />
                    ))}
                    <Choices
                      label={ui("Gate next stage")}
                      values={[
                        { id: "", title: "No gate" },
                        ...vals(SOP_STAGES),
                      ]}
                      selected={[s.gateStage]}
                      onChange={(gateStage) =>
                        patch(i, {
                          gateStage: gateStage as SopStep["gateStage"],
                        })
                      }
                    />
                    <View style={styles.switch}>
                      <Text>{ui("Require notes")}</Text>
                      <Switch
                        value={s.requireNotes}
                        onValueChange={(requireNotes) =>
                          patch(i, { requireNotes })
                        }
                      />
                    </View>
                    <View style={styles.switch}>
                      <Text>{ui("Require attachment")}</Text>
                      <Switch
                        value={s.requireAttachment}
                        onValueChange={(requireAttachment) =>
                          patch(i, { requireAttachment })
                        }
                      />
                    </View>
                    <Button
                      title={ui("Remove step")}
                      onPress={() =>
                        setDefinition({
                          ...definition,
                          steps: definition.steps
                            .filter((t) => t.id !== s.id)
                            .map((t) => ({
                              ...t,
                              dependsOn: t.dependsOn.filter(
                                (id) => id !== s.id,
                              ),
                              onPass: t.onPass.filter((id) => id !== s.id),
                              onFail: t.onFail.filter((id) => id !== s.id),
                            })),
                        })
                      }
                    />
                  </>
                )}
              </View>
            ))}
            <Button
              title={ui("Add step")}
              onPress={() =>
                setDefinition({
                  ...definition,
                  steps: [
                    ...definition.steps,
                    emptySopStep(`step-${Date.now()}`),
                  ],
                })
              }
            />
            <View style={styles.card}>
              <Text style={styles.subheading}>{ui("Workflow preview")}</Text>
              <SopFlowPreview definition={definition} />
              {definition.steps.map((s) => (
                <Text style={styles.text} key={s.id}>
                  {s.title} → {s.check.field}{" "}
                  {ui("→ corrective action → recheck")} {s.recheckMinutes}{" "}
                  {ui("min → escalate")} {s.escalationMinutes} {ui("min")}
                </Text>
              ))}
            </View>
            {validateSop(definition).map((e) => (
              <Text style={styles.alert} key={e}>
                {e}
              </Text>
            ))}
            <Button
              title={c.save}
              disabled={client.busy}
              onPress={() =>
                void run(async () => {
                  await client.command({
                    action: "saveDraft",
                    sopId: editing?.id,
                    expectedRevision: editing?.revision,
                    definition,
                  });
                  setDefinition(null);
                })
              }
            />
          </>
        )}
        {adopting && (
          <View style={styles.card}>
            <Text style={styles.subheading}>
              {c.adopt}: {adopting.title}
            </Text>
            <Choices
              label={ui("Blocks (follow membership)")}
              values={w.blocks.map((b) => ({ id: b.id, title: b.name }))}
              selected={blocks}
              onChange={(id) => {
                setBlocks(toggle(blocks, id));
                setPreview(null);
              }}
            />
            <Choices
              label={ui("Selected ponds")}
              values={[
                ...w.physicalPonds,
                ...w.ponds
                  .filter(
                    (p) =>
                      !w.physicalPonds.some((q) => q.id === p.physicalPondId),
                  )
                  .map((p) => ({ ...p, id: p.physicalPondId })),
              ].map((p) => ({ id: p.id, title: p.pondName }))}
              selected={ponds}
              onChange={(id) => {
                setPonds(toggle(ponds, id));
                setPreview(null);
              }}
            />
            <Choices
              label={ui("Lifetime")}
              values={vals(["cycle", "standing"])}
              selected={[lifetime]}
              onChange={(id) => {
                setLifetime(id);
                setPreview(null);
              }}
            />
            <Choices
              label={ui("Accountable manager")}
              values={w.members
                .filter((m) =>
                  ["owner", "co-owner", "manager"].includes(m.role),
                )
                .map((m) => ({ id: m.id, title: m.name }))}
              selected={[manager]}
              onChange={(id) => {
                setManager(id);
                setPreview(null);
              }}
            />
            <Choices
              label={ui("Escalation recipients")}
              values={w.members.map((m) => ({ id: m.id, title: m.name }))}
              selected={recipients}
              onChange={(id) => {
                setRecipients(toggle(recipients, id));
                setPreview(null);
              }}
            />
            <Text style={styles.text}>{w.timeZone}</Text>
            <Button
              title={c.preview}
              disabled={client.busy}
              onPress={() =>
                void run(async () =>
                  setPreview(
                    await client.command({
                      action: "previewAdoption",
                      sopId: adopting.id,
                      blockIds: blocks,
                      pondIds: ponds,
                      lifetime,
                      managerId: manager,
                      recipients,
                    }),
                  ),
                )
              }
            />
            {preview && (
              <>
                {(
                  preview.targets as {
                    id: string;
                    name: string;
                    stage: string;
                  }[]
                ).map((t) => (
                  <Text key={t.id} style={styles.text}>
                    {t.name} · {t.stage}
                  </Text>
                ))}
                {(preview.conflicts as string[]).map((e) => (
                  <Text style={styles.alert} key={e}>
                    {e}
                  </Text>
                ))}
                <Button
                  title={c.activate}
                  disabled={
                    client.busy || (preview.conflicts as string[]).length > 0
                  }
                  onPress={() =>
                    void run(async () => {
                      await client.command({
                        action: "activate",
                        sopId: adopting.id,
                        expectedVersionId: preview.versionId,
                        blockIds: blocks,
                        pondIds: ponds,
                        lifetime,
                        managerId: manager,
                        recipients,
                      });
                      setAdopting(null);
                      setTab("adopted");
                    })
                  }
                />
              </>
            )}
            <Button title={ui("Close")} onPress={() => setAdopting(null)} />
          </View>
        )}
        {mode === "todo" && !task && !manual && (
          <>
            <Input
              label={ui("Routine quiet hours start (HH:MM)")}
              value={quietStart}
              onChange={setQuietStart}
            />
            <Input
              label={ui("Routine quiet hours end (HH:MM)")}
              value={quietEnd}
              onChange={setQuietEnd}
            />
            <Button
              title={ui("Enable mobile reminders")}
              onPress={() =>
                void run(async () => {
                  if (company?.id) {
                    const result = await enableSopPush(company.id, {
                      quietStart,
                      quietEnd,
                    });
                    setMessage(result.reason);
                  }
                })
              }
            />
            <Button title={c.manual} onPress={() => setManual(true)} />
            <Choices
              label={ui("Status")}
              values={vals([
                "active",
                "all",
                "open",
                "submitted",
                "needs_review",
                "completed",
                "waived",
                "cancelled",
              ])}
              selected={[status]}
              onChange={setStatus}
            />
            <Choices
              label={ui("Responsible person")}
              values={[
                { id: "", title: "All" },
                ...w.members.map((m) => ({ id: m.id, title: m.name })),
              ]}
              selected={[person]}
              onChange={setPerson}
            />
            <Choices
              label={ui("Pond")}
              values={[
                { id: "", title: "All" },
                ...w.physicalPonds.map((p) => ({
                  id: p.id,
                  title: p.pondName,
                })),
              ]}
              selected={[pond]}
              onChange={setPond}
            />
            <Choices
              label={ui("Block")}
              values={[
                { id: "", title: "All" },
                ...w.blocks.map((b) => ({ id: b.id, title: b.name })),
              ]}
              selected={[block]}
              onChange={setBlock}
            />
            <Choices
              label={ui("Urgency")}
              values={[
                { id: "", title: "All" },
                ...vals(["low", "warning", "critical"]),
              ]}
              selected={[urgency]}
              onChange={setUrgency}
            />
            <Input
              label={ui("Due date (YYYY-MM-DD)")}
              value={date}
              onChange={setDate}
            />
            {filtered.map((t) => (
              <View style={styles.card} key={t.id}>
                <Text style={styles.subheading}>{t.title}</Text>
                <Text style={styles.text}>
                  {t.target.name} · {ui(t.status)} · {ui(t.result)}
                </Text>
                <Text style={styles.text}>
                  {new Date(t.dueAt).toLocaleString(currentLanguage, {
                    timeZone: w.timeZone || "UTC",
                  })}
                </Text>
                <Text style={styles.text}>{t.instructions}</Text>
                {client.pending.includes(t.id) && (
                  <Text style={styles.text}>{c.pending}</Text>
                )}
                <Button
                  title={c.review}
                  onPress={() => {
                    setTask(t);
                    setNotes(t.notes);
                    setObservedAt(
                      t.evidenceObservedAt
                        ? new Date(t.evidenceObservedAt).toISOString()
                        : "",
                    );
                    setAttachments(t.attachments);
                    setReason("");
                  }}
                />
                {t.target.pondId && (
                  <Button
                    title={ui("Open pond")}
                    onPress={() =>
                      router.push({
                        pathname: "/ponddetails",
                        params: { pondId: t.target.pondId },
                      })
                    }
                  />
                )}
              </View>
            ))}
            {!filtered.length && (
              <Text style={styles.text}>
                {ui("No tasks match these filters.")}
              </Text>
            )}
            {w.notifications.map((n) => (
              <View key={n.id} style={styles.card}>
                <Text style={styles.label}>{n.title}</Text>
                <Text style={styles.text}>{n.message}</Text>
                {!n.read && (
                  <Button
                    title={ui("Mark read")}
                    onPress={() =>
                      void run(() =>
                        client.command({
                          action: "markRead",
                          notificationId: n.id,
                        }),
                      )
                    }
                  />
                )}
              </View>
            ))}
          </>
        )}
        {mode === "todo" && w.nextTaskCursor && (
          <Button
            title={ui("Load older tasks")}
            onPress={() => void run(() => client.loadMore("tasks"))}
          />
        )}
        {mode === "sops" && tab === "history" && w.nextIssueCursor && (
          <Button
            title={ui("Load older issues")}
            onPress={() => void run(() => client.loadMore("issues"))}
          />
        )}
        {task && (
          <View style={styles.card}>
            <Text style={styles.subheading}>{task.title}</Text>
            <Text style={styles.text}>{task.instructions}</Text>
            <Input
              label={ui("When performed (ISO time)")}
              value={observedAt}
              onChange={setObservedAt}
            />
            <Button
              title={ui("Use current time")}
              onPress={() => setObservedAt(new Date().toISOString())}
            />
            <Input
              label={c.notes}
              value={notes}
              multiline
              onChange={setNotes}
            />
            <Button
              title={c.attachment}
              onPress={() =>
                void run(async () => {
                  const attachment = await pick(task.id);
                  if (attachment) setAttachments((v) => [...v, attachment]);
                })
              }
            />
            {attachments.map((a) => (
              <Button
                key={a.path}
                title={a.name}
                onPress={() => void run(() => client.openAttachment(a))}
              />
            ))}
            <Button
              title={c.submit}
              disabled={client.busy}
              onPress={() => void run(submitTask)}
            />
            {task.step?.check.field === "manual" && (
              <Button
                title={ui("Ask Orson to assess saved notes")}
                onPress={() =>
                  void run(async () => {
                    const r = await client.assist({
                      mode: "assess",
                      taskId: task.id,
                    });
                    setMessage(`${r.result}: ${r.explanation}`);
                    await client.refresh();
                  })
                }
              />
            )}
            {w.manage && (
              <>
                <Input
                  label={ui("Manager reason")}
                  value={reason}
                  multiline
                  onChange={setReason}
                />
                {["pass", "fail", "not_applicable"].map((result) => (
                  <Button
                    key={result}
                    title={`Review as ${result}`}
                    disabled={client.busy || !reason}
                    onPress={() =>
                      void run(async () => {
                        await client.command({
                          action: "review",
                          taskId: task.id,
                          result,
                          reason,
                          expectedRevision: task.revision,
                        });
                        setTask(null);
                      })
                    }
                  />
                ))}
                {["waive", "cancel"].map((action) => (
                  <Button
                    key={action}
                    title={action}
                    disabled={!reason}
                    onPress={() =>
                      void run(async () => {
                        await client.command({
                          action,
                          taskId: task.id,
                          reason,
                          expectedRevision: task.revision,
                        });
                        setTask(null);
                      })
                    }
                  />
                ))}
                <Input
                  label={ui("New deadline (ISO time with timezone)")}
                  value={newDue}
                  onChange={setNewDue}
                />
                <Button
                  title={ui("Postpone")}
                  disabled={!reason || !newDue}
                  onPress={() =>
                    void run(async () => {
                      await client.command({
                        action: "postpone",
                        taskId: task.id,
                        reason,
                        dueAt: Date.parse(newDue),
                        expectedRevision: task.revision,
                      });
                      setTask(null);
                    })
                  }
                />
                <Choices
                  label={ui("Reassign")}
                  values={w.members.map((m) => ({ id: m.id, title: m.name }))}
                  selected={[newAssignee]}
                  onChange={setNewAssignee}
                />
                <Button
                  title={ui("Apply assignee")}
                  disabled={!newAssignee}
                  onPress={() =>
                    void run(async () => {
                      await client.command({
                        action: "reassign",
                        taskId: task.id,
                        assigneeId: newAssignee,
                        expectedRevision: task.revision,
                      });
                      setTask(null);
                    })
                  }
                />
              </>
            )}
            <Button title={ui("Close")} onPress={() => setTask(null)} />
          </View>
        )}
        {manual && (
          <View style={styles.card}>
            <Text style={styles.subheading}>{c.manual}</Text>
            <Choices
              label={ui("Urgency")}
              values={vals(["low", "warning", "critical"])}
              selected={[manualSeverity]}
              onChange={setManualSeverity}
            />
            <Input label={ui("Title")} value={title} onChange={setTitle} />
            <Input
              label={ui("Instructions")}
              value={instructions}
              multiline
              onChange={setInstructions}
            />
            <Choices
              label={ui("Responsible person")}
              values={[
                { id: user?.uid || "", title: "Myself" },
                ...(w.manage
                  ? w.members.map((m) => ({ id: m.id, title: m.name }))
                  : []),
              ]}
              selected={[assignee]}
              onChange={setAssignee}
            />
            <Choices
              label={ui("Applies to")}
              values={vals(["company", "block", "pond"])}
              selected={[manualScope]}
              onChange={(v) => {
                setManualScope(v);
                setManualTarget("");
              }}
            />
            {manualScope !== "company" && (
              <Choices
                label={ui("Target")}
                values={
                  manualScope === "block"
                    ? w.blocks.map((b) => ({ id: b.id, title: b.name }))
                    : w.physicalPonds.map((p) => ({
                        id: p.id,
                        title: p.pondName,
                      }))
                }
                selected={[manualTarget]}
                onChange={setManualTarget}
              />
            )}
            <Input
              label={ui("Due time (ISO, include timezone)")}
              value={due}
              onChange={setDue}
            />
            <Button
              title={ui("Create task")}
              disabled={!title || !due || client.busy}
              onPress={() =>
                void run(async () => {
                  await client.command({
                    action: "manualTask",
                    severity: manualSeverity,
                    title,
                    instructions,
                    scope: manualScope,
                    targetId: manualTarget,
                    assigneeId: assignee || undefined,
                    dueAt: Date.parse(due),
                  });
                  setManual(false);
                })
              }
            />
            <Button title={ui("Close")} onPress={() => setManual(false)} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  content: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    padding: 18,
    paddingBottom: 70,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#dce6ec",
  },
  heading: {
    flex: 1,
    flexShrink: 1,
    paddingHorizontal: 8,
    textAlign: "center",
    fontSize: 25,
    fontWeight: "700",
    color: "#0F4C75",
  },
  subheading: {
    fontSize: 19,
    fontWeight: "600",
    color: "#18344b",
    marginBottom: 10,
  },
  text: { fontSize: 15, lineHeight: 23, color: "#526b7d" },
  label: { fontSize: 14, fontWeight: "600", color: "#18344b", marginBottom: 7 },
  card: {
    backgroundColor: "white",
    padding: 18,
    borderWidth: 1,
    borderColor: "#dce6ec",
    borderRadius: 12,
    marginVertical: 8,
  },
  button: {
    maxWidth: "100%",
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#cbdde8",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    marginVertical: 5,
  },
  buttonText: { color: "#0F4C75", fontSize: 14, fontWeight: "600" },
  field: { marginVertical: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#c9dae6",
    padding: 11,
    borderRadius: 7,
    color: "#18344b",
    backgroundColor: "white",
    fontSize: 15,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: {
    maxWidth: "100%",
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#cbdde8",
    padding: 9,
    borderRadius: 7,
  },
  selectedChoice: { backgroundColor: "#0F4C75" },
  selectedText: { color: "white", fontSize: 14 },
  switch: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 9,
  },
  alert: {
    color: "#8f3524",
    backgroundColor: "#fff3ed",
    padding: 12,
    borderRadius: 8,
    marginVertical: 7,
    fontSize: 14,
  },
});

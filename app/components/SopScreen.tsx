import {
  adoptionPonds,
  adoptionPreview,
  confirmedAdoption,
  existingSopAdoption,
} from "../../shared/sop/adoption";
import {
  SOP_INTERFACE_LANGUAGES,
  sopMeasurementLabel,
  sopCheckModeLabel,
  sopCheckModes,
  sopSimpleCheckModes,
  sopTargetLabel,
  sopScheduleLabel,
  sopTimingLabel,
  sopEditorIssue,
  sopIssueLinks,
} from "../../shared/sop/editor";
import { sopLibrarySummary } from "../../shared/sop/library";
import { sopText, sopFieldLabel } from "../../shared/sop/uiCopy";
import { SopFlowPreview } from "./SopFlowPreview";
import { SopContentEditor, SopContentView } from "./SopContent";
import { SopReader } from "./SopReader";
import { SopEditorNavigation, SopEditorAnchor } from "./SopEditorNavigation";
import {
  generateAndSaveSopDraft,
  saveSopDraft,
  type SopDraftProgress,
} from "../../shared/sop/draft";
import { enableSopPush } from "../hooks/useSopPush";
import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
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
  type SopAdoption,
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
  expanded,
  variant = "secondary",
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  expanded?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      disabled={disabled}
      style={[
        styles.button,
        variant === "primary" && styles.primaryButton,
        variant === "danger" && styles.dangerButton,
        disabled && { opacity: 0.45 },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.buttonText,
          variant === "primary" && { color: "white" },
          variant === "danger" && { color: "#a83229" },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}
function SopEditorDisclosure({
  title,
  children,
  reveal,
}: {
  reveal?: { id: string } | null;
  title: string;
  children: React.ReactNode;
}) {
  const [disclosure, setDisclosure] = useState<{
    open: boolean;
    request?: { id: string } | null;
  }>({ open: false });
  const open = reveal && disclosure.request !== reveal ? true : disclosure.open;
  return (
    <View style={styles.field}>
      <Button
        title={title}
        expanded={open}
        onPress={() => setDisclosure({ open: !open, request: reveal })}
      />
      {open && children}
    </View>
  );
}
function Input({
  label,
  value,
  onChange,
  numeric = false,
  multiline = false,
  id,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
  multiline?: boolean;
}) {
  const focusRef = useRef<TextInput>(null);
  return (
    <SopEditorAnchor id={id} focusRef={focusRef}>
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          ref={focusRef}
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
    </SopEditorAnchor>
  );
}
function Choices({
  label,
  values,
  selected,
  onChange,
  id,
  disabled = false,
}: {
  id?: string;
  disabled?: boolean;
  label: string;
  values: { id: string; title: string }[];
  selected: string[];
  onChange: (id: string) => void;
}) {
  const { currentLanguage } = useLanguage();
  return (
    <SopEditorAnchor id={id}>
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.row}>
          {values.map((v) => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{
                selected: selected.includes(v.id),
                disabled,
              }}
              disabled={disabled}
              key={v.id}
              style={[
                styles.choice,
                selected.includes(v.id) && styles.selectedChoice,
                disabled && { opacity: 0.5 },
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
    </SopEditorAnchor>
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
    { currentLanguage, setLanguage } = useLanguage(),
    { user, company } = useAuth(),
    c = sopCopy(currentLanguage),
    router = useRouter(),
    params = useLocalSearchParams<{
      taskId?: string;
      adoptionId?: string;
      issueId?: string;
    }>();
  const ui = (value: string) => sopText(value, currentLanguage);
  const [saveError, setSaveError] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const savingDraftRef = useRef(false);
  const [reading, setReading] = useState<SopDocument | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (reading) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [reading]);
  const [todoFiltersOpen, setTodoFiltersOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [draftProgress, setDraftProgress] = useState<SopDraftProgress | null>(
    null,
  );
  const generating = useRef(false);
  const [importError, setImportError] = useState("");
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
  const [editorTarget, setEditorTarget] = useState<{ id: string } | null>(null);
  const navigateEditor = (target: string) => {
    const index =
      definition?.steps.findIndex((step) =>
        target.startsWith(`sop-check-${step.id}-`),
      ) ?? -1;
    if (index >= 0) setOpenStep(index);
    setEditorTarget({ id: target });
  };
  const openEditor = (s: SopDocument, target: string) => {
    if (!definition || editing?.id !== s.id) {
      setEditing(s);
      setDefinition(JSON.parse(JSON.stringify(s.definition)));
    }
    const index = s.definition.steps.findIndex((step) =>
      target.startsWith(`sop-check-${step.id}-`),
    );
    if (index >= 0) setOpenStep(index);
    setReading(null);
    setSaveError("");
    setEditorTarget({ id: target });
  };
  const [adopting, setAdopting] = useState<SopDocument | null>(null),
    [blocks, setBlocks] = useState<string[]>([]),
    [ponds, setPonds] = useState<string[]>([]),
    [manager, setManager] = useState(""),
    [lifetime, setLifetime] = useState("cycle"),
    [recipients, setRecipients] = useState<string[]>([]),
    [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [adoptingMembership, setAdoptingMembership] =
    useState<SopAdoption | null>(null);
  const [adoptionError, setAdoptionError] = useState("");
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
    [plannedStockingDate, setPlannedStockingDate] = useState(""),
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
  const saveDraft = async () => {
    if (!definition || savingDraftRef.current) return;
    savingDraftRef.current = true;
    setSavingDraft(true);
    setSaveError("");
    setMessage("");
    try {
      const document = await saveSopDraft({ client, definition, editing });
      setEditing(document);
      setReading(document);
      setDefinition(null);
      setMessage(ui("Draft saved. Review before approval."));
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? ui(error.message)
          : ui(
              "The draft was not saved. Review it and choose Save draft to retry.",
            ),
      );
    } finally {
      savingDraftRef.current = false;
      setSavingDraft(false);
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
  const generateDraft = async (file?: unknown) => {
    if (!definition || generating.current) return;
    generating.current = true;
    setImportError("");
    try {
      const result = await generateAndSaveSopDraft({
        client,
        text: aiText,
        language: definition.language,
        file,
        editing,
        attachments: definition.attachments,
        onProgress: setDraftProgress,
        onDraft: setDefinition,
      });
      setEditing(result.document);
      setReading(result.document);
      setDefinition(null);
      setMessage(ui("Draft saved. Review before approval."));
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Unable to import this document. Try again.",
      );
    } finally {
      generating.current = false;
      setDraftProgress(null);
    }
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
    const existing = existingSopAdoption(w.adoptions, s.id);
    setAdoptingMembership(existing || null);
    setAdopting(
      existing
        ? {
            ...s,
            definition: existing.definition,
            approvedVersionId: existing.versionId,
          }
        : s,
    );
    setAdoptionError("");
    setLifetime(existing?.lifetime || "cycle");
    setRecipients(existing?.recipients || []);
    setManager(
      existing?.managerId ||
        w.members.find((m) => ["owner", "co-owner", "manager"].includes(m.role))
          ?.id ||
        "",
    );
    setPreview(null);
    setPonds(existing?.pondIds || []);
    setBlocks(existing?.blockIds || []);
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
      (!urgency || (t.severity || t.step?.severity) === urgency) &&
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
      <SopEditorNavigation.Provider value={{ target: editorTarget, scrollRef }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {mode === "sops" && (
            <SopEditorDisclosure
              title={`${ui("Display language")}: ${SOP_INTERFACE_LANGUAGES.find((language) => language.code === currentLanguage)?.name || currentLanguage}`}
            >
              <Choices
                label={ui("Display language")}
                values={SOP_INTERFACE_LANGUAGES.map((language) => ({
                  id: language.code,
                  title: language.name,
                }))}
                selected={[currentLanguage]}
                onChange={(code) => {
                  const language = SOP_INTERFACE_LANGUAGES.find(
                    (item) => item.code === code,
                  );
                  if (language) void setLanguage(language.code);
                }}
              />
              <Text style={styles.muted}>
                {ui(
                  "Changes app labels and navigation. Your SOP text stays in its original language.",
                )}
              </Text>
            </SopEditorDisclosure>
          )}
          {client.loading && <ActivityIndicator color="#0F4C75" />}
          {!!(message || client.error) && (
            <Text accessibilityRole="alert" style={styles.alert}>
              {ui(message || client.error)}
            </Text>
          )}
          {!!client.pending.length && (
            <Text style={styles.text}>
              {c.pending}: {client.pending.length}
            </Text>
          )}
          {mode === "sops" && !definition && !adopting && !reading && (
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
          {mode === "sops" &&
            tab === "library" &&
            !definition &&
            !adopting &&
            !reading && (
              <>
                <Button
                  title={c.create}
                  onPress={() => {
                    setEditing(null);
                    setImportError("");
                    setMessage("");
                    setAiText("");
                    setDefinition({
                      title: "",
                      description: "",
                      language: currentLanguage,
                      steps: [
                        {
                          ...emptySopStep(),
                          title: ui("Record a measurement"),
                        },
                      ],
                    });
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
                {w.sops
                  .filter((s) => s.status !== "deleted")
                  .map((s) => {
                    const card = sopLibrarySummary(s.definition);
                    return (
                      <View style={styles.card} key={s.id}>
                        <View style={styles.libraryCardHeading}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.libraryCardLabel}>
                              {ui("Farm procedure")}
                            </Text>
                            <Text style={styles.subheading}>{s.title}</Text>
                          </View>
                          <Text style={styles.libraryStatus}>
                            {ui(s.status)}
                          </Text>
                        </View>
                        {!!s.definition.description && (
                          <Text style={styles.text} numberOfLines={2}>
                            {s.definition.description}
                          </Text>
                        )}
                        <View style={styles.libraryFacts}>
                          <View>
                            <Text style={styles.label}>
                              {ui("Procedure sections")}
                            </Text>
                            <Text style={styles.libraryFactValue}>
                              {card.readableSections}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.label}>{ui("Checks")}</Text>
                            <Text style={styles.libraryFactValue}>
                              {card.checks}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.label}>
                              {ui("Original language")}
                            </Text>
                            <Text style={styles.libraryFactValue}>
                              {SOP_INTERFACE_LANGUAGES.find(
                                (language) =>
                                  language.code === s.definition.language,
                              )?.name || s.definition.language}
                            </Text>
                          </View>
                        </View>
                        {(!card.readableSections ||
                          (s.status === "draft" && card.issues > 0)) && (
                          <View style={styles.libraryReview}>
                            <Button
                              title={`${ui(s.status === "draft" ? "Draft needs review" : "Procedure content missing")} →`}
                              onPress={() =>
                                openEditor(
                                  s,
                                  !card.readableSections
                                    ? "sop-procedure-editor"
                                    : "sop-completion-links",
                                )
                              }
                            />
                            <Text style={styles.text}>
                              {!card.readableSections
                                ? `${ui("No readable procedure sections yet.")} `
                                : ""}
                              {s.status === "draft" && card.issues > 0
                                ? `${card.issues} ${ui("items to complete before approval.")}`
                                : ""}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.muted}>
                          {ui("revision")} {s.revision}
                        </Text>
                        {s.source && (
                          <Text style={styles.text}>
                            {s.source.author} · {s.source.versionId}
                          </Text>
                        )}
                        <Button
                          title={ui(
                            s.status === "draft" ? "Review draft" : "Read SOP",
                          )}
                          variant="primary"
                          onPress={() => setReading(s)}
                        />
                        <Button
                          title={ui("Edit SOP")}
                          onPress={() => {
                            setEditing(s);
                            setDefinition(
                              JSON.parse(JSON.stringify(s.definition)),
                            );
                          }}
                        />
                        {(w.manage ||
                          (s.status === "draft" &&
                            s.createdBy === user?.uid)) && (
                          <Button
                            title={ui(
                              s.status === "draft"
                                ? "Delete draft"
                                : "Delete SOP",
                            )}
                            variant="danger"
                            disabled={client.busy}
                            onPress={() =>
                              Alert.alert(
                                ui("Delete SOP"),
                                `${s.title}
${ui("You can restore it from Deleted SOPs. Published copies are withdrawn; existing farm tasks keep their instructions.")}`,
                                [
                                  { text: ui("Keep SOP"), style: "cancel" },
                                  {
                                    text: ui("Delete SOP"),
                                    style: "destructive",
                                    onPress: () =>
                                      void run(async () => {
                                        await client.command({
                                          action: "deleteSop",
                                          sopId: s.id,
                                          expectedRevision: s.revision,
                                        });
                                        setMessage(
                                          ui("SOP moved to Deleted SOPs."),
                                        );
                                      }),
                                  },
                                ],
                              )
                            }
                          />
                        )}
                        {w.manage && (
                          <>
                            {s.status === "draft" && (
                              <Button
                                title={ui("Approve draft")}
                                disabled={client.busy || card.issues > 0}
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
                            )}
                            {s.status === "draft" && card.issues > 0 && (
                              <Text style={styles.muted}>
                                {ui(
                                  "Complete the highlighted fields in the draft before approving.",
                                )}
                              </Text>
                            )}
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
                                  title={
                                    existingSopAdoption(w.adoptions, s.id)
                                      ? ui("Manage adoption")
                                      : c.adopt
                                  }
                                  onPress={() => beginAdoption(s)}
                                />
                              </>
                            )}
                          </>
                        )}
                      </View>
                    );
                  })}
              </>
            )}
          {mode === "sops" &&
            tab === "library" &&
            !definition &&
            !reading &&
            w.sops.some((s) => s.status === "deleted") && (
              <View style={styles.card}>
                <Text style={styles.subheading}>{ui("Deleted SOPs")}</Text>
                {w.sops
                  .filter((s) => s.status === "deleted")
                  .map((s) => (
                    <View key={s.id}>
                      <Text style={styles.text}>{s.title}</Text>
                      {(w.manage || s.createdBy === user?.uid) && (
                        <Button
                          title={ui("Restore SOP")}
                          disabled={client.busy}
                          onPress={() =>
                            void run(async () => {
                              await client.command({
                                action: "restoreSop",
                                sopId: s.id,
                                expectedRevision: s.revision,
                              });
                              setMessage(
                                ui(
                                  "SOP restored. Republish separately if needed.",
                                ),
                              );
                            })
                          }
                        />
                      )}
                    </View>
                  ))}
              </View>
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
                <SopContentView
                  content={s.definition.content}
                  language={currentLanguage}
                />
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
                  `${summary.pass} ${ui("pass")} · ${summary.fail} ${ui("outside target")}`,
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
                    router.push({
                      pathname: "/todo",
                      params: { issueId: i.id },
                    })
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
                  <Text style={styles.subheading}>
                    {ui("Production stage")}
                  </Text>
                  <Choices
                    label={ui("Pond")}
                    values={w.physicalPonds.map((p) => ({
                      id: p.id,
                      title: p.pondName,
                    }))}
                    selected={[stageTarget]}
                    onChange={(id) => {
                      setStageTarget(id);
                      setPlannedStockingDate(
                        w.physicalPonds.find((p) => p.id === id)
                          ?.plannedStockingDate || "",
                      );
                    }}
                  />
                  {w.manage && (
                    <>
                      <Input
                        label={ui("Planned stocking date (YYYY-MM-DD)")}
                        value={plannedStockingDate}
                        onChange={setPlannedStockingDate}
                      />
                      <Text style={styles.muted}>
                        {ui(
                          "H-20 means 20 days before the planned stocking date. Actual stocking starts DOC0.",
                        )}
                      </Text>
                      <Button
                        title={ui("Save stocking plan")}
                        disabled={!stageTarget}
                        onPress={() =>
                          void run(() =>
                            client.command({
                              action: "planStocking",
                              targetId: stageTarget,
                              plannedStockingDate,
                            }),
                          )
                        }
                      />
                    </>
                  )}
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
              <Button
                title={ui("Close")}
                onPress={() => setUpdateReview(null)}
              />
            </View>
          )}
          {reading && mode === "sops" && (
            <>
              <Button title={c.back} onPress={() => setReading(null)} />
              <Button
                title={ui("Edit workflow")}
                onPress={() => {
                  setEditing(reading);
                  setSaveError("");
                  setDefinition(JSON.parse(JSON.stringify(reading.definition)));
                  setReading(null);
                }}
              />
              <SopReader
                document={reading}
                onResolve={(target) => openEditor(reading, target)}
                language={currentLanguage}
                onOpen={(attachment) =>
                  void run(() => client.openAttachment(attachment))
                }
              />
            </>
          )}
          {definition && (
            <View
              pointerEvents={draftProgress || savingDraft ? "none" : "auto"}
            >
              <Button
                title={c.back}
                disabled={!!draftProgress}
                onPress={() => {
                  setDefinition(null);
                  setSaveError("");
                  setImportError("");
                  setMessage("");
                }}
              />
              <View style={styles.card}>
                <Input
                  label={ui("Describe your SOP for Orson")}
                  value={aiText}
                  multiline
                  onChange={setAiText}
                />
                <Button
                  title={c.draft}
                  disabled={client.busy || !!draftProgress || !aiText.trim()}
                  onPress={() => void run(() => generateDraft())}
                />
                <Button
                  title={ui("Import PDF / DOCX / text")}
                  disabled={client.busy || !!draftProgress}
                  onPress={() =>
                    void run(async () => {
                      const result = await DocumentPicker.getDocumentAsync({
                        type: [
                          "application/pdf",
                          "text/plain",
                          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        ],
                        copyToCacheDirectory: true,
                      });
                      if (!result.canceled)
                        await generateDraft(result.assets[0]);
                    })
                  }
                />
                {!!importError && (
                  <View accessibilityLiveRegion="assertive">
                    <Text style={styles.subheading}>{ui("Import failed")}</Text>
                    <Text style={styles.text}>{ui(importError)}</Text>
                    <Text style={styles.text}>
                      {ui(
                        "Import did not finish. Retry the import or return to the library. If content appeared below, use Save draft to retry saving.",
                      )}
                    </Text>
                  </View>
                )}
                {draftProgress && (
                  <Text accessibilityLiveRegion="polite" style={styles.text}>
                    {ui(
                      {
                        uploading: "Uploading source document…",
                        generating:
                          "Generating SOP draft. Large documents can take several minutes. Keep this page open…",
                        saving: "Saving draft and source document…",
                      }[draftProgress],
                    )}
                  </Text>
                )}
              </View>
              {!!validateSop(definition).length && (
                <SopEditorAnchor id="sop-completion-links">
                  <View style={styles.libraryReview}>
                    <Text style={styles.subheading}>
                      {ui("Complete these before approval")}
                    </Text>
                    <Text style={styles.text}>
                      {ui(
                        "Select a warning to open the field that needs attention.",
                      )}
                    </Text>
                    {sopIssueLinks(definition).map(
                      ({ issue, target }, index) => (
                        <Button
                          key={index}
                          title={`${sopEditorIssue(issue, currentLanguage)} →`}
                          onPress={() => navigateEditor(target)}
                        />
                      ),
                    )}
                  </View>
                </SopEditorAnchor>
              )}
              <Text style={styles.subheading}>{ui("1. About this SOP")}</Text>
              <Text style={styles.muted}>
                {ui(
                  "Write the procedure, set your targets, then review before approval.",
                )}
              </Text>
              <Input
                id="sop-title"
                label={ui("Title")}
                value={definition.title}
                onChange={(title) => setDefinition({ ...definition, title })}
              />
              <Input
                id="sop-description"
                label={ui("Description")}
                value={definition.description}
                multiline
                onChange={(description) =>
                  setDefinition({ ...definition, description })
                }
              />
              <Choices
                id="sop-language"
                label={ui("Original language")}
                values={SOP_INTERFACE_LANGUAGES.map((language) => ({
                  id: language.code,
                  title: language.name,
                }))}
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
              <SopContentEditor
                content={definition.content}
                language={currentLanguage}
                onChange={(content) =>
                  setDefinition({ ...definition, content })
                }
              />
              <SopEditorAnchor id="sop-checks-editor">
                <Text style={styles.subheading}>
                  {ui("3. Checks and follow-up")}
                </Text>
              </SopEditorAnchor>
              <Text style={styles.muted}>
                {ui(
                  "Open a check to set its targets and instructions. Advanced settings are optional to edit.",
                )}
              </Text>
              {definition.steps.some((step) =>
                step.check.field.startsWith("water."),
              ) && (
                <View style={styles.card}>
                  <Text style={styles.subheading}>
                    {ui("Water parameter targets")}
                  </Text>
                  <Text style={styles.muted}>
                    {ui(
                      "These are SOP targets, not today's measurements. Open a check to change its limits.",
                    )}
                  </Text>
                  {definition.steps.map((step, index) =>
                    step.check.field.startsWith("water.") ? (
                      <Button
                        key={step.id}
                        title={`${sopMeasurementLabel(step.check.field, currentLanguage)}: ${sopTargetLabel(step, currentLanguage)}${step.check.operator === "present" ? ` · ${ui("No limits checked")}` : ""}`}
                        onPress={() => setOpenStep(index)}
                      />
                    ) : null,
                  )}
                </View>
              )}
              {definition.steps.map((s, i) => (
                <View style={styles.card} key={s.id}>
                  <Button
                    title={`${i + 1}. ${s.title || ui("Untitled check")}`}
                    expanded={openStep === i}
                    onPress={() => setOpenStep(openStep === i ? -1 : i)}
                  />
                  <Text style={styles.muted}>
                    {validateSop(definition).some((error) =>
                      error.startsWith(`${s.title || s.id}: `),
                    )
                      ? ui("Needs attention")
                      : ui("Ready for review")}
                  </Text>
                  {openStep === i && (
                    <>
                      <Text style={styles.subheading}>{ui("What to do")}</Text>
                      <Input
                        label={ui("Check name")}
                        value={s.title}
                        onChange={(title) => patch(i, { title })}
                      />
                      <Input
                        label={ui("Instructions for staff")}
                        value={s.instructions}
                        multiline
                        onChange={(instructions) => patch(i, { instructions })}
                      />
                      <Text style={styles.subheading}>
                        {ui("Acceptable measurement or result")}
                      </Text>
                      <Text style={styles.muted}>
                        {ui(
                          "Set targets here. Record actual readings in the pond records.",
                        )}
                      </Text>
                      <SopEditorDisclosure
                        title={`${ui("Measurement or record")}: ${sopMeasurementLabel(s.check.field, currentLanguage)}`}
                      >
                        <Choices
                          label={ui("Measurement or record")}
                          values={SOP_FIELDS.map((f) => ({
                            id: f.key,
                            title: sopMeasurementLabel(f.key, currentLanguage),
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
                      </SopEditorDisclosure>
                      {[
                        "inventory.totalStock",
                        "treatment.quantity",
                        "equipment.maintenance",
                      ].includes(s.check.field) && (
                        <Choices
                          id={`sop-check-${s.id}-source`}
                          label={ui("Item or equipment")}
                          values={[
                            { id: "", title: "Not applicable / choose record" },
                            ...w.sources
                              .filter((source) =>
                                (
                                  SOP_FIELDS.find(
                                    (f) => f.key === s.check.field,
                                  )?.sources || [
                                    SOP_FIELDS.find(
                                      (f) => f.key === s.check.field,
                                    )?.source,
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
                      )}
                      <Choices
                        id={`sop-check-${s.id}-condition`}
                        label={ui("How to check it")}
                        values={sopSimpleCheckModes(s).map((mode) => ({
                          id: mode,
                          title: sopCheckModeLabel(mode, currentLanguage),
                        }))}
                        selected={[s.check.operator]}
                        onChange={(operator) =>
                          patch(i, {
                            check: {
                              ...s.check,
                              operator:
                                operator as SopStep["check"]["operator"],
                            },
                          })
                        }
                      />
                      {(s.check.operator === "range" ||
                        s.check.operator === "trend") && (
                        <>
                          <Input
                            id={`sop-check-${s.id}-limits`}
                            label={ui("Lower limit")}
                            numeric
                            value={
                              s.check.min === null ? "" : String(s.check.min)
                            }
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
                            label={ui("Upper limit")}
                            numeric
                            value={
                              s.check.max === null ? "" : String(s.check.max)
                            }
                            onChange={(v) =>
                              patch(i, {
                                check: {
                                  ...s.check,
                                  max: v === "" ? null : Number(v),
                                },
                              })
                            }
                          />
                        </>
                      )}
                      {(SOP_FIELDS.find((f) => f.key === s.check.field)?.unit ||
                        ["inventory.totalStock", "treatment.quantity"].includes(
                          s.check.field,
                        ) ||
                        s.check.operator === "range" ||
                        s.check.operator === "trend") && (
                        <Input
                          id={`sop-check-${s.id}-unit`}
                          label={ui("Unit")}
                          value={s.check.unit}
                          onChange={(unit) =>
                            patch(i, { check: { ...s.check, unit } })
                          }
                        />
                      )}
                      {(SOP_FIELDS.find((f) => f.key === s.check.field)
                        ?.basis ||
                        s.check.basis) && (
                        <Choices
                          id={`sop-check-${s.id}-basis`}
                          label={ui("Measurement basis")}
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
                      )}
                      {(s.check.operator === "equals" ||
                        s.check.operator === "sequence") && (
                        <>
                          <Input
                            id={`sop-check-${s.id}-value`}
                            label={ui("Required value / sequence")}
                            value={s.check.value}
                            onChange={(value) =>
                              patch(i, { check: { ...s.check, value } })
                            }
                          />
                        </>
                      )}
                      {s.check.operator === "narrative" && (
                        <>
                          <Input
                            id={`sop-check-${s.id}-rubric`}
                            label={`${ui("What must the notes or photos show?")} (${ui("Optional")})`}
                            value={s.check.rubric}
                            multiline
                            onChange={(rubric) =>
                              patch(i, { check: { ...s.check, rubric } })
                            }
                          />
                        </>
                      )}
                      {s.check.operator === "present" && (
                        <Text style={styles.muted}>
                          {ui(
                            "This only checks that a record exists. Choose Within limits to check a measurement against your targets.",
                          )}
                        </Text>
                      )}
                      {(s.check.operator === "range" ||
                        s.check.operator === "trend") &&
                        s.check.min === null &&
                        s.check.max === null && (
                          <Text style={styles.alert}>
                            {ui(
                              "Enter a lower or upper limit approved for your farm.",
                            )}
                          </Text>
                        )}
                      <Text style={styles.subheading}>
                        {ui("If something goes wrong")}
                      </Text>
                      <Input
                        id={`sop-check-${s.id}-corrective`}
                        label={`${ui("What should staff do if this check fails?")} (${ui("Optional")})`}
                        value={s.correctiveInstructions}
                        multiline
                        onChange={(correctiveInstructions) =>
                          patch(i, { correctiveInstructions })
                        }
                      />
                      <Text style={styles.subheading}>
                        {ui("When to do it")}
                      </Text>
                      <Choices
                        label={ui("Stages")}
                        values={vals(SOP_STAGES)}
                        selected={s.stages}
                        onChange={(stage) =>
                          patch(i, {
                            stages: toggle(
                              s.stages,
                              stage,
                            ) as SopStep["stages"],
                          })
                        }
                      />
                      <Choices
                        id={`sop-check-${s.id}-schedule`}
                        label={ui("When")}
                        values={(
                          [
                            "daily",
                            "weekly",
                            "doc",
                            "event",
                            "stage",
                            "manual",
                          ] as const
                        ).map((kind) => ({
                          id: kind,
                          title: sopScheduleLabel(kind, currentLanguage),
                        }))}
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
                      {(s.trigger.kind === "daily" ||
                        s.trigger.kind === "weekly" ||
                        s.trigger.kind === "doc") && (
                        <>
                          <Input
                            label={ui("Local time (HH:MM)")}
                            value={s.trigger.at}
                            onChange={(at) =>
                              patch(i, { trigger: { ...s.trigger, at } })
                            }
                          />
                        </>
                      )}
                      {s.trigger.kind === "doc" && (
                        <>
                          {(["docFrom", "docTo", "everyDays"] as const).map(
                            (key) => (
                              <Input
                                key={key}
                                label={sopFieldLabel(key, currentLanguage)}
                                value={String(s.trigger[key])}
                                onChange={(v) =>
                                  patch(i, {
                                    trigger: { ...s.trigger, [key]: Number(v) },
                                  })
                                }
                              />
                            ),
                          )}
                          <Text style={styles.muted}>
                            {ui(
                              "Use -20 for H-20, -1 for H-1, and 0 or more for DOC. Preparation and stocked steps need separate windows.",
                            )}
                          </Text>
                          <Text style={styles.muted}>
                            {sopTimingLabel(s, currentLanguage)}
                          </Text>
                        </>
                      )}
                      {s.trigger.kind === "weekly" && (
                        <>
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
                                  weekDays: s.trigger.weekDays.includes(
                                    Number(id),
                                  )
                                    ? s.trigger.weekDays.filter(
                                        (d) => d !== Number(id),
                                      )
                                    : [...s.trigger.weekDays, Number(id)],
                                },
                              })
                            }
                          />
                        </>
                      )}
                      {(s.trigger.kind === "event" ||
                        s.trigger.kind === "stage") && (
                        <>
                          <Choices
                            label={ui("Event / stage")}
                            values={vals([
                              "stocking",
                              "harvest",
                              "treatment",
                              "measurement",
                              ...definition.steps.map(
                                (step) => `step:${step.id}`,
                              ),
                              ...SOP_STAGES,
                            ])}
                            selected={[s.trigger.event]}
                            onChange={(event) =>
                              patch(i, { trigger: { ...s.trigger, event } })
                            }
                          />
                        </>
                      )}
                      <SopEditorAnchor id={`sop-check-${s.id}-advanced`}>
                        <SopEditorDisclosure
                          title={ui("Advanced settings")}
                          reveal={
                            editorTarget?.id === `sop-check-${s.id}-advanced`
                              ? editorTarget
                              : null
                          }
                        >
                          <Text style={styles.muted}>
                            {ui(
                              "Assignment, evidence rules, rechecks, and linked tasks. Existing settings are kept.",
                            )}
                          </Text>
                          <Choices
                            label={ui("Applies to")}
                            values={vals(["pond", "block", "company"])}
                            selected={[s.scope]}
                            onChange={(scope) =>
                              patch(i, { scope: scope as SopStep["scope"] })
                            }
                          />
                          <Choices
                            label={ui("Severity")}
                            values={vals(["low", "warning", "critical"])}
                            selected={[s.severity]}
                            onChange={(severity) =>
                              patch(i, {
                                severity: severity as SopStep["severity"],
                              })
                            }
                          />
                          {(
                            [
                              "windowMinutes",
                              "everyDays",
                              "offsetMinutes",
                            ] as const
                          )
                            .filter(
                              (k) =>
                                s.trigger.kind !== "doc" || k !== "everyDays",
                            )
                            .map((k) => (
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
                            label={ui("Other check methods")}
                            values={sopCheckModes(s).map((mode) => ({
                              id: mode,
                              title: sopCheckModeLabel(mode, currentLanguage),
                            }))}
                            selected={[s.check.operator]}
                            onChange={(operator) =>
                              patch(i, {
                                check: {
                                  ...s.check,
                                  operator:
                                    operator as SopStep["check"]["operator"],
                                },
                              })
                            }
                          />
                          <Input
                            label={ui("Minimum records")}
                            numeric
                            value={String(s.check.minCount)}
                            onChange={(v) =>
                              patch(i, {
                                check: { ...s.check, minCount: Number(v) },
                              })
                            }
                          />
                          <Input
                            label={ui("Freshness minutes")}
                            numeric
                            value={String(s.check.freshnessMinutes)}
                            onChange={(v) =>
                              patch(i, {
                                check: {
                                  ...s.check,
                                  freshnessMinutes: Number(v),
                                },
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
                              ...w.members.map((m) => ({
                                id: m.id,
                                title: m.name,
                              })),
                            ]}
                            selected={[s.assigneeId]}
                            onChange={(assigneeId) => patch(i, { assigneeId })}
                          />
                          {(["dependsOn", "onPass", "onFail"] as const).map(
                            (k) => (
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
                                onChange={(id) =>
                                  patch(i, { [k]: toggle(s[k], id) })
                                }
                              />
                            ),
                          )}
                          <Choices
                            label={ui(
                              "Require this check before entering a stage",
                            )}
                            values={[
                              {
                                id: "",
                                title: ui("Does not block stage changes"),
                              },
                              ...vals(SOP_STAGES),
                            ]}
                            selected={[s.gateStage]}
                            onChange={(gateStage) =>
                              patch(i, {
                                gateStage: gateStage as SopStep["gateStage"],
                              })
                            }
                          />
                          <Text style={styles.muted}>
                            {ui(
                              "Choose a stage only if this check must pass before the pond can enter it. Otherwise leave stage changes unblocked.",
                            )}
                          </Text>
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
                        </SopEditorDisclosure>
                      </SopEditorAnchor>{" "}
                      {validateSop(definition)
                        .filter(
                          (error) =>
                            error.startsWith(`${s.title || s.id}: `) &&
                            !error.endsWith(
                              "Set a farm-approved minimum or maximum.",
                            ),
                        )
                        .map((error) => (
                          <Text style={styles.alert} key={error}>
                            {sopEditorIssue(error, currentLanguage)}
                          </Text>
                        ))}
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
                      {
                        ...emptySopStep(`step-${Date.now()}`),
                        title: sopText(
                          "Record a measurement",
                          definition.language,
                        ),
                      },
                    ],
                  })
                }
              />
              <SopEditorDisclosure title={ui("Automation preview")}>
                <SopFlowPreview definition={definition} />
                {definition.steps.map((s) => (
                  <Text style={styles.text} key={s.id}>
                    {s.title} → {s.check.field}{" "}
                    {ui("→ corrective action → recheck")} {s.recheckMinutes}{" "}
                    {ui("min → escalate")} {s.escalationMinutes} {ui("min")}
                  </Text>
                ))}
              </SopEditorDisclosure>
              {!!saveError && (
                <Text accessibilityRole="alert" style={styles.alert}>
                  {ui("Draft not saved")}: {saveError}{" "}
                  {ui("Your edits are still here. Retry Save draft.")}
                </Text>
              )}
              <Button
                title={savingDraft ? ui("Saving draft…") : c.save}
                disabled={savingDraft || client.busy || !!draftProgress}
                onPress={() => void saveDraft()}
              />
            </View>
          )}
          {adopting && (
            <View style={styles.card}>
              <Text style={styles.subheading}>
                {ui(adoptingMembership ? "Manage adoption" : "Adopt SOP")}:{" "}
                {adopting.title}
              </Text>
              <Choices
                disabled={client.busy}
                label={ui("Blocks (follow membership)")}
                values={w.blocks.map((b) => ({ id: b.id, title: b.name }))}
                selected={blocks}
                onChange={(id) => {
                  setBlocks((current) => toggle(current, id));
                  setPreview(null);
                }}
              />
              <Choices
                disabled={client.busy}
                label={ui("Selected ponds")}
                values={adoptionPonds(w).map((p) => ({
                  id: p.id,
                  title: `${p.name} · ${ui(p.activeCycle ? "Active cycle" : "Preparation / no active cycle")}`,
                }))}
                selected={ponds}
                onChange={(id) => {
                  setPonds((current) => toggle(current, id));
                  setPreview(null);
                }}
              />
              <Choices
                disabled={client.busy || !!adoptingMembership}
                label={ui("Lifetime")}
                values={vals(["cycle", "standing"])}
                selected={[lifetime]}
                onChange={(id) => {
                  setLifetime(id);
                  setPreview(null);
                }}
              />
              <Choices
                disabled={client.busy}
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
                disabled={client.busy}
                label={ui("Escalation recipients")}
                values={w.members.map((m) => ({ id: m.id, title: m.name }))}
                selected={recipients}
                onChange={(id) => {
                  setRecipients((current) => toggle(current, id));
                  setPreview(null);
                }}
              />
              <Text style={styles.text}>
                {
                  adoptionPonds(w).filter(
                    (p) => ponds.includes(p.id) || blocks.includes(p.blockId),
                  ).length
                }{" "}
                {ui("ponds selected")}
              </Text>
              <Text style={styles.text}>
                {ui(
                  "Work follows existing pond/block assignments. The accountable manager receives unassigned work.",
                )}
              </Text>
              <Text style={styles.text}>{w.timeZone}</Text>
              {!!adoptionError && (
                <Text accessibilityRole="alert" style={styles.alert}>
                  {ui(adoptionError)}
                </Text>
              )}
              <Button
                title={ui("Review adoption")}
                disabled={
                  client.busy ||
                  (!ponds.length &&
                    !blocks.length &&
                    !adopting.definition.steps.some(
                      (s) => s.scope === "company",
                    )) ||
                  !manager ||
                  !w.timeZone
                }
                onPress={() =>
                  void (async () => {
                    setAdoptionError("");
                    setPreview(null);
                    try {
                      setPreview(
                        adoptionPreview(
                          await client.command({
                            action: adoptingMembership
                              ? "previewMembership"
                              : "previewAdoption",
                            ...(adoptingMembership
                              ? {
                                  adoptionId: adoptingMembership.id,
                                  expectedRevision: adoptingMembership.revision,
                                }
                              : { sopId: adopting.id }),
                            blockIds: blocks,
                            pondIds: ponds,
                            lifetime,
                            managerId: manager,
                            recipients,
                          }),
                        ) as unknown as Record<string, unknown>,
                      );
                    } catch (e) {
                      setAdoptionError(
                        e instanceof Error
                          ? e.message
                          : "Unable to review adoption.",
                      );
                    }
                  })()
                }
              />
              {preview && (
                <>
                  {(
                    preview.targets as {
                      id: string;
                      name: string;
                      stage: string;
                      assigneeId: string;
                    }[]
                  ).map((t) => (
                    <Text key={t.id} style={styles.text}>
                      {t.name} · {ui(t.stage)} · {ui("Assigned to")}{" "}
                      {w.members.find((m) => m.id === t.assigneeId)?.name ||
                        t.assigneeId}
                    </Text>
                  ))}
                  {(preview.conflicts as string[]).map((e) => (
                    <Text style={styles.alert} key={e}>
                      {e}
                    </Text>
                  ))}
                  <Button
                    title={ui(
                      adoptingMembership
                        ? "Apply reviewed changes"
                        : "Accept and activate",
                    )}
                    disabled={
                      client.busy || (preview.conflicts as string[]).length > 0
                    }
                    onPress={() =>
                      void (async () => {
                        setAdoptionError("");
                        try {
                          const result = await client.command({
                            action: adoptingMembership
                              ? "refreshMembership"
                              : "activate",
                            ...(adoptingMembership
                              ? {
                                  adoptionId: adoptingMembership.id,
                                  expectedRevision: adoptingMembership.revision,
                                }
                              : { sopId: adopting.id }),
                            expectedVersionId: preview.versionId,
                            ...(preview.targetSignature
                              ? {
                                  expectedTargetSignature:
                                    preview.targetSignature,
                                }
                              : {}),
                            blockIds: blocks,
                            pondIds: ponds,
                            lifetime,
                            managerId: manager,
                            recipients,
                          });
                          confirmedAdoption(result);
                          setAdopting(null);
                          setTab("adopted");
                          setMessage(
                            ui(
                              "Adoption saved. Open To-do to view assigned work. New tasks appear after the scheduler runs.",
                            ),
                          );
                        } catch (e) {
                          setPreview(null);
                          setAdoptionError(
                            e instanceof Error
                              ? e.message
                              : "Unable to activate adoption.",
                          );
                        }
                      })()
                    }
                  />
                </>
              )}
              <Button
                title={ui("Close")}
                disabled={client.busy}
                onPress={() => setAdopting(null)}
              />
            </View>
          )}
          {mode === "todo" && !task && !manual && (
            <>
              <Choices
                label={ui("Status")}
                values={[
                  { id: "active", title: ui("Active work") },
                  { id: "completed", title: ui("completed") },
                  { id: "all", title: ui("All tasks") },
                ]}
                selected={[status]}
                onChange={setStatus}
              />
              <Button title={c.manual} onPress={() => setManual(true)} />
              <Button
                title={ui("Mobile reminders")}
                expanded={remindersOpen}
                onPress={() => setRemindersOpen(!remindersOpen)}
              />
              {remindersOpen && (
                <View style={styles.card}>
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
                </View>
              )}
              <Button
                title={ui("Filters")}
                expanded={todoFiltersOpen}
                onPress={() => setTodoFiltersOpen(!todoFiltersOpen)}
              />
              {todoFiltersOpen && (
                <View style={styles.card}>
                  <Choices
                    label={ui("Status")}
                    values={vals([
                      "active",
                      "all",
                      "open",
                      "scheduled",
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
                  <Button
                    title={ui("Clear filters")}
                    onPress={() => {
                      setPerson("");
                      setPond("");
                      setBlock("");
                      setUrgency("");
                      setDate("");
                      if (params.adoptionId || params.issueId)
                        router.replace("/todo");
                    }}
                  />
                </View>
              )}
              <Text style={styles.subheading}>
                {ui("Assigned work")} · {filtered.length}
              </Text>
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
                  <Text numberOfLines={3} style={styles.text}>
                    {t.instructions}
                  </Text>
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
                <View style={styles.card}>
                  <Text style={styles.subheading}>
                    {ui(
                      !w.tasks.length
                        ? "No assigned work yet"
                        : "No tasks match these filters",
                    )}
                  </Text>
                  <Text style={styles.text}>
                    {ui(
                      !w.tasks.length
                        ? "Adopt a procedure or create a manual task to begin."
                        : "Choose another status or clear filters to see more work.",
                    )}
                  </Text>
                </View>
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
      </SopEditorNavigation.Provider>
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
  muted: { fontSize: 14, lineHeight: 22, color: "#526b7d", marginBottom: 12 },
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
  primaryButton: { backgroundColor: "#0F4C75", borderColor: "#0F4C75" },
  dangerButton: { borderColor: "#e7b4ad" },
  libraryCardHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  libraryCardLabel: { fontSize: 13, color: "#526b7d", marginBottom: 8 },
  libraryStatus: {
    fontSize: 14,
    color: "#0F4C75",
    backgroundColor: "#eef5fa",
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 6,
  },
  libraryFacts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    marginVertical: 18,
  },
  libraryFactValue: { fontSize: 17, color: "#18344b", fontWeight: "600" },
  libraryReview: {
    backgroundColor: "#fff3ed",
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
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

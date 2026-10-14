/** The same validated contract is used by clients and the server evaluator. */
export const SOP_STAGES = [
  "preparation",
  "stocking",
  "growout",
  "harvest",
  "turnaround",
] as const;
export type SopStage = (typeof SOP_STAGES)[number];
export type SopScope = "pond" | "block" | "company";
export type SopSeverity = "low" | "warning" | "critical";
export type SopResult =
  "pass" | "fail" | "insufficient_evidence" | "needs_review" | "not_applicable";
export type SopOperator =
  "present" | "range" | "equals" | "count" | "trend" | "sequence" | "narrative";
export interface SopTrigger {
  kind: "daily" | "weekly" | "doc" | "event" | "stage" | "manual";
  at: string;
  windowMinutes: number;
  everyDays: number;
  weekDays: number[];
  docFrom: number;
  docTo: number;
  event: string;
  offsetMinutes: number;
}
export interface SopCheck {
  field: string;
  sourceId: string;
  operator: SopOperator;
  min: number | null;
  max: number | null;
  value: string;
  unit: string;
  basis: string;
  minCount: number;
  freshnessMinutes: number;
  exactTime: boolean;
  rubric: string;
}
export interface SopStep {
  id: string;
  title: string;
  instructions: string;
  scope: SopScope;
  stages: SopStage[];
  trigger: SopTrigger;
  check: SopCheck;
  severity: SopSeverity;
  assigneeId: string;
  dependsOn: string[];
  onPass: string[];
  onFail: string[];
  correctiveInstructions: string;
  recheckMinutes: number;
  maxRechecks: number;
  escalationMinutes: number;
  requireNotes: boolean;
  requireAttachment: boolean;
  gateStage: SopStage | "";
}
/** Readable source guidance is independent of supported automated checks. */
export interface SopContentTable {
  title: string;
  columns: string[];
  rows: { cells: string[] }[];
}
export interface SopContentSection {
  id: string;
  title: string;
  body: string;
  sourcePages: number[];
  tables: SopContentTable[];
}
export interface SopContent {
  sections: SopContentSection[];
  /** Explicit omissions remain visible and block approval until resolved. */
  omissions: string[];
}
export interface SopDefinition {
  content?: SopContent;
  attachments?: SopAttachment[];
  title: string;
  description: string;
  language: string;
  steps: SopStep[];
}
export interface SopTarget {
  id: string;
  scope: SopScope;
  pondId: string;
  physicalPondId: string;
  cycleId: string;
  blockId: string;
  name: string;
  stage: SopStage;
  stockingDate: string;
  plannedStockingDate?: string;
  assigneeId: string;
}
export interface SopAdoption {
  id: string;
  sopId: string;
  versionId: string;
  title: string;
  status: "active" | "paused" | "retired";
  revision: number;
  definition: SopDefinition;
  pondIds: string[];
  blockIds: string[];
  lifetime: "cycle" | "standing";
  companyScope: boolean;
  managerId: string;
  recipients: string[];
  timeZone: string;
  activatedAt: number;
  nextDueAt: number;
  targets: SopTarget[];
}
export interface SopAttachment {
  path: string;
  name: string;
  contentType: string;
}
export interface SopEvidence {
  id: string;
  revision: string;
  sourcePath: string;
  targetId: string;
  pondId: string;
  cycleId: string;
  field: string;
  value: number | string | boolean | null;
  unit: string;
  basis: string;
  observedAt: number | null;
  date: string;
  precision: "instant" | "date";
  receivedAt: number;
  deleted: boolean;
  estimated: boolean;
}
export interface SopTask {
  id: string;
  title: string;
  instructions: string;
  status:
    | "scheduled"
    | "open"
    | "submitted"
    | "completed"
    | "waived"
    | "cancelled"
    | "needs_review";
  result: SopResult;
  adoptionId: string;
  versionId: string;
  step: SopStep | null;
  target: SopTarget;
  severity?: SopSeverity;
  assigneeId: string;
  managerId: string;
  visibleTo: string[];
  windowStart: number;
  dueAt: number;
  createdAt: number;
  revision: number;
  requiresHumanReview?: boolean;
  evidenceRevision?: number;
  submissionId?: string;
  evidenceObservedAt?: number | null;
  notes: string;
  attachments: SopAttachment[];
  issueId: string;
  purpose: "routine" | "corrective" | "recheck" | "manual";
}
export const SOP_ID = /^[A-Za-z0-9_-]{1,160}$/;
export const sopCanManage = (role: unknown, uid: string, ownerId?: string) =>
  uid === ownerId || ["owner", "co-owner", "manager"].includes(String(role));
export const emptySopStep = (id = "step-1"): SopStep => ({
  id,
  title: "Record a measurement",
  instructions: "",
  scope: "pond",
  stages: ["growout"],
  trigger: {
    kind: "daily",
    at: "06:00",
    windowMinutes: 120,
    everyDays: 1,
    weekDays: [1, 2, 3, 4, 5, 6, 0],
    docFrom: 0,
    docTo: 365,
    event: "",
    offsetMinutes: 0,
  },
  check: {
    field: "water.doMorning",
    sourceId: "",
    operator: "range",
    min: null,
    max: null,
    value: "",
    unit: "mg/L",
    basis: "",
    minCount: 1,
    freshnessMinutes: 1440,
    exactTime: true,
    rubric: "",
  },
  severity: "warning",
  assigneeId: "",
  dependsOn: [],
  onPass: [],
  onFail: [],
  correctiveInstructions: "",
  recheckMinutes: 60,
  maxRechecks: 3,
  escalationMinutes: 120,
  requireNotes: false,
  requireAttachment: false,
  gateStage: "",
});
export const SOP_TEMPLATES: SopDefinition[] = [
  {
    title: "Water-quality monitoring",
    description:
      "Set your farm targets, measurement windows, corrective instructions, and escalation timing before approval.",
    language: "en",
    steps: [emptySopStep()],
  },
  {
    title: "Sampling routine",
    description:
      "Configure sampling milestones and the measurements your farm requires.",
    language: "en",
    steps: [
      {
        ...emptySopStep(),
        title: "Save sampling measurements",
        trigger: {
          ...emptySopStep().trigger,
          kind: "doc",
          docFrom: 30,
          everyDays: 5,
        },
        check: {
          ...emptySopStep().check,
          field: "sampling.mbw",
          operator: "present",
          unit: "g",
          exactTime: false,
        },
        correctiveInstructions:
          "Record the required sampling and verify that the record has been saved.",
      },
    ],
  },
  {
    title: "Equipment inspection",
    description:
      "Define equipment checks and required photographic or written evidence.",
    language: "en",
    steps: [
      {
        ...emptySopStep(),
        title: "Inspect shared equipment",
        scope: "block",
        stages: [...SOP_STAGES],
        check: {
          ...emptySopStep().check,
          field: "manual",
          operator: "narrative",
          unit: "",
          exactTime: false,
          rubric:
            "Describe the equipment inspected, findings, and any corrective work.",
        },
        requireNotes: true,
        requireAttachment: true,
        severity: "low",
        correctiveInstructions:
          "Review the inspection findings and resolve any equipment faults.",
      },
    ],
  },
];

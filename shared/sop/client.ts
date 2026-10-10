import type {
  SopAdoption,
  SopAttachment,
  SopDefinition,
  SopTask,
  SopTarget,
} from "./contracts";
export interface SopDocument {
  id: string;
  title: string;
  definition: SopDefinition;
  revision: number;
  status: string;
  createdBy?: string;
  approvedVersionId?: string;
  source?: { author: string; publicationId: string; versionId: string };
}
export interface SopPublication {
  id: string;
  title: string;
  author: string;
  definition: SopDefinition;
  versionId: string;
  adoptionCount: number;
}
export interface SopIssue {
  id: string;
  title: string;
  status: string;
  severity: string;
  target: SopTarget;
  adoptionId: string;
  managerId: string;
  recoveryVerified: boolean;
  rechecks: number;
  openedAt?: number;
  closedAt?: number;
  failureExplanation?: string;
  originalCheck?: Record<string, unknown>;
}
export interface SopMember {
  id: string;
  name: string;
  role: string;
}
export interface SopNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  taskId?: string;
  createdAt: number;
}
export interface SopWorkspace {
  manage: boolean;
  canModerate?: boolean;
  timeZone: string;
  sops: SopDocument[];
  adoptions: SopAdoption[];
  tasks: SopTask[];
  issues: SopIssue[];
  blocks: { id: string; name: string; assignedTechnicianId?: string }[];
  physicalPonds: {
    id: string;
    pondName: string;
    blockId?: string;
    plannedStockingDate?: string;
  }[];
  ponds: {
    id: string;
    pondName: string;
    physicalPondId: string;
    blockId: string;
    cycleId: string;
    stockingDate: string;
    cycleStatus: string;
  }[];
  sources: { id: string; label: string; source: string; unit: string }[];
  community: SopPublication[];
  members: SopMember[];
  notifications: SopNotification[];
  truncated: boolean;
  nextSopCursor?: string;
  nextAdoptionCursor?: string;
  nextCommunityCursor?: string;
  nextTaskCursor?: string;
  nextIssueCursor?: string;
  summary?: {
    recorded: number;
    total: number;
    pass: number;
    fail: number;
    missing: number;
    exempt: number;
    issues: number;
    period: string;
  };
}
export const emptySopWorkspace = (): SopWorkspace => ({
  manage: false,
  timeZone: "",
  sops: [],
  adoptions: [],
  tasks: [],
  issues: [],
  blocks: [],
  physicalPonds: [],
  ponds: [],
  sources: [],
  community: [],
  members: [],
  notifications: [],
  truncated: false,
});
export interface SopClient {
  workspace: SopWorkspace;
  loading: boolean;
  error: string;
  pending: string[];
  busy: boolean;
  refresh: () => Promise<void>;
  loadMore: (
    kind: "tasks" | "issues" | "sops" | "adoptions" | "community",
  ) => Promise<void>;
  openAttachment: (
    attachment: SopAttachment,
    download?: boolean,
  ) => Promise<void>;
  command: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  assist: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  upload: (file: unknown, taskId?: string) => Promise<SopAttachment>;
}
export function sopSummary(workspace: SopWorkspace) {
  if (workspace.summary) return workspace.summary;
  const routine = workspace.tasks.filter((t) => t.purpose === "routine" && t.status !== "cancelled");
  return {
    recorded: routine.filter((t) => t.status === "completed").length,
    total: routine.length,
    pass: routine.filter((t) => t.result === "pass").length,
    fail: routine.filter((t) => t.result === "fail").length,
    missing: routine.filter((t) => t.result === "insufficient_evidence").length,
    exempt: routine.filter((t) => t.status === "waived").length,
    issues: workspace.issues.filter(
      (i) => !["closed", "exempted"].includes(i.status),
    ).length,
  };
}

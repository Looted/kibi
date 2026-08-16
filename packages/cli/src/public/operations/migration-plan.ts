import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import {
  getSchemaVersionStatus,
  normalizeSchemaVersion,
} from "../../utils/schema-version.js";

export const MIGRATION_PLAN_VERSION = "kibi.migration-plan.v2" as const;

export type MigrationActionState = "ready" | "blocked";
export type MigrationSafety = "automatic" | "review" | "operator" | "execution";
export type MigrationDisposition = "fixed" | "accepted" | "deferred";

export type MigrationInvocation =
  | Readonly<{
      kind: "operation";
      name: string;
      input: Readonly<Record<string, unknown>>;
    }>
  | Readonly<{
      kind: "cli";
      command_argv: readonly string[];
    }>
  | Readonly<{
      kind: "review";
      instruction: string;
    }>;

export type MigrationAction = Readonly<{
  id: string;
  code: string;
  category:
    | "package"
    | "branch"
    | "storage"
    | "schema"
    | "freshness"
    | "relationship"
    | "symbol"
    | "semantic"
    | "verification"
    | "quality";
  state: MigrationActionState;
  safety: MigrationSafety;
  invocation: MigrationInvocation;
  affectedEntityIds: readonly string[];
  affectedFiles: readonly string[];
  dependsOn: readonly string[];
  preconditions: readonly Readonly<Record<string, unknown>>[];
  postconditions: readonly Readonly<Record<string, unknown>>[];
  evidence: Readonly<Record<string, unknown>>;
  autoApplicable: boolean;
  dispositionRequired: boolean;
  allowedDispositions: readonly MigrationDisposition[];
}>;

export type MigrationPlan = Readonly<{
  version: typeof MIGRATION_PLAN_VERSION;
  planHash: string;
  status: "no_actions" | "ready" | "partial" | "blocked";
  expected: Readonly<{
    branch: string | null;
    kbBranch: string | null;
    kbSnapshotId: string | null;
    workspaceSnapshot: string | null;
    configHash: string | null;
  }>;
  scope: Readonly<{
    evaluatedDomains: readonly string[];
    incompleteDomains: readonly string[];
    complete: boolean;
  }>;
  summary: Readonly<{
    actionCount: number;
    readyActionCount: number;
    blockedActionCount: number;
    automaticActionCount: number;
    reviewActionCount: number;
    operatorActionCount: number;
    executionActionCount: number;
  }>;
  actions: readonly MigrationAction[];
  diagnostics: readonly string[];
}>;

type PlanInput = Readonly<{
  expected?: Partial<MigrationPlan["expected"]>;
  evaluatedDomains?: readonly string[];
  incompleteDomains?: readonly string[];
  actions?: readonly MigrationAction[];
  diagnostics?: readonly string[];
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stableValue(value: unknown, root = true): unknown {
  if (Array.isArray(value))
    return value.map((entry) => stableValue(entry, false));
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) =>
        root
          ? key !== "planHash" && key !== "status" && key !== "summary"
          : key !== "planHash",
      )
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item, false)]),
  );
}

// implements REQ-agent-guided-migration-orchestration
export function migrationPlanHash(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");
}

function uniqueSorted(values: readonly string[] | undefined): string[] {
  return [...new Set(values ?? [])].sort();
}

function actionSort(left: MigrationAction, right: MigrationAction): number {
  return (
    left.state.localeCompare(right.state) ||
    left.safety.localeCompare(right.safety) ||
    left.category.localeCompare(right.category) ||
    left.id.localeCompare(right.id)
  );
}

/** Return actions in a deterministic dependency-first order for agents and the applier. */
function dependencyOrder(
  actions: readonly MigrationAction[],
): MigrationAction[] {
  const byId = new Map(actions.map((action) => [action.id, action]));
  const remaining = new Map(
    actions.map((action) => [
      action.id,
      new Set(action.dependsOn.filter((dependency) => byId.has(dependency))),
    ]),
  );
  const ordered: MigrationAction[] = [];
  const ready = actions
    .filter((action) => (remaining.get(action.id)?.size ?? 0) === 0)
    .sort(actionSort)
    .map((action) => action.id);
  const queued = new Set(ready);
  while (ready.length > 0) {
    const id = ready.shift();
    if (id === undefined) break;
    queued.delete(id);
    const action = byId.get(id);
    if (action === undefined) continue;
    ordered.push(action);
    for (const [candidateId, dependencies] of remaining) {
      if (
        !dependencies.delete(id) ||
        dependencies.size !== 0 ||
        queued.has(candidateId)
      ) {
        continue;
      }
      ready.push(candidateId);
      queued.add(candidateId);
      ready.sort((left, right) => {
        const leftAction = byId.get(left);
        const rightAction = byId.get(right);
        if (leftAction === undefined || rightAction === undefined) {
          return left.localeCompare(right);
        }
        return actionSort(leftAction, rightAction);
      });
    }
  }
  // Preserve cyclic/missing-dependency actions in canonical order; validation will block them.
  if (ordered.length !== actions.length) {
    const emitted = new Set(ordered.map((action) => action.id));
    ordered.push(
      ...actions.filter((action) => !emitted.has(action.id)).sort(actionSort),
    );
  }
  return ordered;
}

function summarize(actions: readonly MigrationAction[]) {
  return {
    actionCount: actions.length,
    readyActionCount: actions.filter((action) => action.state === "ready")
      .length,
    blockedActionCount: actions.filter((action) => action.state === "blocked")
      .length,
    automaticActionCount: actions.filter(
      (action) => action.safety === "automatic",
    ).length,
    reviewActionCount: actions.filter((action) => action.safety === "review")
      .length,
    operatorActionCount: actions.filter(
      (action) => action.safety === "operator",
    ).length,
    executionActionCount: actions.filter(
      (action) => action.safety === "execution",
    ).length,
  };
}

// implements REQ-agent-guided-migration-orchestration
export function buildMigrationPlan(input: PlanInput = {}): MigrationPlan {
  const actions = dependencyOrder([...(input.actions ?? [])].sort(actionSort));
  const evaluatedDomains = uniqueSorted(input.evaluatedDomains);
  const incompleteDomains = uniqueSorted(input.incompleteDomains);
  const expected = {
    branch: input.expected?.branch ?? null,
    kbBranch: input.expected?.kbBranch ?? null,
    kbSnapshotId: input.expected?.kbSnapshotId ?? null,
    workspaceSnapshot: input.expected?.workspaceSnapshot ?? null,
    configHash: input.expected?.configHash ?? null,
  } as const;
  const body = {
    version: MIGRATION_PLAN_VERSION,
    expected,
    scope: {
      evaluatedDomains,
      incompleteDomains,
      complete: incompleteDomains.length === 0,
    },
    actions,
    diagnostics: [...(input.diagnostics ?? [])].sort(),
  };
  const planHash = migrationPlanHash(body);
  const summary = summarize(actions);
  const status =
    actions.length === 0 && incompleteDomains.length === 0
      ? "no_actions"
      : actions.length > 0 && summary.readyActionCount === 0
        ? "blocked"
        : incompleteDomains.length > 0 || summary.blockedActionCount > 0
          ? "partial"
          : "ready";
  return {
    ...body,
    planHash,
    status,
    summary,
  };
}

export function mergeMigrationPlans(
  plans: readonly MigrationPlan[],
): MigrationPlan {
  if (plans.length === 0) return buildMigrationPlan();
  const first = plans[0];
  if (first === undefined) return buildMigrationPlan();
  const actions = new Map<string, MigrationAction>();
  const diagnostics = new Set<string>();
  const evaluated = new Set<string>();
  const incomplete = new Set<string>();
  for (const plan of plans) {
    for (const action of plan.actions) {
      const existing = actions.get(action.id);
      if (existing === undefined || action.state === "ready") {
        actions.set(action.id, action);
      }
    }
    for (const value of plan.diagnostics) diagnostics.add(value);
    for (const value of plan.scope.evaluatedDomains) evaluated.add(value);
    for (const value of plan.scope.incompleteDomains) incomplete.add(value);
  }
  return buildMigrationPlan({
    expected: first.expected,
    evaluatedDomains: [...evaluated],
    incompleteDomains: [...incomplete],
    actions: [...actions.values()],
    diagnostics: [...diagnostics],
  });
}

function actionDefaults(input: Partial<MigrationAction>): MigrationAction {
  return {
    id: input.id ?? "migration-action-unknown",
    code: input.code ?? "migration_action",
    category: input.category ?? "quality",
    state: input.state ?? "ready",
    safety: input.safety ?? "review",
    invocation: input.invocation ?? {
      kind: "review",
      instruction: "Review this migration action and choose a disposition.",
    },
    affectedEntityIds: uniqueSorted(input.affectedEntityIds),
    affectedFiles: uniqueSorted(input.affectedFiles),
    dependsOn: uniqueSorted(input.dependsOn),
    preconditions: input.preconditions ?? [],
    postconditions: input.postconditions ?? [],
    evidence: input.evidence ?? {},
    autoApplicable: input.autoApplicable ?? false,
    dispositionRequired: input.dispositionRequired ?? false,
    allowedDispositions: input.allowedDispositions ?? [
      "fixed",
      "accepted",
      "deferred",
    ],
  };
}

export function migrationAction(
  input: Partial<MigrationAction> & Pick<MigrationAction, "id" | "code">,
): MigrationAction {
  return actionDefaults(input);
}

export function buildActionsFromCheck(input: {
  violations?: readonly Readonly<Record<string, unknown>>[];
  qualityDiagnostics?: readonly Readonly<Record<string, unknown>>[];
}): MigrationAction[] {
  const actions: MigrationAction[] = [];
  for (const [index, violation] of (input.violations ?? []).entries()) {
    const rule = typeof violation.rule === "string" ? violation.rule : "check";
    const entityId =
      typeof violation.entityId === "string" ? violation.entityId : "";
    const suggestion =
      typeof violation.suggestion === "string"
        ? violation.suggestion
        : typeof violation.description === "string"
          ? violation.description
          : "Review the blocking validation violation.";
    actions.push(
      migrationAction({
        id: `check-${rule}-${entityId || "workspace"}-${index + 1}`,
        code: `check_${rule}`,
        category: "quality",
        safety: "review",
        invocation: { kind: "review", instruction: suggestion },
        affectedEntityIds: entityId ? [entityId] : [],
        evidence: { violation },
        dispositionRequired: false,
      }),
    );
  }
  for (const [index, diagnostic] of (
    input.qualityDiagnostics ?? []
  ).entries()) {
    const id = typeof diagnostic.id === "string" ? diagnostic.id : "quality";
    const entityId =
      typeof diagnostic.entityId === "string" ? diagnostic.entityId : "";
    const suggestion =
      typeof diagnostic.suggestion === "string"
        ? diagnostic.suggestion
        : "Review this quality diagnostic.";
    const blocking = diagnostic.blocking === true;
    actions.push(
      migrationAction({
        id: `diagnostic-${id}-${entityId || "workspace"}-${index + 1}`,
        code: `quality_${id}`,
        category: "quality",
        safety: blocking ? "review" : "review",
        invocation: { kind: "review", instruction: suggestion },
        affectedEntityIds: entityId ? [entityId] : [],
        affectedFiles: Array.isArray(diagnostic.files)
          ? diagnostic.files.filter(
              (value): value is string => typeof value === "string",
            )
          : [],
        evidence: { diagnostic },
        dispositionRequired: true,
      }),
    );
  }
  return actions;
}

export function buildActionsFromCoverage(input: {
  repairPlan?: Readonly<Record<string, unknown>>;
  symbolRepairPlan?: Readonly<Record<string, unknown>>;
}): MigrationAction[] {
  const actions: MigrationAction[] = [];
  const batches = Array.isArray(input.repairPlan?.batches)
    ? input.repairPlan.batches.filter(isRecord)
    : [];
  for (const batch of batches) {
    const id = typeof batch.id === "string" ? batch.id : "repair-batch";
    const phase = typeof batch.phase === "string" ? batch.phase : "review";
    const req =
      typeof batch.requirementId === "string" ? batch.requirementId : "";
    const ready = batch.state === "ready";
    const automatic = phase === "source_coordinates";
    actions.push(
      migrationAction({
        id: `coverage-${id}`,
        code: `coverage_${phase}`,
        category:
          phase === "verification_evidence" ? "verification" : "semantic",
        state: ready ? "ready" : "blocked",
        safety: automatic
          ? "automatic"
          : phase === "verification_evidence"
            ? "execution"
            : "review",
        invocation: automatic
          ? {
              kind: "cli",
              command_argv: ["kibi", "sync", "--refresh-symbol-coordinates"],
            }
          : {
              kind: "review",
              instruction:
                typeof batch.objective === "string"
                  ? batch.objective
                  : "Apply the dependency-ordered coverage repair batch.",
            },
        affectedEntityIds: req ? [req] : [],
        dependsOn: Array.isArray(batch.dependsOn)
          ? batch.dependsOn
              .filter((value): value is string => typeof value === "string")
              .map((value) => `coverage-${value}`)
          : [],
        evidence: { batch },
        autoApplicable: automatic && ready,
        dispositionRequired: !automatic,
      }),
    );
  }
  const repairs = Array.isArray(input.symbolRepairPlan?.repairs)
    ? input.symbolRepairPlan.repairs.filter(isRecord)
    : [];
  for (const repair of repairs) {
    const symbolId =
      typeof repair.symbolId === "string" ? repair.symbolId : "symbol";
    const action = typeof repair.action === "string" ? repair.action : "review";
    const automatic = action === "refresh_coordinates";
    actions.push(
      migrationAction({
        id: `symbol-${action}-${symbolId}`,
        code: `symbol_${action}`,
        category: "symbol",
        safety: automatic ? "automatic" : "review",
        invocation: automatic
          ? {
              kind: "cli",
              command_argv: ["kibi", "sync", "--refresh-symbol-coordinates"],
            }
          : {
              kind: "review",
              instruction: `Review ${action} for ${symbolId} using current extraction and Git evidence.`,
            },
        affectedEntityIds: [symbolId],
        evidence: { repair },
        autoApplicable: automatic,
        dispositionRequired: !automatic,
      }),
    );
  }
  return actions;
}

export type MigrationConfigStatus = Readonly<{
  status: "missing" | "invalid" | "older" | "current" | "newer";
  currentVersion: number | null;
  latestVersion: number;
  needsMigration: boolean;
  warning: string | null;
  configHash: string | null;
}>;

export function readMigrationConfigStatus(
  workspaceRoot: string,
): MigrationConfigStatus {
  const configPath = path.join(workspaceRoot, ".kb", "config.json");
  if (!existsSync(configPath)) {
    const status = getSchemaVersionStatus(undefined);
    return { ...status, configHash: null };
  }
  try {
    const contents = readFileSync(configPath, "utf8");
    const parsed = JSON.parse(contents) as unknown;
    const config =
      parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as { schemaVersion?: number | string })
        : null;
    const status = getSchemaVersionStatus(config);
    return {
      ...status,
      currentVersion: normalizeSchemaVersion(config?.schemaVersion),
      configHash: createHash("sha256").update(contents).digest("hex"),
    };
  } catch {
    const status = getSchemaVersionStatus({ schemaVersion: "" });
    return {
      ...status,
      configHash: null,
      warning:
        "KB config.json is invalid JSON and must be repaired before migration.",
    };
  }
}

// implements REQ-agent-guided-migration-orchestration
export function buildActionsFromStatus(input: {
  workspaceRoot: string;
  branchAttachment?: Readonly<Record<string, unknown>>;
  branchStore?: Readonly<Record<string, unknown>>;
  staleReasons?: readonly Readonly<Record<string, unknown>>[];
  verificationSnapshotAvailable?: boolean;
  verificationSnapshotDirty?: boolean;
  kbSnapshotId?: string | null;
  workspaceSnapshot?: string | null;
  configStatus?: MigrationConfigStatus;
}): MigrationPlan {
  const actions: MigrationAction[] = [];
  const attachment = input.branchAttachment;
  const store = input.branchStore;
  const configStatus =
    input.configStatus ?? readMigrationConfigStatus(input.workspaceRoot);
  const branch =
    typeof attachment?.gitBranch === "string" ? attachment.gitBranch : null;
  const kbBranch =
    typeof attachment?.kbBranch === "string" ? attachment.kbBranch : null;

  if (attachment?.migrationRequired === true) {
    const legacy =
      attachment.kind === "legacy_compat" &&
      typeof branch === "string" &&
      typeof kbBranch === "string";
    actions.push(
      migrationAction({
        id: "branch-legacy-attachment",
        code: legacy ? "legacy_branch_storage" : "ambiguous_branch_attachment",
        category: "branch",
        state: legacy ? "ready" : "blocked",
        safety: legacy ? "automatic" : "operator",
        invocation: legacy
          ? {
              kind: "cli",
              command_argv: [
                "kibi",
                "branch",
                "migrate",
                "--from",
                kbBranch as string,
                "--to",
                branch as string,
                "--apply",
              ],
            }
          : {
              kind: "review",
              instruction:
                "Resolve branch and KB provenance explicitly; Kibi will not guess or rename Git branches.",
            },
        affectedFiles: [
          typeof attachment.storePath === "string"
            ? attachment.storePath
            : ".kb/branches",
        ],
        evidence: { attachment },
        autoApplicable: legacy,
        dispositionRequired: !legacy,
      }),
    );
  }

  const storeState = typeof store?.state === "string" ? store.state : null;
  if (storeState === "missing") {
    actions.push(
      migrationAction({
        id: "branch-store-ensure",
        code: "missing_exact_branch_store",
        category: "storage",
        safety: "automatic",
        invocation: { kind: "cli", command_argv: ["kibi", "branch", "ensure"] },
        affectedFiles: [
          typeof store?.path === "string" ? store.path : ".kb/branches",
        ],
        evidence: { store },
        autoApplicable: true,
      }),
    );
  } else if (storeState === "incomplete" || storeState === "unreadable") {
    actions.push(
      migrationAction({
        id: "branch-store-recover",
        code: "damaged_exact_branch_store",
        category: "storage",
        safety: "automatic",
        invocation: {
          kind: "cli",
          command_argv: ["kibi", "branch", "recover", "--apply"],
        },
        affectedFiles: [
          typeof store?.path === "string" ? store.path : ".kb/branches",
        ],
        evidence: { store, backupRequired: true },
        autoApplicable: true,
      }),
    );
  }

  if (configStatus.needsMigration) {
    actions.push(
      migrationAction({
        id: "schema-config-upgrade",
        code:
          configStatus.status === "invalid"
            ? "invalid_schema_version"
            : "schema_version_upgrade",
        category: "schema",
        state: configStatus.status === "newer" ? "blocked" : "ready",
        safety: configStatus.status === "newer" ? "operator" : "automatic",
        invocation: { kind: "cli", command_argv: ["kibi", "migrate", "--yes"] },
        affectedFiles: [".kb/config.json", ".kb/migrations"],
        evidence: { configStatus },
        dependsOn: storeState === "missing" ? ["branch-store-ensure"] : [],
        autoApplicable: configStatus.status !== "newer",
      }),
    );
  }

  for (const reason of input.staleReasons ?? []) {
    const code = typeof reason.code === "string" ? reason.code : "stale_source";
    const file = typeof reason.path === "string" ? reason.path : "";
    actions.push(
      migrationAction({
        id: `freshness-${code}-${file}`,
        code,
        category: "freshness",
        safety: "review",
        invocation: {
          kind: "review",
          instruction:
            typeof reason.remediation === "string"
              ? reason.remediation
              : "Refresh or reconcile the stale source, then run kibi sync and read back status.",
        },
        affectedFiles: file ? [file] : [],
        evidence: { reason },
        dispositionRequired: true,
      }),
    );
  }
  if (input.verificationSnapshotAvailable === false) {
    actions.push(
      migrationAction({
        id: "verification-snapshot-unavailable",
        code: "verification_snapshot_unavailable",
        category: "verification",
        safety: "operator",
        invocation: {
          kind: "review",
          instruction:
            "Use a runtime that can compute a workspace verification snapshot before claiming proof.",
        },
        evidence: { verificationSnapshotAvailable: false },
        dispositionRequired: true,
      }),
    );
  } else if (input.verificationSnapshotDirty === true) {
    actions.push(
      migrationAction({
        id: "verification-snapshot-dirty",
        code: "verification_snapshot_dirty",
        category: "verification",
        safety: "review",
        invocation: {
          kind: "review",
          instruction:
            "Resolve or intentionally record the listed dirty workspace paths before reusing or creating proof receipts.",
        },
        evidence: { verificationSnapshotDirty: true },
        dispositionRequired: true,
      }),
    );
  }

  const incompleteDomains = actions.some(
    (action) =>
      action.code === "damaged_exact_branch_store" ||
      action.code === "ambiguous_branch_attachment" ||
      action.code === "missing_exact_branch_store" ||
      action.code === "schema_version_upgrade" ||
      action.code === "invalid_schema_version",
  )
    ? ["kb"]
    : [];
  return buildMigrationPlan({
    expected: {
      branch,
      kbBranch,
      kbSnapshotId: input.kbSnapshotId ?? null,
      workspaceSnapshot: input.workspaceSnapshot ?? null,
      configHash: configStatus.configHash,
    },
    evaluatedDomains: [
      "package",
      "branch",
      "storage",
      "schema",
      "freshness",
      "verification",
    ],
    incompleteDomains,
    actions,
  });
}

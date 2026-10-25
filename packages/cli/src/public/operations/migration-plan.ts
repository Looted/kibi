import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { planLegacyStorageMigration } from "../../commands/legacy-storage-migration.js";
import { BRANCH_STORE_NOT_COMPILED } from "../../utils/branch-store.js";
import {
  LEGACY_KB_MIGRATION_COMMAND,
  LEGACY_KB_MIGRATION_NOTE,
  legacyConfigExists,
} from "../../utils/config.js";
import { MTIME_SOURCE_REASON_CODES } from "../../utils/content-freshness.js";
import { readKbManifestStatus } from "../../utils/kb-manifest.js";
import {
  getSchemaVersionStatus,
  normalizeSchemaVersion,
} from "../../utils/schema-version.js";
import {
  lifecycleActionsFromViolations,
  schema6ReviewActionsFromCheck,
} from "./schema6-check-actions.js";

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
    | "proof"
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

export function compareReadyActionIds(
  left: string,
  right: string,
  byId: ReadonlyMap<string, MigrationAction>,
): number {
  const leftAction = byId.get(left);
  const rightAction = byId.get(right);
  if (leftAction === undefined || rightAction === undefined) {
    return left.localeCompare(right);
  }
  return actionSort(leftAction, rightAction);
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
      ready.sort((left, right) => compareReadyActionIds(left, right, byId));
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

/** How many automatic actions a plan digest lists by id. */
const DIGEST_AUTOMATIC_ACTIONS = 20;

export const MIGRATION_PLAN_DIGEST_VERSION =
  "kibi.migration-plan-digest.v2" as const;

export type MigrationPlanDigest = Readonly<{
  version: typeof MIGRATION_PLAN_DIGEST_VERSION;
  planHash: string;
  status: MigrationPlan["status"];
  expected: MigrationPlan["expected"];
  scope: MigrationPlan["scope"];
  summary: MigrationPlan["summary"];
  /** The first automatic actions, by id; automaticSummary counts them all. */
  automaticActions: readonly Readonly<{
    id: string;
    code: string;
    state: MigrationActionState;
    autoApplicable: boolean;
    dependsOn: readonly string[];
  }>[];
  automaticSummary: Readonly<{
    total: number;
    ready: number;
    blocked: number;
    omitted: number;
  }>;
  actionGroups: readonly Readonly<{
    code: string;
    safety: MigrationSafety;
    state: MigrationActionState;
    count: number;
  }>[];
  diagnostics: readonly string[];
  next: string;
}>;

/**
 * A bounded summary of a plan for responses that report what is left rather
 * than hand over a plan to apply: the first automatic actions are listed by
 * id and all of them counted, every other action is counted by code. The full
 * plan comes from status, check and coverage, so a response stays small even
 * when hundreds of actions remain.
 */
// implements REQ-agent-guided-migration-orchestration
export function digestMigrationPlan(plan: MigrationPlan): MigrationPlanDigest {
  const groups = new Map<
    string,
    {
      code: string;
      safety: MigrationSafety;
      state: MigrationActionState;
      count: number;
    }
  >();
  for (const action of plan.actions) {
    if (action.safety === "automatic") continue;
    const key = `${action.code}\u0000${action.safety}\u0000${action.state}`;
    const group = groups.get(key);
    if (group === undefined)
      groups.set(key, {
        code: action.code,
        safety: action.safety,
        state: action.state,
        count: 1,
      });
    else group.count += 1;
  }
  const automaticActions = plan.actions.filter(
    (action) => action.safety === "automatic",
  );
  const blockedAutomatic = automaticActions.filter(
    (action) => action.state === "blocked",
  ).length;
  const blockedNote =
    blockedAutomatic === 0
      ? ""
      : ` ${blockedAutomatic === 1 ? "1 automatic action is" : `${blockedAutomatic} automatic actions are`} blocked: it waits for the actions in its dependsOn and needs no approval until a later plan shows it ready.`;
  return {
    version: MIGRATION_PLAN_DIGEST_VERSION,
    planHash: plan.planHash,
    status: plan.status,
    expected: plan.expected,
    scope: plan.scope,
    summary: plan.summary,
    automaticActions: automaticActions
      .slice(0, DIGEST_AUTOMATIC_ACTIONS)
      .map((action) => ({
        id: action.id,
        code: action.code,
        state: action.state,
        autoApplicable: action.autoApplicable,
        dependsOn: action.dependsOn,
      })),
    automaticSummary: {
      total: automaticActions.length,
      ready: automaticActions.filter(
        (action) => action.state === "ready" && action.autoApplicable,
      ).length,
      blocked: blockedAutomatic,
      omitted: Math.max(0, automaticActions.length - DIGEST_AUTOMATIC_ACTIONS),
    },
    actionGroups: [...groups.values()].sort(
      (left, right) =>
        right.count - left.count ||
        left.code.localeCompare(right.code) ||
        left.state.localeCompare(right.state),
    ),
    diagnostics: plan.diagnostics,
    next: `This digest cannot be applied. Run kb_status, kb_check and kb_coverage (or kibi migrate) for the full plan and its action details.${blockedNote}`,
  };
}

/**
 * The same plan without the actions whose code another planner owns, e.g.
 * lifecycle repairs `kibi migrate` plans from authored sources.
 */
// implements REQ-agent-guided-migration-orchestration
export function withoutActionCodes(
  plan: MigrationPlan,
  codes: ReadonlySet<string>,
): MigrationPlan {
  if (!plan.actions.some((action) => codes.has(action.code))) return plan;
  return buildMigrationPlan({
    expected: plan.expected,
    evaluatedDomains: plan.scope.evaluatedDomains,
    incompleteDomains: plan.scope.incompleteDomains,
    actions: plan.actions.filter((action) => !codes.has(action.code)),
    diagnostics: plan.diagnostics,
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

/**
 * A predicate-schema-conformance finding whose repair is mechanical (move to
 * the only matching schema namespace, rewrite declared aliases) becomes an
 * automatic action carrying the exact kb_upsert input, so it is reviewable in
 * the plan and replayable through either surface.
 */
// implements REQ-kibi-predicate-vocabulary-migration
function predicateSchemaAlignmentAction(
  diagnostic: Readonly<Record<string, unknown>>,
): MigrationAction | null {
  if (diagnostic.id !== "rule.predicate-schema-conformance") return null;
  const evidence = isRecord(diagnostic.evidence) ? diagnostic.evidence : null;
  const repair =
    evidence !== null && isRecord(evidence.repair) ? evidence.repair : null;
  if (
    repair === null ||
    repair.type !== "fact" ||
    typeof repair.id !== "string" ||
    !isRecord(repair.properties)
  ) {
    return null;
  }
  return migrationAction({
    id: `predicate-schema-alignment-${repair.id}`,
    code: PREDICATE_SCHEMA_ALIGNMENT_CODE,
    category: "semantic",
    safety: "automatic",
    autoApplicable: true,
    invocation: { kind: "operation", name: "kb_upsert", input: repair },
    affectedEntityIds: [repair.id],
    affectedFiles:
      typeof diagnostic.source === "string" ? [diagnostic.source] : [],
    postconditions: [
      {
        rule: "predicate-schema-conformance",
        entityId: repair.id,
        findings: 0,
      },
    ],
    evidence: {
      issue: evidence?.issue,
      namespace: evidence?.namespace,
      alignment: evidence?.alignment,
      rewrites: evidence?.rewrites,
    },
  });
}

/** Migration code for mechanical predicate namespace/alias repairs. */
export const PREDICATE_SCHEMA_ALIGNMENT_CODE = "predicate_schema_alignment";

/** Migration code of the grouped untracked-source parity findings. */
export const UNTRACKED_KNOWLEDGE_SOURCES_CODE = "untracked_knowledge_sources";

/**
 * Every source-relationship-parity finding explained by untracked files
 * (evidence `untrackedSources`) has one cause and one fix: the files Git
 * does not track and no pending-source receipt covers. After a storage move
 * that can be thousands of relationships, so they become one review action
 * naming the files instead of one per relationship.
 */
// implements REQ-agent-guided-migration-orchestration, REQ-kibi-source-relationship-parity
function untrackedSourceActionFromViolations(
  violations: readonly Readonly<Record<string, unknown>>[],
): { action: MigrationAction; consumed: ReadonlySet<number> } | null {
  const consumed = new Set<number>();
  const files = new Set<string>();
  const entityIds = new Set<string>();
  const relationships: unknown[] = [];
  for (const [index, violation] of violations.entries()) {
    if (violation.rule !== "source-relationship-parity") continue;
    const evidence = isRecord(violation.evidence) ? violation.evidence : {};
    const sources = Array.isArray(evidence.untrackedSources)
      ? evidence.untrackedSources.filter(isRecord)
      : [];
    if (sources.length === 0) continue;
    consumed.add(index);
    for (const source of sources) {
      if (typeof source.file === "string") files.add(source.file);
      if (typeof source.entityId === "string") entityIds.add(source.entityId);
    }
    if (evidence.relationship !== undefined)
      relationships.push(evidence.relationship);
  }
  if (consumed.size === 0) return null;
  const listed = [...files].sort();
  return {
    consumed,
    action: migrationAction({
      id: "untracked-knowledge-sources",
      code: UNTRACKED_KNOWLEDGE_SOURCES_CODE,
      category: "relationship",
      safety: "review",
      invocation: {
        kind: "review",
        instruction: `${consumed.size} authored relationship(s) are missing from the compiled KB because ${listed.length} file(s) declaring their endpoints are not tracked by Git and no pending-source receipt covers them: ${listed.join(", ")}. Stage them (git add; staging is enough, Kibi never stages files itself) or rewrite the entities with kb_upsert, then run kibi sync and rerun kibi migrate.`,
      },
      affectedEntityIds: [...entityIds],
      affectedFiles: listed,
      postconditions: [{ rule: "source-relationship-parity", findings: 0 }],
      evidence: {
        relationshipCount: consumed.size,
        files: listed,
        // A sample; the count above is the full number.
        relationships: relationships.slice(0, 20),
      },
      dispositionRequired: true,
    }),
  };
}

// implements REQ-agent-guided-migration-orchestration, REQ-kibi-predicate-vocabulary-migration, REQ-cli-schema-migration
export function buildActionsFromCheck(input: {
  violations?: readonly Readonly<Record<string, unknown>>[];
  qualityDiagnostics?: readonly Readonly<Record<string, unknown>>[];
}): MigrationAction[] {
  const actions: MigrationAction[] = [];
  const lifecycle = lifecycleActionsFromViolations(input.violations ?? []);
  actions.push(...lifecycle.actions.map(migrationAction));
  const untracked = untrackedSourceActionFromViolations(input.violations ?? []);
  if (untracked !== null) actions.push(untracked.action);
  for (const [index, violation] of (input.violations ?? []).entries()) {
    if (lifecycle.consumed.has(index)) continue;
    if (untracked?.consumed.has(index)) continue;
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
  const reviews = schema6ReviewActionsFromCheck(input.qualityDiagnostics ?? []);
  actions.push(...reviews.actions.map(migrationAction));
  for (const [index, diagnostic] of (
    input.qualityDiagnostics ?? []
  ).entries()) {
    if (reviews.consumed.has(index)) continue;
    const id = typeof diagnostic.id === "string" ? diagnostic.id : "quality";
    const entityId =
      typeof diagnostic.entityId === "string" ? diagnostic.entityId : "";
    const suggestion =
      typeof diagnostic.suggestion === "string"
        ? diagnostic.suggestion
        : "Review this quality diagnostic.";
    const blocking = diagnostic.blocking === true;
    const predicateRepair = predicateSchemaAlignmentAction(diagnostic);
    if (predicateRepair !== null) {
      actions.push(predicateRepair);
      continue;
    }
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
    const automatic =
      phase === "source_coordinates" &&
      batch.writePolicy === "refresh_then_sync";
    actions.push(
      migrationAction({
        id: `coverage-${id}`,
        code: `coverage_${phase}`,
        category: phase === "proof_evidence" ? "proof" : "semantic",
        state: ready ? "ready" : "blocked",
        safety: automatic
          ? "automatic"
          : phase === "proof_evidence"
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
              instruction: `Review ${action} for ${symbolId} using current extraction and Git evidence. Query the symbol and validate/upsert a corrected sourceFile/title or an intentional granularity_reason: extractor-miss when extraction cannot locate it.`,
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

/** Source-rewrite actions a schema upgrade performs, as its planner returns them. */
export type SchemaUpgradeSourceActions = Readonly<{
  actions: readonly MigrationAction[];
  /** Automatic actions that rewrite authored sources; the upgrade waits on them. */
  sourceRewriteActionIds: readonly string[];
  diagnostics: readonly string[];
}>;

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
  const status = readKbManifestStatus(workspaceRoot);
  if (status.state === "ok") {
    return {
      status: getSchemaVersionStatus({
        schemaVersion: status.manifest.schemaVersion,
      }).status,
      currentVersion: status.manifest.schemaVersion,
      latestVersion: getSchemaVersionStatus({
        schemaVersion: status.manifest.schemaVersion,
      }).latestVersion,
      needsMigration: getSchemaVersionStatus({
        schemaVersion: status.manifest.schemaVersion,
      }).needsMigration,
      warning: null,
      configHash: status.manifestHash,
    };
  }
  const legacySchemaVersion = readLegacySchemaVersion(workspaceRoot);
  const schemaStatus = getSchemaVersionStatus(
    legacySchemaVersion === null
      ? undefined
      : { schemaVersion: legacySchemaVersion },
  );
  return {
    ...schemaStatus,
    currentVersion: normalizeSchemaVersion(legacySchemaVersion),
    configHash: null,
    // implements REQ-legacy-kb-first-step-migrate
    // A legacy KB is migrated, never initialized: name the step kb_status's
    // bootstrap.nextAction and kibi doctor name.
    warning:
      status.state === "missing" && legacyConfigExists(workspaceRoot)
        ? `Kibi lifecycle manifest is missing because this KB was written by an older Kibi; run '${LEGACY_KB_MIGRATION_COMMAND}' (${LEGACY_KB_MIGRATION_NOTE}).`
        : status.warning,
  };
}

/**
 * Best-effort recognition of a legacy `.kb/config.json` schemaVersion for
 * repositories that have not yet run the storage migration. Malformed
 * documents return null so status reports demand repair rather than
 * silently treating the KB as uninitialized.
 */
function readLegacySchemaVersion(
  workspaceRoot: string,
): number | string | null {
  const legacyPath = path.join(workspaceRoot, ".kb", "config.json");
  if (!existsSync(legacyPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(legacyPath, "utf8")) as {
      schemaVersion?: number | string;
    };
    return parsed.schemaVersion ?? null;
  } catch {
    return "";
  }
}

// implements REQ-agent-guided-migration-orchestration
/** Migration action code of the automatic recompile of changed sources. */
export const FRESHNESS_RESYNC = "freshness_resync";

// implements REQ-cli-status-pre-first-sync
/**
 * Stale reasons one `kibi sync` clears: sources whose content changed since
 * the last compilation, and a store compiled under another compiler contract
 * (the sync discards that cache, re-imports every source and stamps the
 * current contract).
 */
const RESYNC_REASON_CODES: ReadonlySet<string> = new Set([
  ...MTIME_SOURCE_REASON_CODES,
  "compiler_changed",
]);

export function buildActionsFromStatus(input: {
  workspaceRoot: string;
  branchAttachment?: Readonly<Record<string, unknown>>;
  branchStore?: Readonly<Record<string, unknown>>;
  staleReasons?: readonly Readonly<Record<string, unknown>>[];
  proofSnapshotAvailable?: boolean;
  proofSnapshotDirty?: boolean;
  kbSnapshotId?: string | null;
  workspaceSnapshot?: string | null;
  configStatus?: MigrationConfigStatus;
  /**
   * Plans the authored-source rewrites `kibi migrate --yes` performs on its
   * way to the latest schema (the planner `kibi migrate` itself uses), so
   * the schema upgrade declares every file it touches. Read-only.
   */
  planSchemaUpgradeSources?: (
    currentSchemaVersion: number | null,
  ) => SchemaUpgradeSourceActions;
}): MigrationPlan {
  const actions: MigrationAction[] = [];
  const diagnostics: string[] = [];
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
  // Legacy storage is evaluated whether or not the legacy config survives:
  // legacy copies left beside a migrated .kb/ (moved, identical or stale)
  // are the same finding 'kibi doctor' and 'kibi migrate' report.
  // implements REQ-cli-schema-migration
  const legacyStorage = planLegacyStorageMigration(input.workspaceRoot);
  const legacyStorageMigrationRequired =
    legacyConfigExists(input.workspaceRoot) ||
    legacyStorage.moves.length > 0 ||
    legacyStorage.removals.length > 0 ||
    legacyStorage.blockers.length > 0;
  // A legacy cutover that cannot move its files (a destination already
  // exists, a malformed config) is an operator decision, not an automatic
  // step that fails when applied and takes the compile with it.
  const legacyStorageBlocked = legacyStorage.blockers.length > 0;
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

  if (configStatus.needsMigration || legacyStorageMigrationRequired) {
    const operatorOnly =
      configStatus.status === "newer" || legacyStorageBlocked;
    // implements REQ-agent-guided-migration-orchestration, REQ-cli-schema-migration
    // The source rewrites the migrate run performs (legacy-link marks, origin
    // backfill, lifecycle repairs, ...) are planned as their own actions with
    // their own files, and the upgrade waits on them, so approving it means
    // approving them. Knowledge still outside .kb/ is planned after it moves.
    const sources =
      !operatorOnly &&
      !legacyStorageMigrationRequired &&
      input.planSchemaUpgradeSources !== undefined
        ? input.planSchemaUpgradeSources(configStatus.currentVersion)
        : null;
    if (sources !== null) {
      actions.push(...sources.actions);
      diagnostics.push(...sources.diagnostics);
    }
    actions.push(
      migrationAction({
        id: "schema-config-upgrade",
        code:
          configStatus.status === "invalid"
            ? "invalid_schema_version"
            : legacyStorageMigrationRequired
              ? "legacy_storage_migration"
              : "schema_version_upgrade",
        category: "schema",
        state: operatorOnly ? "blocked" : "ready",
        safety: operatorOnly ? "operator" : "automatic",
        invocation: legacyStorageBlocked
          ? {
              kind: "review",
              instruction: `Legacy knowledge files outside .kb/ cannot be migrated automatically: ${legacyStorage.blockers.join(" ")} Then run 'kibi migrate --yes'.`,
            }
          : { kind: "cli", command_argv: ["kibi", "migrate", "--yes"] },
        affectedFiles: [
          ".kb/manifest.json",
          ".kb/migrations",
          ".kb/config.json",
          // The migrate run keeps the canonical derived entries ignored.
          ".gitignore",
          // Unplanned source rewrites can touch any authored .kb/ file.
          ...(sources === null ? [".kb/"] : []),
          ...legacyStorage.moves.map((move) => move.from),
          ...legacyStorage.removals.map((removal) => removal.path),
        ],
        evidence: {
          configStatus,
          ...(sources === null
            ? {
                sourceRewrites:
                  "Not planned as separate actions: kibi migrate --yes also marks coarse symbol links legacy-link, backfills origin and repairs lifecycle findings in authored .kb/ sources. The plan lists them as their own actions once the upgrade can run automatically on the canonical .kb/ layout.",
              }
            : {}),
          ...(legacyStorageMigrationRequired
            ? {
                legacyStorage: {
                  moves: legacyStorage.moves,
                  removals: legacyStorage.removals,
                  conflicts: legacyStorage.conflicts,
                  blockers: legacyStorage.blockers,
                  legacyConfig: legacyStorage.legacyConfig,
                },
              }
            : {}),
        },
        dependsOn: [
          ...(storeState === "missing" ? ["branch-store-ensure"] : []),
          ...(sources?.sourceRewriteActionIds ?? []),
        ],
        autoApplicable: !operatorOnly,
      }),
    );
  }

  // implements REQ-cli-status-pre-first-sync
  // A branch store that was never compiled while .kb/ holds authored sources
  // is fixed only by compiling it: `kibi branch ensure` alone leaves an empty
  // manifest. The compile step runs after the store exists and after any
  // schema migration, so it compiles the migrated sources.
  const uncompiled = (input.staleReasons ?? []).find(
    (reason) => reason.code === BRANCH_STORE_NOT_COMPILED,
  );
  if (uncompiled !== undefined) {
    actions.push(
      migrationAction({
        id: "branch-store-compile",
        code: BRANCH_STORE_NOT_COMPILED,
        category: "storage",
        safety: "automatic",
        invocation: { kind: "cli", command_argv: ["kibi", "sync"] },
        affectedFiles: [
          typeof store?.path === "string" ? store.path : ".kb/branches",
        ],
        evidence: { reason: uncompiled },
        // A blocked schema step waits on an operator; the compile still runs
        // from the .kb/ sources Kibi already reads.
        dependsOn: actions
          .filter(
            (action) =>
              action.state === "ready" &&
              (action.id === "branch-store-ensure" ||
                action.id === "schema-config-upgrade"),
          )
          .map((action) => action.id),
        postconditions: [{ branchStore: "compiled" }],
        autoApplicable: true,
      }),
    );
  }

  // implements REQ-cli-status-pre-first-sync
  // Sources whose content changed since the last compilation (kb_status has
  // already dropped mtime-only reasons) are fixed by recompiling them: one
  // automatic `kibi sync`, not a review per file. A store compiled under
  // another compiler contract is fixed by the same sync. An uncompiled store
  // is compiled by the step above, which also covers these reasons.
  const resyncReasons = (input.staleReasons ?? []).filter(
    (reason) =>
      typeof reason.code === "string" && RESYNC_REASON_CODES.has(reason.code),
  );
  if (resyncReasons.length > 0 && uncompiled === undefined) {
    actions.push(
      migrationAction({
        id: "freshness-resync",
        code: FRESHNESS_RESYNC,
        category: "freshness",
        safety: "automatic",
        invocation: { kind: "cli", command_argv: ["kibi", "sync"] },
        affectedFiles: [
          ...new Set(
            resyncReasons.flatMap((reason) =>
              typeof reason.path === "string" ? [reason.path] : [],
            ),
          ),
        ].sort(),
        evidence: { reasons: resyncReasons },
        dependsOn: actions
          .map((action) => action.id)
          .filter(
            (id) =>
              id === "branch-store-ensure" || id === "schema-config-upgrade",
          ),
        postconditions: [{ syncState: "fresh" }],
        autoApplicable: true,
      }),
    );
  }

  for (const reason of input.staleReasons ?? []) {
    const code = typeof reason.code === "string" ? reason.code : "stale_source";
    // Planned above as an automatic compile step, not a review.
    if (code === BRANCH_STORE_NOT_COMPILED) continue;
    // Planned above as one automatic resync (or covered by the compile).
    if (RESYNC_REASON_CODES.has(code)) continue;
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
  if (input.proofSnapshotAvailable === false) {
    actions.push(
      migrationAction({
        id: "verification-snapshot-unavailable",
        code: "proof_snapshot_unavailable",
        category: "proof",
        safety: "operator",
        invocation: {
          kind: "review",
          instruction:
            "Use a runtime that can compute a workspace verification snapshot before claiming proof.",
        },
        evidence: { proofSnapshotAvailable: false },
        dispositionRequired: true,
      }),
    );
  } else if (input.proofSnapshotDirty === true) {
    actions.push(
      migrationAction({
        id: "verification-snapshot-dirty",
        code: "proof_snapshot_dirty",
        category: "proof",
        safety: "review",
        invocation: {
          kind: "review",
          instruction:
            "Resolve or intentionally record the listed dirty workspace paths before reusing or creating proof receipts.",
        },
        evidence: { proofSnapshotDirty: true },
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
      action.code === "invalid_schema_version" ||
      action.code === "legacy_storage_migration",
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
      "proof",
    ],
    incompleteDomains,
    actions,
    diagnostics,
  });
}

import path from "node:path";

import type { OperationContext } from "../../public/operations/runtime-types.js";
import {
  LEGACY_KB_MIGRATION_COMMAND,
  LEGACY_KB_MIGRATION_NOTE,
  readLegacyKbConfig,
} from "../../utils/config.js";
import { readKbManifestStatus } from "../../utils/kb-manifest.js";
import { KB_PATHS } from "../../utils/kb-paths.js";
import type { ActivationPolicy, ActivationState, Candidate } from "./types.js";

// implements REQ-KIBI-BOOTSTRAP-PLAN
// covered_by TEST-KIBI-BOOTSTRAP-PLAN-APPLY
export function missingManifestActivation(
  vendored: boolean,
  projectSignal: boolean,
): ActivationPolicy {
  return activationFor(
    vendored && !projectSignal ? "vendored_only" : "root_uninitialized",
  );
}

/**
 * A legacy `.kb/config.json` without a manifest holds knowledge written by an
 * older Kibi: it is migrated, never initialized, so the first step is the one
 * `kibi doctor` names.
 */
// implements REQ-legacy-kb-first-step-migrate
export function legacyKbActivation(): ActivationPolicy {
  return {
    activationState: "root_partial",
    activationMode: "repair_bootstrap",
    applyBlocked: true,
    allowCandidateGeneration: true,
    allowDeclaredClaims: true,
    reason: `Workspace has a legacy .kb/config.json and no .kb/manifest.json; run \`${LEGACY_KB_MIGRATION_COMMAND}\` (${LEGACY_KB_MIGRATION_NOTE}) before planning bootstrap knowledge.`,
    handoffMessage: `This knowledge base was written by an older Kibi. Run \`${LEGACY_KB_MIGRATION_COMMAND}\` (${LEGACY_KB_MIGRATION_NOTE}), then check kb_status again.`,
    nextOperation: LEGACY_KB_MIGRATION_COMMAND,
  };
}

function activationFor(state: ActivationState): ActivationPolicy {
  switch (state) {
    case "root_uninitialized":
      return {
        activationState: state,
        activationMode: "cold_start_bootstrap",
        applyBlocked: true,
        // Discovery remains useful for explaining the next step, but the
        // resulting plan is blocked until `kibi init` establishes the root.
        allowCandidateGeneration: true,
        allowDeclaredClaims: true,
        reason:
          "Workspace has no attached root KB yet; run `kibi init` before planning bootstrap knowledge.",
        handoffMessage:
          "Kibi infrastructure is not initialized. Run `kibi init`, then ask the agent to bootstrap this repository.",
      };
    case "root_partial":
      return {
        activationState: state,
        activationMode: "repair_bootstrap",
        applyBlocked: true,
        allowCandidateGeneration: true,
        allowDeclaredClaims: true,
        reason:
          "Workspace root is only partially configured; run a repair bootstrap scan and keep apply blocked until the root is repaired.",
      };
    case "vendored_only":
      return {
        activationState: state,
        activationMode: "vendored_blocked",
        applyBlocked: true,
        allowCandidateGeneration: false,
        allowDeclaredClaims: false,
        reason:
          "Workspace appears to contain vendored Kibi sources only; bootstrap generation is blocked in this posture.",
        handoffMessage:
          "Vendored Kibi posture detected. Move to the real project root before attempting bootstrap.",
      };
    case "root_active_thin":
      return {
        activationState: state,
        activationMode: "attached_thin_bootstrap",
        applyBlocked: false,
        allowCandidateGeneration: true,
        allowDeclaredClaims: true,
        reason:
          "Workspace has an attached but unseeded KB; deterministic bootstrap planning is eligible.",
      };
    case "root_active_seeded":
      return {
        activationState: state,
        activationMode: "attached_seeded_handoff",
        // Blocked until the plan holds declared claims; see claimPlanActivation.
        applyBlocked: true,
        allowCandidateGeneration: false,
        allowDeclaredClaims: true,
        reason:
          "Workspace already has an attached seeded KB; discovered bootstrap candidates are replaced by an explicit seeded handoff, and only declared intent claims are planned against the existing KB.",
        handoffMessage:
          "Attached seeded KB detected. Kibi does not generate discovered bootstrap candidates here: use kb_search and kb_query for existing KB context. Declare cited intentClaims in bootstrapContext to plan them against the existing KB, or compile each claim with kb_compile_intent.",
      };
  }
}

/**
 * On a seeded KB the plan may hold declared intent claims, already
 * deduplicated against the existing KB. Such a plan is applicable like a thin
 * bootstrap plan; a seeded plan holding anything else stays a handoff.
 */
// implements REQ-bootstrap-discovered-candidate-budget
// covered_by TEST-KIBI-BOOTSTRAP-PLAN-APPLY
export function claimPlanActivation(
  policy: ActivationPolicy,
  candidates: readonly Candidate[],
): ActivationPolicy {
  if (
    policy.activationState !== "root_active_seeded" ||
    candidates.length === 0 ||
    candidates.some((candidate) => candidate.sourceKind !== "intent_claim")
  )
    return policy;
  return {
    ...policy,
    applyBlocked: false,
    reason:
      "Workspace already has an attached seeded KB; discovered bootstrap candidates are not generated, and the plan holds only declared intent claims that are not yet in the KB.",
    handoffMessage:
      "Attached seeded KB detected. The plan holds only your declared intent claims, deduplicated against the existing KB: review it and call kb_apply_plan after explicit approval. Discovered candidates are not generated here; use kb_search and kb_query for existing knowledge, and compile any claim left in sourceOnlySignals with kb_compile_intent.",
  };
}

async function exists(
  context: OperationContext,
  target: string,
): Promise<boolean> {
  try {
    await context.fs?.stat(target);
    return true;
  } catch {
    // Absent or unreadable.
  }
  return false;
}

type CoverageRow = Readonly<{ type: unknown; count: number }>;

/** Seeded once the KB holds a requirement, five entities and support. */
function coverageState(rows: readonly CoverageRow[]): ActivationState {
  const counts: Record<string, number> = {};
  for (const { type, count } of rows)
    counts[type as string] = (counts[type as string] ?? 0) + count;
  const total = (...types: string[]) =>
    types.reduce((sum, type) => sum + (counts[type] ?? 0), 0);
  return total("req") >= 1 &&
    total("req", "scenario", "test", "adr", "flag", "event", "fact") >= 5 &&
    total("scenario", "test", "adr", "fact") >= 1
    ? "root_active_seeded"
    : "root_active_thin";
}

const LANE_FILE =
  /^\.kb\/(requirements|scenarios|tests|adrs?|flags|events|facts)\/.*\.md$/i;
const LANE_TYPE: Readonly<Record<string, string>> = {
  requirements: "req",
  scenarios: "scenario",
  tests: "test",
  adr: "adr",
  adrs: "adr",
  flags: "flag",
  events: "event",
  facts: "fact",
};

/** One row per authored entity file in a lane. */
function sourceCoverageState(files: readonly string[]): ActivationState {
  return coverageState(
    files
      .map((file) => LANE_FILE.exec(file)?.[1])
      .filter((lane): lane is string => lane !== undefined)
      .map((lane) => ({ type: LANE_TYPE[lane.toLowerCase()], count: 1 })),
  );
}

// implements REQ-KIBI-BOOTSTRAP-PLAN
export async function classifyActivation(
  context: OperationContext,
  files?: readonly string[],
): Promise<ActivationPolicy> {
  // Discovery callers do not all use the same path base.  The CLI globber
  // returns workspace-relative paths, while host adapters may pass absolute
  // paths.  Normalize before source-lane classification so a seeded source
  // KB has the same posture on every peer surface.
  // Hosts (and leaked fast-glob mocks) may omit or return a non-array; treat
  // that as "no source files" rather than crashing status/bootstrap.
  // rationale: a placeholder path is neither vendored, a project signal nor
  // a KB source file, so it classifies like no files at all.
  // Stryker disable next-line ArrayDeclaration
  const sourceFiles = Array.isArray(files) ? files : [];
  const normalizedFiles = sourceFiles.map((file) => {
    const relative = path.isAbsolute(file)
      ? path.relative(context.workspaceRoot, file)
      : file;
    return relative.replaceAll("\\", "/");
  });
  const manifestStatus = readKbManifestStatus(context.workspaceRoot);
  if (
    manifestStatus.state === "missing" &&
    readLegacyKbConfig(context.workspaceRoot).kind !== "none"
  )
    return legacyKbActivation();
  if (manifestStatus.state === "missing") {
    const vendored = normalizedFiles.some((file) => file.startsWith("kibi/"));
    // A kibi/ path never starts like a project file.
    const projectSignalFromFiles = normalizedFiles.some((file) =>
      /^(README\.md|package\.json|src\/|app\/|packages\/|tests\/)/.test(file),
    );
    const projectSignalFromDirectories = await Promise.all(
      ["README.md", "package.json", "src", "app", "packages", "tests"].map(
        (target) =>
          exists(context, path.resolve(context.workspaceRoot, target)),
      ),
    );
    const projectSignal =
      projectSignalFromFiles || projectSignalFromDirectories.some(Boolean);
    return missingManifestActivation(vendored, projectSignal);
  }
  if (manifestStatus.state !== "ok") return activationFor("root_partial");
  const targets = [...Object.values(KB_PATHS.lanes), KB_PATHS.symbolsManifest];
  const resolved = await Promise.all(
    targets.map((target) =>
      exists(context, path.resolve(context.workspaceRoot, target)),
    ),
  );
  if (resolved.some((value) => !value)) return activationFor("root_partial");
  if (!context.prolog)
    // Without KB source files the count is that of a thin KB.
    return activationFor(sourceCoverageState(normalizedFiles));
  try {
    const result = await context.prolog.query(
      "discovery:coverage_report_json(type, [], true, false, 100, 0, JsonString)",
    );
    // A missing binding, a payload without a rows list or a null row throws
    // here, and the catch below reads a thin KB as an empty report would.
    const { rows } = JSON.parse(result.bindings.JsonString as string) as {
      rows: { type?: unknown; count?: unknown }[];
    };
    // A row whose type is not a lane name counts towards nothing.
    const counted = rows.filter(
      (row): row is CoverageRow => typeof row.count === "number",
    );
    return activationFor(coverageState(counted));
  } catch {
    return activationFor("root_active_thin");
  }
}

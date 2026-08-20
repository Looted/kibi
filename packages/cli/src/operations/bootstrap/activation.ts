import path from "node:path";

import type { OperationContext } from "../../public/operations/runtime-types.js";
import { KB_PATHS } from "../../utils/kb-paths.js";
import { readKbManifestStatus } from "../../utils/kb-manifest.js";
import type { ActivationPolicy, ActivationState } from "./types.js";

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
        reason:
          "Workspace root is only partially configured; run a repair bootstrap scan and keep apply blocked until the root is repaired.",
      };
    case "vendored_only":
      return {
        activationState: state,
        activationMode: "vendored_blocked",
        applyBlocked: true,
        allowCandidateGeneration: false,
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
        reason:
          "Workspace has an attached but unseeded KB; deterministic bootstrap planning is eligible.",
      };
    case "root_active_seeded":
      return {
        activationState: state,
        activationMode: "attached_seeded_handoff",
        applyBlocked: true,
        allowCandidateGeneration: false,
        reason:
          "Workspace already has an attached seeded KB; bootstrap synthesis is replaced by an explicit seeded handoff.",
        handoffMessage:
          "Attached seeded KB detected. Use existing KB context instead of generating bootstrap candidates.",
      };
  }
}

async function exists(
  context: OperationContext,
  target: string,
): Promise<boolean> {
  try {
    await context.fs?.stat(target);
    return true;
  } catch {
    return false;
  }
}

function coverageState(
  rows: readonly { readonly type: string; readonly count: number }[],
): ActivationState {
  const counts = Object.fromEntries(
    rows.map((row) => [row.type, Number(row.count)]),
  );
  const nonSymbols = [
    "req",
    "scenario",
    "test",
    "adr",
    "flag",
    "event",
    "fact",
  ].reduce((sum, type) => sum + Number(counts[type] ?? 0), 0);
  const supporting =
    Number(counts.scenario ?? 0) +
    Number(counts.test ?? 0) +
    Number(counts.adr ?? 0) +
    Number(counts.fact ?? 0);
  return Number(counts.req ?? 0) >= 1 && nonSymbols >= 5 && supporting >= 1
    ? "root_active_seeded"
    : "root_active_thin";
}

function sourceCoverageState(files: readonly string[]): ActivationState {
  const counts = {
    req: files.filter((file) => /^\.kb\/requirements\/.*\.md$/i.test(file)).length,
    scenario: files.filter((file) => /^\.kb\/scenarios\/.*\.md$/i.test(file)).length,
    test: files.filter((file) => /^\.kb\/tests\/.*\.md$/i.test(file)).length,
    adr: files.filter((file) => /^\.kb\/adrs?\/.*\.md$/i.test(file)).length,
    flag: files.filter((file) => /^\.kb\/flags\/.*\.md$/i.test(file)).length,
    event: files.filter((file) => /^\.kb\/events\/.*\.md$/i.test(file)).length,
    fact: files.filter((file) => /^\.kb\/facts\/.*\.md$/i.test(file)).length,
  };
  return coverageState(
    Object.entries(counts).map(([type, count]) => ({ type, count })),
  );
}

// implements REQ-KIBI-BOOTSTRAP-PLAN
export async function classifyActivation(
  context: OperationContext,
  files: readonly string[],
): Promise<ActivationPolicy> {
  // Discovery callers do not all use the same path base.  The CLI globber
  // returns workspace-relative paths, while host adapters may pass absolute
  // paths.  Normalize before source-lane classification so a seeded source
  // KB has the same posture on every peer surface.
  const normalizedFiles = files.map((file) => {
    const relative = path.isAbsolute(file)
      ? path.relative(context.workspaceRoot, file)
      : file;
    return relative.replaceAll("\\", "/");
  });
  const manifestStatus = readKbManifestStatus(context.workspaceRoot);
  if (manifestStatus.state === "missing") {
    const vendored = normalizedFiles.some((file) => file.startsWith("kibi/"));
    const projectSignalFromFiles = normalizedFiles.some(
      (file) =>
        !file.startsWith("kibi/") &&
        /^(README\.md|package\.json|src\/|app\/|packages\/|tests\/)/.test(file),
    );
    const projectSignalFromDirectories = await Promise.all(
      ["README.md", "package.json", "src", "app", "packages", "tests"].map(
        (target) => exists(context, path.resolve(context.workspaceRoot, target)),
      ),
    );
    const projectSignal = projectSignalFromFiles || projectSignalFromDirectories.some(Boolean);
    return activationFor(
      vendored && !projectSignal ? "vendored_only" : "root_uninitialized",
    );
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
    return activationFor(
      normalizedFiles.some((file) => file.startsWith(".kb/"))
        ? sourceCoverageState(normalizedFiles)
        : "root_active_thin",
    );
  try {
    const result = await context.prolog.query(
      "discovery:coverage_report_json(type, [], true, false, 100, 0, JsonString)",
    );
    const parsed: unknown = JSON.parse(
      result.bindings.JsonString ?? '{"rows":[]}',
    );
    const rows =
      parsed !== null &&
      typeof parsed === "object" &&
      "rows" in parsed &&
      Array.isArray(parsed.rows)
        ? parsed.rows.flatMap((row) =>
            row !== null &&
            typeof row === "object" &&
            "type" in row &&
            "count" in row &&
            typeof row.type === "string" &&
            typeof row.count === "number"
              ? [{ type: row.type, count: row.count }]
              : [],
          )
        : [];
    return activationFor(coverageState(rows));
  } catch {
    return activationFor("root_active_thin");
  }
}

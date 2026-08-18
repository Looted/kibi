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
        applyBlocked: false,
        allowCandidateGeneration: true,
        reason:
          "Workspace has no attached root KB yet; run a cold-start bootstrap scan across repository evidence.",
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
        activationMode: "attached_thin_handoff",
        applyBlocked: true,
        allowCandidateGeneration: false,
        reason:
          "Workspace already has an attached but thin KB; bootstrap synthesis is replaced by an explicit thin handoff.",
        handoffMessage:
          "Attached thin KB detected. Review sparse KB coverage and continue with a handoff.",
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

export async function classifyActivation(
  context: OperationContext,
  files: readonly string[],
): Promise<ActivationPolicy> {
  const manifestStatus = readKbManifestStatus(context.workspaceRoot);
  if (manifestStatus.state === "missing") {
    const vendored = files.some((file) => file.startsWith("kibi/"));
    const projectSignal = files.some(
      (file) =>
        !file.startsWith("kibi/") &&
        /^(README\.md|package\.json|src\/|app\/|packages\/|tests\/)/.test(file),
    );
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
  if (!context.prolog) return activationFor("root_active_thin");
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

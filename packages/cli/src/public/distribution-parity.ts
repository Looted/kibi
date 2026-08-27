/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
*/

import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

export const DISTRIBUTION_PARITY_VERSION =
  "kibi.distribution-parity.v1" as const;

export const REQUIREMENT_COMPILER_CAPABILITIES = [
  "semantic_inventory",
  "contradiction_witnesses",
  "conservative_proof",
  "repair_plan",
  "verification_receipts",
  "verification_contract",
  "telemetry_acceptance",
] as const;

export type RequirementCompilerCapability =
  (typeof REQUIREMENT_COMPILER_CAPABILITIES)[number];
export type DistributionRuntimeKind =
  | "source_checkout"
  | "packed_artifact"
  | "project_resolved";
export type DistributionSurface = "cli" | "mcp";
export type CapabilityState = "supported" | "unsupported" | "failed";

export interface DistributionRuntimeProvenance {
  readonly status: "resolved" | "unresolved";
  readonly executable: string;
  readonly entrypoint?: string;
  readonly packageRoot?: string;
  readonly version?: string;
  readonly evidence: "executable_resolution" | "entrypoint_resolution";
  readonly detail?: string;
}

export interface DistributionRuntime {
  readonly id: string;
  readonly kind: DistributionRuntimeKind;
  readonly surface: DistributionSurface;
  readonly project?: string;
  readonly provenance: DistributionRuntimeProvenance;
  readonly actions?: Partial<
    Record<RequirementCompilerCapability, DistributionParityAction>
  >;
}

export interface DistributionParityAction {
  readonly kind: "upgrade" | "compatibility";
  readonly detail: string;
}

export interface DistributionCapabilityResult {
  readonly state: CapabilityState;
  readonly outcome?: unknown;
  readonly diagnosticIds?: readonly string[];
  readonly detail?: string;
}

export interface DistributionRuntimeAdapter {
  readonly runtime: DistributionRuntime;
  readonly execute: (
    capability: RequirementCompilerCapability,
  ) => Promise<DistributionCapabilityResult>;
}

export interface DistributionParityObservation
  extends DistributionCapabilityResult {
  readonly runtimeId: string;
  readonly capability: RequirementCompilerCapability;
}

export type DistributionComparison =
  | "match"
  | "diverged"
  | "unsupported"
  | "failed"
  | "not_compared";

export interface DistributionParityRow {
  readonly runtimeId: string;
  readonly kind: DistributionRuntimeKind;
  readonly surface: DistributionSurface;
  readonly project?: string;
  readonly capability: RequirementCompilerCapability;
  readonly state: CapabilityState | "missing";
  readonly comparison: DistributionComparison;
  readonly referenceRuntimeId?: string;
  readonly normalizedOutcome?: unknown;
  readonly diagnosticIds: readonly string[];
  readonly action?: DistributionParityAction;
  readonly detail?: string;
}

export type DistributionParityIssueCode =
  | "duplicate_runtime_id"
  | "missing_current_runtime"
  | "unresolved_runtime_provenance"
  | "missing_capability_observation"
  | "duplicate_capability_observation"
  | "current_capability_unsupported"
  | "capability_execution_failed"
  | "source_packed_mismatch"
  | "project_divergence_without_action";

export interface DistributionParityIssue {
  readonly code: DistributionParityIssueCode;
  readonly runtimeId?: string;
  readonly surface?: DistributionSurface;
  readonly capability?: RequirementCompilerCapability;
  readonly detail: string;
}

export interface DistributionParityReport {
  readonly version: typeof DISTRIBUTION_PARITY_VERSION;
  readonly status: "passed" | "failed";
  readonly capabilities: readonly RequirementCompilerCapability[];
  readonly runtimes: readonly DistributionRuntime[];
  readonly rows: readonly DistributionParityRow[];
  readonly issues: readonly DistributionParityIssue[];
  readonly summary: {
    readonly runtimeCount: number;
    readonly observationCount: number;
    readonly matchCount: number;
    readonly divergenceCount: number;
    readonly unsupportedCount: number;
    readonly failedCount: number;
    readonly actionCount: number;
  };
}

export interface DistributionParityOptions {
  readonly workspaceRoots?: readonly string[];
  readonly volatileKeys?: ReadonlySet<string>;
}

const DEFAULT_VOLATILE_KEYS = new Set([
  "_diagnostic_telemetry",
  "active_branch",
  "artifact_digest",
  "branch",
  "branchName",
  "code_snapshot",
  "created_at",
  "createdAt",
  "elapsedMs",
  "environment_hash",
  "finished_at",
  "finishedAt",
  "pid",
  "planId",
  "prologPid",
  "receipt_id",
  "request_id",
  "requestId",
  "snapshot_id",
  "snapshotId",
  "started_at",
  "startedAt",
  "timestamp",
  "updated_at",
  "updatedAt",
  "usageLogLineNumber",
  "verificationSnapshot",
]);

type PackageManifest = {
  readonly name?: string;
  readonly version?: string;
};

function nearestPackageInfo(entrypoint: string): {
  readonly packageRoot?: string;
  readonly version?: string;
} {
  let current = path.dirname(entrypoint);
  while (true) {
    const manifestPath = path.join(current, "package.json");
    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(
          readFileSync(manifestPath, "utf8"),
        ) as PackageManifest;
        return {
          packageRoot: current,
          ...(manifest.version === undefined
            ? {}
            : { version: manifest.version }),
        };
      } catch {
        return { packageRoot: current };
      }
    }
    const parent = path.dirname(current);
    if (parent === current) return {};
    current = parent;
  }
}

function declaredEntrypoint(contents: string): string | undefined {
  const shimTarget = contents.match(/^# cmd-shim-target=(.+)$/m)?.[1]?.trim();
  if (shimTarget) return shimTarget;
  const absoluteImport = contents.match(/\bfrom\s+["'](\/(?:[^"']+))["']/)?.[1];
  return absoluteImport;
}

// implements REQ-kibi-distribution-parity-matrix
export function resolveDistributionRuntimeProvenance(
  executable: string,
): DistributionRuntimeProvenance {
  const requested = path.resolve(executable);
  if (!existsSync(requested)) {
    return {
      status: "unresolved",
      executable: requested,
      evidence: "executable_resolution",
      detail: `Executable does not exist: ${requested}`,
    };
  }
  try {
    const resolvedExecutable = realpathSync(requested);
    const contents = readFileSync(resolvedExecutable, "utf8");
    const declared = declaredEntrypoint(contents);
    const entrypoint = declared
      ? realpathSync(path.resolve(path.dirname(resolvedExecutable), declared))
      : resolvedExecutable;
    const packageInfo = nearestPackageInfo(entrypoint);
    return {
      status: "resolved",
      executable: resolvedExecutable,
      entrypoint,
      ...packageInfo,
      evidence:
        entrypoint === resolvedExecutable
          ? "executable_resolution"
          : "entrypoint_resolution",
    };
  } catch (error) {
    return {
      status: "unresolved",
      executable: requested,
      evidence: "executable_resolution",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function normalizeString(value: string, roots: readonly string[]): string {
  let normalized = value;
  for (const root of [...roots].sort(
    (left, right) => right.length - left.length,
  )) {
    normalized = normalized.replaceAll(root, "<workspace>");
  }
  return normalized
    .replaceAll(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi,
      "<uuid>",
    )
    .replaceAll(
      /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/g,
      "<timestamp>",
    );
}

// implements REQ-kibi-distribution-parity-matrix
export function normalizeDistributionParityValue(
  value: unknown,
  options: DistributionParityOptions = {},
): unknown {
  if (typeof value === "string") {
    return normalizeString(value, options.workspaceRoots ?? []);
  }
  if (Array.isArray(value)) {
    return value.map((entry) =>
      normalizeDistributionParityValue(entry, options),
    );
  }
  if (value === null || typeof value !== "object") {
    return value;
  }

  const volatileKeys = options.volatileKeys ?? DEFAULT_VOLATILE_KEYS;
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    if (volatileKeys.has(key)) continue;
    normalized[key] = normalizeDistributionParityValue(
      (value as Record<string, unknown>)[key],
      options,
    );
  }
  return normalized;
}

function semanticFingerprint(value: unknown): string {
  return JSON.stringify(value);
}

function sortedUnique(values: readonly string[] | undefined): string[] {
  return [...new Set(values ?? [])].sort((left, right) =>
    left.localeCompare(right),
  );
}

function currentRuntime(
  runtimes: readonly DistributionRuntime[],
  kind: "source_checkout" | "packed_artifact",
  surface: DistributionSurface,
): DistributionRuntime | undefined {
  return runtimes.find(
    (runtime) => runtime.kind === kind && runtime.surface === surface,
  );
}

function observationKey(
  runtimeId: string,
  capability: RequirementCompilerCapability,
): string {
  return `${runtimeId}\0${capability}`;
}

function compareObservation(
  observation: DistributionParityObservation,
  reference: DistributionParityObservation | undefined,
  normalized: unknown,
  normalizedReference: unknown,
): DistributionComparison {
  if (observation.state === "failed") return "failed";
  if (observation.state === "unsupported") return "unsupported";
  if (!reference || reference.state !== "supported") return "not_compared";
  return semanticFingerprint(normalized) ===
    semanticFingerprint(normalizedReference)
    ? "match"
    : "diverged";
}

// implements REQ-kibi-distribution-parity-matrix
export function buildDistributionParityReport(
  runtimes: readonly DistributionRuntime[],
  observations: readonly DistributionParityObservation[],
  options: DistributionParityOptions = {},
): DistributionParityReport {
  const issues: DistributionParityIssue[] = [];
  const runtimeIds = new Set<string>();
  for (const runtime of runtimes) {
    if (runtimeIds.has(runtime.id)) {
      issues.push({
        code: "duplicate_runtime_id",
        runtimeId: runtime.id,
        surface: runtime.surface,
        detail: `Runtime id ${runtime.id} is declared more than once.`,
      });
    }
    runtimeIds.add(runtime.id);
    if (runtime.provenance.status === "unresolved") {
      issues.push({
        code: "unresolved_runtime_provenance",
        runtimeId: runtime.id,
        surface: runtime.surface,
        detail:
          runtime.provenance.detail ??
          `Runtime ${runtime.id} has no executable resolution evidence.`,
      });
    }
  }

  for (const surface of ["cli", "mcp"] as const) {
    for (const kind of ["source_checkout", "packed_artifact"] as const) {
      if (!currentRuntime(runtimes, kind, surface)) {
        issues.push({
          code: "missing_current_runtime",
          surface,
          detail: `Missing ${kind} runtime for ${surface}.`,
        });
      }
    }
  }

  const indexed = new Map<string, DistributionParityObservation>();
  for (const observation of observations) {
    const key = observationKey(observation.runtimeId, observation.capability);
    if (indexed.has(key)) {
      issues.push({
        code: "duplicate_capability_observation",
        runtimeId: observation.runtimeId,
        capability: observation.capability,
        detail: `Capability ${observation.capability} was observed more than once for ${observation.runtimeId}.`,
      });
      continue;
    }
    indexed.set(key, observation);
  }

  const rows: DistributionParityRow[] = [];
  for (const runtime of [...runtimes].sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    const source = currentRuntime(runtimes, "source_checkout", runtime.surface);
    for (const capability of REQUIREMENT_COMPILER_CAPABILITIES) {
      const observation = indexed.get(observationKey(runtime.id, capability));
      const reference = source
        ? indexed.get(observationKey(source.id, capability))
        : undefined;
      const action = runtime.actions?.[capability];
      if (!observation) {
        issues.push({
          code: "missing_capability_observation",
          runtimeId: runtime.id,
          surface: runtime.surface,
          capability,
          detail: `Runtime ${runtime.id} has no ${capability} observation.`,
        });
        rows.push({
          runtimeId: runtime.id,
          kind: runtime.kind,
          surface: runtime.surface,
          ...(runtime.project === undefined
            ? {}
            : { project: runtime.project }),
          capability,
          state: "missing",
          comparison: "not_compared",
          ...(source === undefined ? {} : { referenceRuntimeId: source.id }),
          diagnosticIds: [],
          ...(action === undefined ? {} : { action }),
        });
        continue;
      }

      const normalized = normalizeDistributionParityValue(
        observation.outcome,
        options,
      );
      const normalizedReference = normalizeDistributionParityValue(
        reference?.outcome,
        options,
      );
      const comparison =
        runtime.kind === "source_checkout"
          ? observation.state === "supported"
            ? "match"
            : observation.state
          : compareObservation(
              observation,
              reference,
              normalized,
              normalizedReference,
            );

      if (
        runtime.kind !== "project_resolved" &&
        observation.state === "unsupported"
      ) {
        issues.push({
          code: "current_capability_unsupported",
          runtimeId: runtime.id,
          surface: runtime.surface,
          capability,
          detail: `Current ${runtime.kind} runtime does not support ${capability}.`,
        });
      }
      if (observation.state === "failed") {
        issues.push({
          code: "capability_execution_failed",
          runtimeId: runtime.id,
          surface: runtime.surface,
          capability,
          detail:
            observation.detail ??
            `Runtime ${runtime.id} failed while executing ${capability}.`,
        });
      }
      if (runtime.kind === "packed_artifact" && comparison === "diverged") {
        issues.push({
          code: "source_packed_mismatch",
          runtimeId: runtime.id,
          surface: runtime.surface,
          capability,
          detail: `Packed ${runtime.surface} outcome diverges from source for ${capability}.`,
        });
      }
      if (
        runtime.kind === "project_resolved" &&
        (comparison === "diverged" || comparison === "unsupported") &&
        !action
      ) {
        issues.push({
          code: "project_divergence_without_action",
          runtimeId: runtime.id,
          surface: runtime.surface,
          capability,
          detail: `Project runtime ${runtime.id} needs an upgrade or compatibility action for ${capability}.`,
        });
      }

      rows.push({
        runtimeId: runtime.id,
        kind: runtime.kind,
        surface: runtime.surface,
        ...(runtime.project === undefined ? {} : { project: runtime.project }),
        capability,
        state: observation.state,
        comparison,
        ...(runtime.kind === "source_checkout" || source === undefined
          ? {}
          : { referenceRuntimeId: source.id }),
        ...(observation.state === "supported"
          ? { normalizedOutcome: normalized }
          : {}),
        diagnosticIds: sortedUnique(observation.diagnosticIds),
        ...(action === undefined ? {} : { action }),
        ...(observation.detail === undefined
          ? {}
          : { detail: observation.detail }),
      });
    }
  }

  return {
    version: DISTRIBUTION_PARITY_VERSION,
    status: issues.length === 0 ? "passed" : "failed",
    capabilities: REQUIREMENT_COMPILER_CAPABILITIES,
    runtimes: [...runtimes].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
    rows,
    issues,
    summary: {
      runtimeCount: runtimes.length,
      observationCount: observations.length,
      matchCount: rows.filter((row) => row.comparison === "match").length,
      divergenceCount: rows.filter((row) => row.comparison === "diverged")
        .length,
      unsupportedCount: rows.filter((row) => row.state === "unsupported")
        .length,
      failedCount: rows.filter((row) => row.state === "failed").length,
      actionCount: rows.filter((row) => row.action !== undefined).length,
    },
  };
}

// implements REQ-kibi-distribution-parity-matrix
export async function runDistributionParityMatrix(
  adapters: readonly DistributionRuntimeAdapter[],
  options: DistributionParityOptions = {},
): Promise<DistributionParityReport> {
  const observations: DistributionParityObservation[] = [];
  for (const adapter of adapters) {
    for (const capability of REQUIREMENT_COMPILER_CAPABILITIES) {
      try {
        const result = await adapter.execute(capability);
        observations.push({
          runtimeId: adapter.runtime.id,
          capability,
          ...result,
        });
      } catch (error) {
        observations.push({
          runtimeId: adapter.runtime.id,
          capability,
          state: "failed",
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
  return buildDistributionParityReport(
    adapters.map((adapter) => adapter.runtime),
    observations,
    options,
  );
}

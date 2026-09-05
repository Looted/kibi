import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { ProofIntegrationExecution } from "../public/proof-fingerprint.js";
import { PROOF_INTEGRATION_VERSION } from "../public/proof-protocol.js";

/** Tracked, Kibi-managed proof integration configuration. */
export const PROOF_INTEGRATIONS_PATH = ".kb/proof/integrations.json";

/** Derived runtime artifacts of proof runs; never tracked knowledge. */
export const PROOF_RUNS_DIR = ".kb/proof/runs";

export const PRODUCER_KINDS = [
  "command",
  "playwright",
  "junit",
  "tap",
] as const;

export type ProducerKind = (typeof PRODUCER_KINDS)[number];

export type ProofIntegration = Readonly<{
  id: string;
  producer: string;
  producer_version?: string;
  command: readonly string[];
  artifact?: string;
  targets?: readonly string[];
  options?: Record<string, unknown>;
  description?: string;
}>;

export type ProofIntegrationsFile = Readonly<{
  version: typeof PROOF_INTEGRATION_VERSION;
  integrations: readonly ProofIntegration[];
}>;

export type LoadedProofIntegrations =
  | { available: true; integrations: ProofIntegrationsFile }
  | { available: false; error: string };

export function integrationsPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, PROOF_INTEGRATIONS_PATH);
}

export function proofIntegrationErrors(value: unknown): string[] {
  const file = record(value);
  if (!file)
    return [
      `${PROOF_INTEGRATIONS_PATH} must be an object with version and integrations`,
    ];
  const errors: string[] = [];
  if (file.version !== PROOF_INTEGRATION_VERSION)
    errors.push(
      `version must be ${PROOF_INTEGRATION_VERSION}; received ${JSON.stringify(file.version ?? null)}`,
    );
  if (!Array.isArray(file.integrations) || file.integrations.length === 0) {
    errors.push("integrations must be a non-empty array");
    return errors;
  }
  const seen = new Set<string>();
  file.integrations.forEach((entry, index) => {
    const row = record(entry);
    const label = `integrations[${index}]`;
    if (!row) {
      errors.push(`${label} must be an object`);
      return;
    }
    if (!nonEmpty(row.id))
      errors.push(`${label}.id must be a non-empty string`);
    else {
      if (seen.has(String(row.id)))
        errors.push(`${label}.id duplicates '${String(row.id)}'`);
      seen.add(String(row.id));
    }
    if (!nonEmpty(row.producer))
      errors.push(
        `${label}.producer must be one of: ${PRODUCER_KINDS.join(", ")} (or a custom producer id)`,
      );
    if (
      !Array.isArray(row.command) ||
      row.command.length === 0 ||
      !row.command.every((argument) => nonEmpty(argument))
    )
      errors.push(`${label}.command must be a non-empty argv array`);
    if (
      nonEmpty(row.producer) &&
      (row.producer === "junit" || row.producer === "tap") &&
      !nonEmpty(row.artifact)
    )
      errors.push(
        `${label}.artifact is required for producer '${String(row.producer)}' (path of the native report to convert)`,
      );
    if (row.targets !== undefined) {
      if (
        !Array.isArray(row.targets) ||
        row.targets.length === 0 ||
        !row.targets.every((target) => nonEmpty(target))
      )
        errors.push(
          `${label}.targets must be a non-empty array of target names`,
        );
    }
    if (row.options !== undefined && !record(row.options))
      errors.push(`${label}.options must be an object when present`);
    if (row.description !== undefined && !nonEmpty(row.description))
      errors.push(
        `${label}.description must be a non-empty string when present`,
      );
  });
  return errors;
}

export function loadProofIntegrations(
  workspaceRoot: string,
): LoadedProofIntegrations {
  const filePath = integrationsPath(workspaceRoot);
  if (!existsSync(filePath)) {
    return {
      available: false,
      error: `No proof integration configuration at ${PROOF_INTEGRATIONS_PATH}. Run bootstrap for this repository to configure proof producers.`,
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    return {
      available: false,
      error: `${PROOF_INTEGRATIONS_PATH} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  const errors = proofIntegrationErrors(parsed);
  if (errors.length > 0)
    return {
      available: false,
      error: `Invalid ${PROOF_INTEGRATIONS_PATH}: ${errors.join("; ")}`,
    };
  return { available: true, integrations: parsed as ProofIntegrationsFile };
}

export function resolveIntegration(
  integrations: ProofIntegrationsFile,
  id: string,
): ProofIntegration | null {
  return integrations.integrations.find((entry) => entry.id === id) ?? null;
}

export function toExecution(
  integration: ProofIntegration,
): ProofIntegrationExecution {
  return {
    id: integration.id,
    producer: integration.producer,
    ...(integration.producer_version !== undefined
      ? { producer_version: integration.producer_version }
      : {}),
    command: integration.command,
    ...(integration.artifact !== undefined
      ? { artifact: integration.artifact }
      : {}),
    ...(integration.targets !== undefined
      ? { targets: integration.targets }
      : {}),
    ...(integration.options !== undefined
      ? { options: integration.options }
      : {}),
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmpty(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

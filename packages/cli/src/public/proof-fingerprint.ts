import { createHash } from "node:crypto";

import type {
  ProofBinding,
  ProofContract,
  ProofEnvironment,
} from "./proof-protocol.js";

/** Cosmetic integration-config keys that never participate in proof identity. */
const COSMETIC_KEYS = new Set([
  "description",
  "label",
  "labels",
  "comment",
  "comments",
  "displayName",
  "display_name",
  "docs",
  "notes",
]);

export function stripCosmetic(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripCosmetic);
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      if (COSMETIC_KEYS.has(key)) continue;
      result[key] = stripCosmetic(source[key]);
    }
    return result;
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  if (value === undefined) return "null";
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function jsonDigest(value: unknown): string {
  return sha256(canonicalJson(value));
}

/** Kibi canonicalizes the typed environment and derives the environment hash itself. */
export function environmentHash(environment: ProofEnvironment): string {
  return jsonDigest(stripCosmetic(environment));
}

export function proofContractHash(contract: ProofContract): string {
  return jsonDigest(contract);
}

export type ProofIntegrationExecution = Readonly<{
  id: string;
  producer: string;
  producer_version?: string;
  command: readonly string[];
  artifact?: string;
  targets?: readonly string[];
  options?: Record<string, unknown>;
}>;

export type ProofFingerprintComponents = Readonly<{
  contract: string;
  integration: string;
  command: string;
  bindings: string;
  producer: string;
}>;

export type ProofFingerprint = Readonly<{
  fingerprint: string;
  components: ProofFingerprintComponents;
}>;

function integrationExecutionProjection(
  integration: ProofIntegrationExecution,
): Record<string, unknown> {
  return {
    id: integration.id,
    producer: integration.producer,
    ...(integration.producer_version !== undefined
      ? { producer_version: integration.producer_version }
      : {}),
    command: [...integration.command],
    ...(integration.artifact !== undefined
      ? { artifact: integration.artifact }
      : {}),
    ...(integration.targets !== undefined
      ? { targets: [...integration.targets] }
      : {}),
    ...(integration.options !== undefined
      ? { options: stripCosmetic(integration.options) }
      : {}),
  };
}

function normalizedBindings(
  bindings: readonly ProofBinding[],
): readonly ProofBinding[] {
  return [...bindings]
    .map((binding) => ({
      symbol_id: binding.symbol_id,
      target: binding.target,
      ...(binding.native_id !== undefined
        ? { native_id: binding.native_id }
        : {}),
      ...(binding.aliases !== undefined
        ? { aliases: [...binding.aliases] }
        : {}),
      ...(binding.source_file !== undefined
        ? { source_file: binding.source_file }
        : {}),
      ...(binding.line !== undefined ? { line: binding.line } : {}),
    }))
    .sort((left, right) =>
      `${left.target}\0${left.symbol_id}`.localeCompare(
        `${right.target}\0${right.symbol_id}`,
      ),
    );
}

/**
 * The effective proof fingerprint binds a receipt to everything that changes
 * what executes or how evidence maps to obligations: the semantic contract,
 * the integration's execution semantics, the exact command, and the bindings.
 * Cosmetic metadata is excluded, so editing a description never stales proof.
 */
export function effectiveProofFingerprint(input: {
  contract: ProofContract;
  integration: ProofIntegrationExecution;
  bindings: readonly ProofBinding[];
}): ProofFingerprint {
  const integrationProjection = integrationExecutionProjection(
    input.integration,
  );
  const components: ProofFingerprintComponents = {
    contract: proofContractHash(input.contract),
    integration: jsonDigest(integrationProjection),
    command: jsonDigest([...input.integration.command]),
    bindings: jsonDigest(normalizedBindings(input.bindings)),
    producer: jsonDigest({
      producer: input.integration.producer,
      ...(input.integration.producer_version !== undefined
        ? { version: input.integration.producer_version }
        : {}),
    }),
  };
  return { fingerprint: jsonDigest(components), components };
}

export const FINGERPRINT_COMPONENT_NAMES = [
  "contract",
  "integration",
  "command",
  "bindings",
  "producer",
] as const;

/** Names the fingerprint components that drifted between two executions. */
export function fingerprintDrift(
  previous: ProofFingerprintComponents,
  current: ProofFingerprintComponents,
): string[] {
  return FINGERPRINT_COMPONENT_NAMES.filter(
    (name) => previous[name] !== current[name],
  );
}

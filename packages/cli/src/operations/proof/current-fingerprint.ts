import type { ProofIntegrationsFile } from "../../proof/integrations.js";
import { resolveIntegration, toExecution } from "../../proof/integrations.js";
import {
  type ProofFingerprintComponents,
  effectiveProofFingerprint,
} from "../../public/proof-fingerprint.js";
import {
  PROOF_CONTRACT_VERSION,
  type ProofBinding,
  type ProofContract,
  optionalProofContractFields,
  proofBindingsErrors,
} from "../../public/proof-protocol.js";

function record(value: unknown): Record<string, unknown> | null {
  // typeof null is "object", so null comes back as itself.
  return typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown> | null)
    : null;
}

export function parseContract(test: Record<string, unknown>): ProofContract {
  const contract = record(test.proof_contract);
  const candidate: Record<string, unknown> = contract ?? {};
  const { version, integration, required_proofs, success_policy } =
    candidate as Record<string, unknown>;
  const normalized: ProofContract = {
    version: version as ProofContract["version"],
    integration: String(integration ?? ""),
    required_proofs: Array.isArray(required_proofs)
      ? (required_proofs.map((entry) => {
          const row = record(entry);
          return {
            symbol_id: String(row?.symbol_id ?? ""),
            target: String(row?.target ?? ""),
          };
        }) as ProofContract["required_proofs"])
      : [],
    success_policy: success_policy as ProofContract["success_policy"],
    ...optionalProofContractFields(candidate),
  };
  if (!contract || contract.version !== PROOF_CONTRACT_VERSION)
    throw new Error(
      `Proof ingest failed: test ${String(test.id)} has no proof_contract (${PROOF_CONTRACT_VERSION})`,
    );
  return normalized;
}

export function parseBindings(test: Record<string, unknown>): ProofBinding[] {
  const raw = test.proof_bindings;
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw))
    throw new Error(
      `Proof ingest failed: test ${String(test.id)} proof_bindings must be an array`,
    );
  const errors = proofBindingsErrors(raw);
  if (errors.length > 0)
    throw new Error(
      `Proof ingest failed: test ${String(test.id)} ${errors.join("; ")}`,
    );
  // proofBindingsErrors accepted every row: an object with non-empty
  // symbol_id and target strings.
  return raw.map((entry) => {
    const row = entry as Record<string, unknown>;
    return {
      symbol_id: String(row.symbol_id),
      target: String(row.target),
      ...(row.native_id !== undefined
        ? { native_id: String(row.native_id) }
        : {}),
      ...(row.aliases !== undefined
        ? { aliases: (row.aliases as unknown[]).map(String) }
        : {}),
      ...(row.source_file !== undefined
        ? { source_file: String(row.source_file) }
        : {}),
      ...(row.line !== undefined ? { line: Number(row.line) } : {}),
    };
  });
}

/**
 * The effective fingerprint components a test would be proven under now, built
 * the way ingest builds them. A test whose contract, bindings or integration
 * cannot be resolved has no current fingerprint (other rules report those).
 */
export function currentFingerprintComponents(
  test: Readonly<Record<string, unknown>>,
  integrations: ProofIntegrationsFile,
): ProofFingerprintComponents | undefined {
  try {
    const contract = parseContract(test as Record<string, unknown>);
    const integration = resolveIntegration(
      integrations,
      contract.integration,
    );
    if (integration === null) return undefined;
    return effectiveProofFingerprint({
      contract,
      integration: toExecution(integration),
      bindings: parseBindings(test as Record<string, unknown>),
    }).components;
  } catch {
    return undefined;
  }
}

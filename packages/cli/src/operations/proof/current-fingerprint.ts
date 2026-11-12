import type { ProofIntegrationsFile } from "../../proof/integrations.js";
import { resolveIntegration, toExecution } from "../../proof/integrations.js";
import {
  type ProofFingerprintComponents,
  effectiveProofFingerprint,
} from "../../public/proof-fingerprint.js";
import { parseBindings, parseContract } from "./ingest-proof.js";

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

import { describe, expect, test } from "bun:test";

import { currentFingerprintComponents } from "../../../src/operations/proof/current-fingerprint.js";
import type { ProofIntegrationsFile } from "../../../src/proof/integrations.js";

const integrations = (
  command: readonly string[] = ["bun", "test"],
  extra: Record<string, unknown> = {},
): ProofIntegrationsFile => ({
  version: "kibi.proof-integration.v1",
  integrations: [{ id: "bun", producer: "bun", command, ...extra }],
});

const test_ = (overrides: Record<string, unknown> = {}) => ({
  id: "T-1",
  proof_contract: {
    version: "kibi.proof-contract.v1",
    integration: "bun",
    required_proofs: [{ symbol_id: "SYM-a", target: "default" }],
    success_policy: "all_required_first_attempt",
  },
  proof_bindings: [{ symbol_id: "SYM-a", target: "default" }],
  ...overrides,
});

describe("currentFingerprintComponents", () => {
  test("changes exactly the components an edit touches", () => {
    const base = currentFingerprintComponents(test_(), integrations());
    expect(base).toBeDefined();
    const changedCommand = currentFingerprintComponents(
      test_(),
      integrations(["bun", "test", "--bail"]),
    );
    const differing = (other: typeof base) =>
      Object.keys(base ?? {}).filter(
        (name) =>
          (base as Record<string, string>)[name] !==
          (other as Record<string, string>)[name],
      );
    expect(differing(changedCommand)).toStrictEqual(["integration", "command"]);
    expect(
      differing(
        currentFingerprintComponents(
          test_(),
          integrations(["bun", "test"], { producer_version: "2" }),
        ),
      ),
    ).toStrictEqual(["integration", "producer"]);
    expect(
      currentFingerprintComponents(
        test_(),
        integrations(["bun", "test"], { description: "reworded" }),
      ),
    ).toStrictEqual(base);
  });

  test("has no fingerprint for an unresolvable test", () => {
    expect(
      currentFingerprintComponents(test_({ proof_contract: undefined }), integrations()),
    ).toBeUndefined();
    expect(
      currentFingerprintComponents(test_({ proof_bindings: "x" }), integrations()),
    ).toBeUndefined();
    expect(
      currentFingerprintComponents(test_(), {
        version: "kibi.proof-integration.v1",
        integrations: [],
      }),
    ).toBeUndefined();
  });
});

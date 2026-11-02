// implements REQ-kibi-multilingual-code-proofs
import { describe, expect, test } from "bun:test";
import {
  optionalProofContractFields,
  proofContractErrors,
} from "../../src/public/proof-protocol.js";

const contract = (extra: Record<string, unknown>) => ({
  version: "kibi.proof-contract.v1",
  integration: "self-proof",
  required_proofs: [{ symbol_id: "SYM-TEST", target: "default" }],
  success_policy: "all_required_first_attempt",
  ...extra,
});

const errors = (extra: Record<string, unknown>) =>
  proofContractErrors(contract(extra)).join("\n");

describe("SWI-Prolog argument references in proof contracts", () => {
  test("domain_source.arg applies only to an exhaustive proof", () => {
    expect(
      errors({
        kind: "typecheck",
        domain_source: { symbol_id: "SYM-D", arg: 1 },
        witness: { path: "test/witness.ts" },
      }),
    ).toContain(
      "proof_contract.domain_source.arg applies only to kind exhaustive, not typecheck",
    );
  });

  test("a value_source symbol may name an argument and a measure", () => {
    expect(
      proofContractErrors(
        contract({
          kind: "arithmetic",
          value_source: [{ symbol_id: "SYM-LIMIT", arg: 1, measure: "count" }],
        }),
      ),
    ).not.toContainEqual(expect.stringContaining("value_source"));
    expect(
      errors({
        kind: "arithmetic",
        value_source: [{ symbol_id: "SYM-LIMIT", arg: 1, other: true }],
      }),
    ).toContain("proof_contract.value_source must be");
  });

  test("a value_source source takes no symbol fields", () => {
    expect(
      errors({
        kind: "arithmetic",
        value_source: [
          {
            source: { reader: "json", file: "package.json", select: "keys" },
            arg: 1,
          },
        ],
      }),
    ).toContain(
      "proof_contract.value_source[0] names a source, so it takes no symbol_id, export or arg",
    );
  });

  test("domains, initial_source and pattern_source must be references", () => {
    expect(errors({ kind: "rule", domains: { t: { arg: 1 } } })).toContain(
      "proof_contract.domains must map each argument type",
    );
    expect(
      errors({ kind: "state_machine", initial_source: { arg: 1 } }),
    ).toContain(
      "proof_contract.initial_source must be {symbol_id, export?, arg?}",
    );
    expect(errors({ kind: "regex", pattern_source: "SYM-P" })).toContain(
      "proof_contract.pattern_source must be {symbol_id, export?, arg?}",
    );
  });

  test("the copied contract fields keep each argument", () => {
    const fields = optionalProofContractFields({
      kind: "state_machine",
      value_source: [
        { symbol_id: "SYM-LIMIT", export: "limit/1", arg: 1, measure: "value" },
      ],
      initial_source: { symbol_id: "SYM-INITIAL", export: "initial/1", arg: 1 },
      pattern_source: { symbol_id: "SYM-PATTERN", arg: 2 },
    });
    expect(fields.value_source).toEqual([
      { symbol_id: "SYM-LIMIT", export: "limit/1", arg: 1, measure: "value" },
    ]);
    expect(fields.initial_source).toEqual({
      symbol_id: "SYM-INITIAL",
      export: "initial/1",
      arg: 1,
    });
    expect(fields.pattern_source).toEqual({ symbol_id: "SYM-PATTERN", arg: 2 });
  });
});

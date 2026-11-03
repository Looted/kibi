import { describe, expect, test } from "bun:test";
import {
  PROOF_CONTRACT_VERSION,
  PROOF_RUN_VERSION,
  isCertificateProofKind,
  optionalProofContractFields,
  proofContractErrors,
  proofRunArtifactErrors,
} from "../../src/public/proof-protocol.js";

const base = {
  version: PROOF_CONTRACT_VERSION,
  integration: "bun",
  required_proofs: [{ symbol_id: "SYM-a", target: "t" }],
  success_policy: "all_required_first_attempt",
};

function kindErrors(extra: Record<string, unknown>): string[] {
  return proofContractErrors({ ...base, ...extra });
}

const artifact = {
  version: PROOF_RUN_VERSION,
  producer: { name: "kibi", version: "1" },
  command_argv: ["bun", "test"],
  code_snapshot: "a".repeat(64),
  environment: {},
  run: {
    outcome: "passed",
    exit_code: 0,
    started_at: "2026-01-01T00:00:00Z",
    finished_at: "2026-01-01T00:00:01Z",
  },
  proof_results: [
    {
      symbol_id: "SYM-a",
      target: "t",
      outcome: "passed",
      binding: "native_case",
      attempts: { status: "unavailable" },
    },
  ],
};

describe("isCertificateProofKind", () => {
  test("names the certificate kinds", () => {
    expect(isCertificateProofKind("exhaustive")).toBe(true);
    expect(isCertificateProofKind("e2e")).toBe(false);
  });
});

describe("proofRunArtifactErrors certificates", () => {
  test("the base artifact is valid", () => {
    expect(proofRunArtifactErrors(artifact)).toStrictEqual([]);
  });

  test("certificates must be an array of certificate objects", () => {
    expect(
      proofRunArtifactErrors({ ...artifact, certificates: {} }),
    ).toStrictEqual(["artifact.certificates must be an array when present"]);
    const message = (index: number) =>
      `artifact.certificates[${index}] must be a JSON object with version, a certificate kind (exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex, source) and test_id`;
    expect(
      proofRunArtifactErrors({
        ...artifact,
        certificates: [
          { version: "v", kind: "regex", test_id: "x" },
          null,
          { version: "", kind: "regex", test_id: "x" },
          { version: "v", kind: "e2e", test_id: "x" },
          { version: "v", kind: "regex", test_id: "" },
          { version: "v", kind: "regex", test_id: "x", bad: () => 1 },
        ],
      }),
    ).toStrictEqual([1, 2, 3, 4, 5].map(message));
  });
});

describe("proofContractErrors kind fields", () => {
  test("an unknown kind", () => {
    expect(kindErrors({ kind: "magic" })).toStrictEqual([
      'proof_contract.kind must be one of: e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex, source; received "magic"',
    ]);
  });

  test("exhaustive and typecheck need a domain source and a witness", () => {
    expect(kindErrors({ kind: "exhaustive" })).toStrictEqual([
      "proof_contract.domain_source is required for kind exhaustive: name the symbol the proof reads its domain from",
    ]);
    expect(kindErrors({ kind: "typecheck" })).toStrictEqual([
      "proof_contract.domain_source is required for kind typecheck: name the symbol the proof reads its domain from",
      "proof_contract.witness is required for kind typecheck: name the file the type checker compiles",
    ]);
    expect(
      kindErrors({
        kind: "typecheck",
        domain_source: { symbol_id: "SYM-d" },
        witness: { path: "w.ts", extra: 1 },
      }),
    ).toStrictEqual([
      "proof_contract.witness must be {path} naming the repository-relative witness file",
    ]);
  });

  test("constraint_source must list fact ids", () => {
    const message =
      "proof_contract.constraint_source must be {fact_ids: [FACT-...]} naming the facts the assumptions come from";
    for (const constraint_source of [
      "x",
      { fact_ids: ["FACT-a"], extra: 1 },
      { fact_ids: "FACT-a" },
      { fact_ids: [] },
      { fact_ids: [""] },
    ])
      expect(
        kindErrors({ kind: "arithmetic", constraint_source }),
      ).toStrictEqual([message]);
    expect(
      kindErrors({
        kind: "arithmetic",
        constraint_source: { fact_ids: ["F"] },
      }),
    ).toStrictEqual([]);
  });

  test("source-backed rule domains apply only to kind rule", () => {
    expect(
      kindErrors({
        kind: "state_machine",
        domain_source: { symbol_id: "SYM-m" },
        domains: {
          state: { source: { reader: "glob", pattern: "a/*" } },
          event: { symbol_id: "SYM-e" },
        },
      }),
    ).toStrictEqual([
      "proof_contract.domains.state.source applies only to kind rule: a state machine's domains are the code's",
    ]);
  });
});

describe("proofContractErrors rule predicates", () => {
  test("a predicate reference may name its harness", () => {
    expect(
      kindErrors({
        kind: "rule",
        predicate_source: {
          p: { symbol_id: "SYM-p" },
          h: { symbol_id: "SYM-h", harness_for: ["SYM-x"] },
        },
        domains: { t: { symbol_id: "SYM-t" } },
      }),
    ).toStrictEqual([]);
    expect(
      kindErrors({
        kind: "rule",
        predicate_source: { h: { symbol_id: "SYM-h", harness_for: [] } },
        domains: { t: { symbol_id: "SYM-t" } },
      }),
    ).toStrictEqual([
      "proof_contract.predicate_source must map each predicate name to {symbol_id, export?, harness_for?} naming the function that decides it",
    ]);
  });
});

describe("optionalProofContractFields", () => {
  test("copies constraint sources, proves, predicates and domains", () => {
    expect(
      optionalProofContractFields({
        kind: "rule",
        constraint_source: { fact_ids: ["FACT-a", 3] },
        proves: ["CLAIM-a", 4],
        predicate_source: {
          plain: { symbol_id: "SYM-p", export: "p", arg: 2 },
          harnessed: { symbol_id: "SYM-h", harness_for: ["SYM-x", 1] },
          broken: { export: "x" },
        },
        domains: {
          sourced: { source: { reader: "glob", pattern: "a/*", extra: 1 } },
          coded: { symbol_id: "SYM-c" },
          broken: 3,
        },
      }),
    ).toStrictEqual<Record<string, unknown>>({
      kind: "rule",
      constraint_source: { fact_ids: ["FACT-a"] },
      proves: ["CLAIM-a"],
      predicate_source: {
        plain: { symbol_id: "SYM-p", export: "p", arg: 2 },
        harnessed: { symbol_id: "SYM-h", harness_for: ["SYM-x"] },
      },
      domains: {
        sourced: { source: { reader: "glob", pattern: "a/*" } },
        coded: { symbol_id: "SYM-c" },
      },
    });
  });

  test("maps with no usable entry are left out", () => {
    expect(
      optionalProofContractFields({
        predicate_source: { a: 1 },
        domains: { b: {} },
      }),
    ).toStrictEqual({});
    expect(
      optionalProofContractFields({ predicate_source: 1, domains: [] }),
    ).toStrictEqual({});
  });
});

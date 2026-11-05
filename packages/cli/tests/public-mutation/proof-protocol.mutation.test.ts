import { describe, expect, test } from "bun:test";

import {
  ATTEMPTS_STATUS,
  CERTIFICATE_PROOF_KINDS,
  CODE_CERTIFICATE_VERSION,
  PROOF_BINDINGS_SCHEMA,
  PROOF_BINDING_KINDS,
  PROOF_CONTRACT_SCHEMA,
  PROOF_CONTRACT_VERSION,
  PROOF_INTEGRATION_VERSION,
  PROOF_KINDS,
  PROOF_RECEIPT_V1_VERSION,
  PROOF_RECEIPT_VERSION,
  PROOF_RECEIPT_VERSIONS,
  PROOF_RESULT_OUTCOMES,
  PROOF_RESULT_SCHEMA,
  PROOF_RUN_ARTIFACT_SCHEMA,
  PROOF_RUN_OUTCOMES,
  PROOF_RUN_VERSION,
  RUN_FAILURE_PHASES,
  SUCCESS_POLICIES,
  isCertificateProofKind,
  optionalProofContractFields,
  proofBindingsErrors,
  proofContractErrors,
  proofResultErrors,
  proofRunArtifactErrors,
} from "../../src/public/proof-protocol.js";
import { expectGolden } from "./helpers/golden.js";

type Row = Record<string, unknown>;
const DROP = Symbol("drop");

/** The base row with each patch key set, or removed when its value is DROP. */
function patch(base: Row, changes: Row): Row {
  const out: Row = { ...base };
  for (const [key, value] of Object.entries(changes)) {
    if (value === DROP) delete out[key];
    else out[key] = value;
  }
  return out;
}

function table(
  check: (value: unknown) => string[],
  cases: Record<string, unknown>,
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(cases).map(([name, value]) => [name, check(value)]),
  );
}

const H = "0123456789abcdef".repeat(4);
const RESULT: Row = {
  symbol_id: "SYM-a",
  target: "default",
  outcome: "passed",
  binding: "native_case",
  attempts: { status: "complete", entries: [{ outcome: "passed" }] },
};
const ARTIFACT: Row = {
  version: PROOF_RUN_VERSION,
  producer: { name: "runner", version: "1" },
  command_argv: ["bun", "test"],
  code_snapshot: H,
  environment: { os: "linux", list: [1, "a", true, null, { n: 0 }] },
  run: {
    outcome: "passed",
    exit_code: 0,
    started_at: "2026-01-01T00:00:00Z",
    finished_at: "2026-01-01T00:00:01Z",
  },
  proof_results: [RESULT],
};
const CONTRACT: Row = {
  version: PROOF_CONTRACT_VERSION,
  integration: "bun",
  required_proofs: [{ symbol_id: "SYM-a", target: "default" }],
  success_policy: "all_required_first_attempt",
};
const SOURCE = { reader: "json", file: "data.json" };
const REF = { symbol_id: "SYM-r" };

describe("proof protocol vocabulary", () => {
  test("pins versions, enums and schemas", () => {
    expectGolden("proof-protocol-schemas", {
      PROOF_RUN_VERSION,
      PROOF_CONTRACT_VERSION,
      PROOF_RECEIPT_VERSION,
      PROOF_RECEIPT_V1_VERSION,
      PROOF_RECEIPT_VERSIONS,
      CODE_CERTIFICATE_VERSION,
      PROOF_INTEGRATION_VERSION,
      PROOF_RUN_OUTCOMES,
      PROOF_RESULT_OUTCOMES,
      PROOF_BINDING_KINDS,
      ATTEMPTS_STATUS,
      RUN_FAILURE_PHASES,
      SUCCESS_POLICIES,
      PROOF_KINDS,
      CERTIFICATE_PROOF_KINDS,
      PROOF_RESULT_SCHEMA,
      PROOF_RUN_ARTIFACT_SCHEMA,
      PROOF_CONTRACT_SCHEMA,
      PROOF_BINDINGS_SCHEMA,
    });
  });

  test("recognises certificate kinds only", () => {
    expect(PROOF_KINDS.filter(isCertificateProofKind)).toEqual([
      ...CERTIFICATE_PROOF_KINDS,
    ]);
    expect(isCertificateProofKind(undefined)).toBe(false);
  });
});

describe("proofResultErrors", () => {
  test("reports each malformed field", () => {
    const attempts = (value: unknown) => patch(RESULT, { attempts: value });
    expectGolden(
      "proof-protocol-result-errors",
      table((value) => proofResultErrors(value, "r"), {
        valid: RESULT,
        validFull: patch(RESULT, {
          native_id: "case",
          diagnostics: ["note"],
          attempts: { status: "unavailable" },
        }),
        null: null,
        array: [RESULT],
        string: "result",
        empty: {},
        blankStrings: patch(RESULT, {
          symbol_id: " ",
          target: "",
          native_id: " ",
        }),
        badEnums: patch(RESULT, {
          outcome: "great",
          binding: "loose",
        }),
        attemptsNull: attempts(null),
        attemptsNoStatus: attempts({}),
        attemptsBadStatus: attempts({ status: "partial" }),
        unavailableWithEntries: attempts({
          status: "unavailable",
          entries: [],
        }),
        completeNoEntries: attempts({ status: "complete" }),
        completeEmpty: attempts({ status: "complete", entries: [] }),
        completeNotArray: attempts({ status: "complete", entries: "x" }),
        entries: attempts({
          status: "complete",
          entries: [
            null,
            {},
            { outcome: "great" },
            { outcome: "passed", duration_ms: -1 },
            { outcome: "passed", duration_ms: 1.5 },
            { outcome: "passed", duration_ms: "3" },
            { outcome: "passed", duration_ms: null },
            { outcome: "failed", duration_ms: 0 },
            { outcome: "skipped", duration_ms: 12 },
          ],
        }),
        diagnosticsString: patch(RESULT, { diagnostics: "note" }),
        diagnosticsBlank: patch(RESULT, { diagnostics: ["ok", " "] }),
        diagnosticsEmpty: patch(RESULT, { diagnostics: [] }),
      }),
    );
  });
});

describe("proofRunArtifactErrors", () => {
  test("reports each malformed field", () => {
    const results = (count: number) =>
      Array.from({ length: count }, (_, index) =>
        patch(RESULT, { symbol_id: `SYM-${index}` }),
      );
    const run = (changes: Row) =>
      patch(ARTIFACT, { run: patch(ARTIFACT.run as Row, changes) });
    expectGolden(
      "proof-protocol-artifact-errors",
      table(proofRunArtifactErrors, {
        valid: ARTIFACT,
        validFull: patch(ARTIFACT, {
          executor: { name: "ci" },
          integration: "bun",
          diagnostics: ["note"],
          certificates: [
            { version: "v", kind: "source", test_id: "TEST-1", data: [1] },
          ],
          proof_results: results(1000),
        }),
        null: null,
        array: [],
        empty: {},
        badVersion: patch(ARTIFACT, { version: "kibi.proof-run.v0" }),
        producerString: patch(ARTIFACT, { producer: "runner" }),
        producerBlank: patch(ARTIFACT, { producer: { name: " " } }),
        producerBadVersion: patch(ARTIFACT, {
          producer: { name: "runner", version: "" },
        }),
        executorBad: patch(ARTIFACT, { executor: { version: 1 } }),
        executorNull: patch(ARTIFACT, { executor: null }),
        argvString: patch(ARTIFACT, { command_argv: "bun test" }),
        argvEmpty: patch(ARTIFACT, { command_argv: [] }),
        argvBlank: patch(ARTIFACT, { command_argv: ["bun", " "] }),
        snapshotUpper: patch(ARTIFACT, { code_snapshot: H.toUpperCase() }),
        snapshotLong: patch(ARTIFACT, { code_snapshot: `${H}0` }),
        snapshotPrefixed: patch(ARTIFACT, { code_snapshot: `g${H}` }),
        snapshotNumber: patch(ARTIFACT, { code_snapshot: 1 }),
        snapshotObject: patch(ARTIFACT, {
          code_snapshot: { toString: () => H },
        }),
        diagnosticsMixed: patch(ARTIFACT, { diagnostics: ["ok", ""] }),
        environmentArray: patch(ARTIFACT, { environment: [] }),
        environmentUndefinedValue: patch(ARTIFACT, {
          environment: { a: undefined },
        }),
        environmentNestedUndefined: patch(ARTIFACT, {
          environment: { a: [1, undefined] },
        }),
        environmentFunction: patch(ARTIFACT, {
          environment: { a: { b: () => 1 } },
        }),
        runString: patch(ARTIFACT, { run: "passed" }),
        runEmpty: patch(ARTIFACT, { run: {} }),
        runBad: run({
          outcome: "great",
          exit_code: 1.5,
          started_at: " ",
          finished_at: "",
          failure_phase: "lunch",
        }),
        runNullPhase: run({ failure_phase: null }),
        runPhase: run({
          outcome: "failed",
          exit_code: 1,
          failure_phase: "setup",
        }),
        resultsString: patch(ARTIFACT, { proof_results: "x" }),
        resultsEmpty: patch(ARTIFACT, { proof_results: [] }),
        resultsTooMany: patch(ARTIFACT, { proof_results: results(1001) }),
        resultsDuplicate: patch(ARTIFACT, {
          proof_results: [
            RESULT,
            null,
            patch(RESULT, { symbol_id: " " }),
            patch(RESULT, { target: "" }),
            patch(RESULT, { target: "browser" }),
            RESULT,
          ],
        }),
        integrationBlank: patch(ARTIFACT, { integration: " " }),
        diagnosticsBad: patch(ARTIFACT, { diagnostics: [1] }),
        diagnosticsString: patch(ARTIFACT, { diagnostics: "x" }),
        certificatesString: patch(ARTIFACT, { certificates: "x" }),
        certificatesBad: patch(ARTIFACT, {
          certificates: [
            null,
            { version: " ", kind: "source", test_id: "T" },
            { version: "v", kind: "e2e", test_id: "T" },
            { version: "v", kind: "regex", test_id: "" },
            { version: "v", kind: "regex", test_id: "T", x: undefined },
            { version: "v", kind: "regex", test_id: "T" },
          ],
        }),
      }),
    );
  });
});

describe("proofContractErrors", () => {
  test("reports the core fields", () => {
    expectGolden(
      "proof-protocol-contract-core-errors",
      table(proofContractErrors, {
        valid: CONTRACT,
        null: null,
        array: [CONTRACT],
        empty: {},
        badVersion: patch(CONTRACT, { version: "v0" }),
        integrationBlank: patch(CONTRACT, { integration: " " }),
        proofsString: patch(CONTRACT, { required_proofs: "x" }),
        proofsEmpty: patch(CONTRACT, { required_proofs: [] }),
        proofsTooMany: patch(CONTRACT, {
          required_proofs: Array.from({ length: 1001 }, (_, index) => ({
            symbol_id: `SYM-${index}`,
            target: "t",
          })),
        }),
        proofsMax: patch(CONTRACT, {
          required_proofs: Array.from({ length: 1000 }, (_, index) => ({
            symbol_id: `SYM-${index}`,
            target: "t",
          })),
        }),
        proofsBad: patch(CONTRACT, {
          required_proofs: [
            null,
            { symbol_id: " ", target: "t" },
            { symbol_id: "SYM-a", target: "" },
            { symbol_id: "SYM-a", target: "t" },
            { symbol_id: "SYM-a", target: "u" },
            { symbol_id: "SYM-a", target: "t" },
            { symbol_id: " ", target: "t" },
            { symbol_id: "SYM-z", target: "" },
            { symbol_id: "SYM-z", target: "" },
          ],
        }),
        policy: patch(CONTRACT, {
          success_policy: "own_results_first_attempt",
        }),
        policyBad: patch(CONTRACT, { success_policy: "lenient" }),
        policyMissing: patch(CONTRACT, { success_policy: DROP }),
      }),
    );
  });

  test("reports the kind-specific fields", () => {
    const kind = (name: unknown, changes: Row = {}) =>
      patch(CONTRACT, { kind: name, ...changes });
    expectGolden(
      "proof-protocol-contract-kind-errors",
      table(proofContractErrors, {
        kindBad: kind("magic"),
        kindNull: kind(null),
        e2e: kind("e2e"),
        exhaustiveMissing: kind("exhaustive"),
        exhaustive: kind("exhaustive", {
          domain_source: { symbol_id: "SYM-d", export: "E", field: "f" },
        }),
        exhaustiveArg: kind("exhaustive", {
          domain_source: { symbol_id: "SYM-d", arg: 2 },
        }),
        domainNull: kind("exhaustive", { domain_source: null }),
        domainBlankId: kind("exhaustive", { domain_source: { symbol_id: "" } }),
        domainBlankExport: kind("exhaustive", {
          domain_source: { symbol_id: "S", export: " " },
        }),
        domainBlankField: kind("exhaustive", {
          domain_source: { symbol_id: "S", field: "" },
        }),
        domainArgZero: kind("exhaustive", {
          domain_source: { symbol_id: "S", arg: 0 },
        }),
        domainArgFraction: kind("exhaustive", {
          domain_source: { symbol_id: "S", arg: 1.5 },
        }),
        domainArgString: kind("exhaustive", {
          domain_source: { symbol_id: "S", arg: "1" },
        }),
        domainExtraKey: kind("exhaustive", {
          domain_source: { symbol_id: "S", path: "x" },
        }),
        domainFieldAndArg: kind("exhaustive", {
          domain_source: { symbol_id: "S", field: "f", arg: 1 },
        }),
        domainFieldOnE2e: kind(DROP, {
          domain_source: { symbol_id: "S", field: "f" },
        }),
        domainFieldOnRegex: kind("regex", {
          domain_source: { symbol_id: "S", field: "f" },
          pattern_source: REF,
        }),
        domainArgOnE2e: kind(DROP, {
          domain_source: { symbol_id: "S", arg: 1 },
        }),
        domainArgOnSmt: kind("smt", {
          domain_source: { symbol_id: "S", arg: 1 },
          constraint_source: { fact_ids: ["FACT-1"] },
        }),
        domainPlainOnE2e: kind(DROP, { domain_source: { symbol_id: "S" } }),
        typecheckMissing: kind("typecheck"),
        typecheck: kind("typecheck", {
          domain_source: { symbol_id: "S" },
          witness: { path: "w.ts" },
        }),
        witnessBlank: kind("typecheck", {
          domain_source: { symbol_id: "S" },
          witness: { path: " " },
        }),
        witnessExtra: kind(DROP, { witness: { path: "w.ts", other: 1 } }),
        witnessString: kind(DROP, { witness: "w.ts" }),
        witnessOnE2e: kind(DROP, { witness: { path: "w.ts" } }),
        arithmeticMissing: kind("arithmetic"),
        smtMissing: kind("smt"),
        arithmeticConstraints: kind("arithmetic", {
          constraint_source: { fact_ids: ["FACT-1", "FACT-2"] },
        }),
        constraintString: kind("arithmetic", { constraint_source: "FACT-1" }),
        constraintExtra: kind("arithmetic", {
          constraint_source: { fact_ids: ["FACT-1"], x: 1 },
        }),
        constraintIdsString: kind("arithmetic", {
          constraint_source: { fact_ids: "FACT-1" },
        }),
        constraintIdsEmpty: kind("arithmetic", {
          constraint_source: { fact_ids: [] },
        }),
        constraintIdsBlank: kind("arithmetic", {
          constraint_source: { fact_ids: ["FACT-1", " "] },
        }),
        constraintNoIds: kind("arithmetic", { constraint_source: { ids: [] } }),
        arithmeticValues: kind("arithmetic", {
          value_source: [
            { symbol_id: "S" },
            { symbol_id: "S", export: "E", arg: 1, measure: "value" },
            { symbol_id: "S", measure: "count" },
            { source: SOURCE },
            { source: SOURCE, measure: "count" },
          ],
        }),
        smtValues: kind("smt", { value_source: [{ symbol_id: "S" }] }),
        valuesOnE2e: kind(DROP, { value_source: [{ symbol_id: "S" }] }),
        valuesOnRule: kind("rule", {
          value_source: [{ symbol_id: "S" }],
          predicate_source: { p: REF },
          domains: { t: REF },
        }),
        valuesString: kind("smt", { value_source: "S" }),
        valuesEmpty: kind("smt", { value_source: [] }),
        valuesNull: kind("smt", { value_source: [null] }),
        valuesBlankId: kind("smt", { value_source: [{ symbol_id: " " }] }),
        valuesMixed: kind("smt", {
          value_source: [{ symbol_id: "S" }, { symbol_id: " " }],
        }),
        valuesBlankExport: kind("smt", {
          value_source: [{ symbol_id: "S", export: "" }],
        }),
        valuesBadArg: kind("smt", {
          value_source: [{ symbol_id: "S", arg: 0 }],
        }),
        valuesBadMeasure: kind("smt", {
          value_source: [{ symbol_id: "S", measure: "sum" }],
        }),
        valuesExtraKey: kind("smt", {
          value_source: [{ symbol_id: "S", field: "f" }],
        }),
        valuesSourceBad: kind("smt", {
          value_source: [
            { symbol_id: "S" },
            { source: { reader: "magic" } },
            { source: SOURCE, symbol_id: "S" },
            { source: SOURCE, export: "E" },
            { source: SOURCE, arg: 1 },
            { source: SOURCE, measure: "value" },
          ],
        }),
        provesOnRegex: kind("regex", {
          pattern_source: REF,
          proves: ["CLAIM-a1", "CLAIM-B2"],
        }),
        provesOnE2e: kind(DROP, { proves: ["CLAIM-a"] }),
        provesOnExample: kind("example", { proves: ["CLAIM-a"] }),
        provesString: kind("regex", { pattern_source: REF, proves: "CLAIM-a" }),
        provesEmpty: kind("regex", { pattern_source: REF, proves: [] }),
        provesBadKey: kind("regex", {
          pattern_source: REF,
          proves: ["CLAIM-"],
        }),
        provesLowerPrefix: kind("regex", {
          pattern_source: REF,
          proves: ["claim-a"],
        }),
        provesSuffix: kind("regex", {
          pattern_source: REF,
          proves: ["CLAIM-a b"],
        }),
        provesPrefix: kind("regex", {
          pattern_source: REF,
          proves: ["x CLAIM-a"],
        }),
        provesNumber: kind("regex", { pattern_source: REF, proves: [1] }),
        provesMixed: kind("regex", {
          pattern_source: REF,
          proves: ["CLAIM-a", "bad"],
        }),
        provesObject: kind("regex", {
          pattern_source: REF,
          proves: [{ toString: () => "CLAIM-a" }],
        }),
        provesDuplicate: kind("regex", {
          pattern_source: REF,
          proves: ["CLAIM-a", "CLAIM-a"],
        }),
      }),
    );
  });

  test("reports the rule, state machine, regex and source fields", () => {
    const kind = (name: unknown, changes: Row = {}) =>
      patch(CONTRACT, { kind: name, ...changes });
    expectGolden(
      "proof-protocol-contract-code-errors",
      table(proofContractErrors, {
        ruleMissing: kind("rule"),
        rule: kind("rule", {
          predicate_source: {
            p: REF,
            q: { symbol_id: "S", export: "q", harness_for: ["SYM-h"] },
          },
          domains: {
            t: { symbol_id: "S", export: "E", arg: 2 },
            u: { source: SOURCE },
          },
        }),
        rulePredicatesBad: kind("rule", {
          predicate_source: { p: { symbol_id: "S", arg: 1 } },
          domains: { t: REF },
        }),
        rulePredicatesMixed: kind("rule", {
          predicate_source: { p: REF, q: { symbol_id: "" } },
          domains: { t: REF },
        }),
        rulePredicatesNull: kind("rule", {
          predicate_source: { p: null },
          domains: { t: REF },
        }),
        ruleHarnessArg: kind("rule", {
          predicate_source: {
            p: { symbol_id: "S", arg: 1, harness_for: ["h"] },
          },
          domains: { t: REF },
        }),
        rulePredicatesEmpty: kind("rule", {
          predicate_source: {},
          domains: { t: REF },
        }),
        rulePredicatesBlankKey: kind("rule", {
          predicate_source: { " ": REF },
          domains: { t: REF },
        }),
        rulePredicatesArray: kind("rule", {
          predicate_source: [REF],
          domains: { t: REF },
        }),
        ruleHarnessEmpty: kind("rule", {
          predicate_source: { p: { symbol_id: "S", harness_for: [] } },
          domains: { t: REF },
        }),
        ruleHarnessString: kind("rule", {
          predicate_source: { p: { symbol_id: "S", harness_for: "SYM-h" } },
          domains: { t: REF },
        }),
        ruleHarnessBlank: kind("rule", {
          predicate_source: { p: { symbol_id: "S", harness_for: ["a", " "] } },
          domains: { t: REF },
        }),
        ruleHarnessBadRef: kind("rule", {
          predicate_source: { p: { symbol_id: " ", harness_for: ["a"] } },
          domains: { t: REF },
        }),
        ruleDomainsBad: kind("rule", {
          predicate_source: { p: REF },
          domains: { t: { symbol_id: "S", other: 1 } },
        }),
        ruleDomainsBadExport: kind("rule", {
          predicate_source: { p: REF },
          domains: { t: { symbol_id: "S", export: "" } },
        }),
        ruleDomainsBadArg: kind("rule", {
          predicate_source: { p: REF },
          domains: { t: { symbol_id: "S", arg: -1 } },
        }),
        ruleDomainsSourceExtra: kind("rule", {
          predicate_source: { p: REF },
          domains: { t: { source: SOURCE, symbol_id: "S" } },
        }),
        ruleDomainsSourceBad: kind("rule", {
          predicate_source: { p: REF },
          domains: { t: { source: { reader: "magic" } } },
        }),
        ruleDomainsNull: kind("rule", {
          predicate_source: { p: REF },
          domains: { t: null },
        }),
        predicatesOnE2e: kind(DROP, { predicate_source: { p: REF } }),
        domainsOnRegex: kind("regex", {
          pattern_source: REF,
          domains: { t: REF },
        }),
        sourceDomainsOnStateMachine: kind("state_machine", {
          domain_source: REF,
          domains: { state: { source: SOURCE }, event: REF },
        }),
        stateMachineMissing: kind("state_machine"),
        stateMachine: kind("state_machine", {
          domain_source: REF,
          initial_source: { symbol_id: "S", export: "I", arg: 1 },
          domains: { state: REF, event: REF },
        }),
        stateMachineNoDomains: kind("state_machine", { domain_source: REF }),
        stateMachineOneDomain: kind("state_machine", {
          domain_source: REF,
          domains: { state: REF },
        }),
        stateMachineThreeDomains: kind("state_machine", {
          domain_source: REF,
          domains: { state: REF, event: REF, extra: REF },
        }),
        stateMachineNoState: kind("state_machine", {
          domain_source: REF,
          domains: { status: REF, event: REF },
        }),
        stateMachineNoEvent: kind("state_machine", {
          domain_source: REF,
          domains: { state: REF, signal: REF },
        }),
        initialBad: kind("state_machine", {
          domain_source: REF,
          initial_source: { symbol_id: "" },
        }),
        initialOnE2e: kind(DROP, { initial_source: REF }),
        regexMissing: kind("regex"),
        regexBad: kind("regex", { pattern_source: "x" }),
        patternOnRule: kind("rule", {
          predicate_source: { p: REF },
          domains: { t: REF },
          pattern_source: REF,
        }),
        sourceMissing: kind("source"),
        source: kind("source", { source: SOURCE }),
        sourceBad: kind("source", { source: { reader: "magic" } }),
        sourceUnknownKey: kind("source", {
          source: { ...SOURCE, extra: true },
        }),
        sourceOnE2e: kind(DROP, { source: SOURCE }),
        sourceOnRule: kind("rule", {
          source: SOURCE,
          predicate_source: { p: REF },
          domains: { t: REF },
        }),
      }),
    );
  });
});

describe("optionalProofContractFields", () => {
  test("copies only well-formed optional fields", () => {
    expectGolden("proof-protocol-optional-fields", {
      empty: optionalProofContractFields({}),
      wrongTypes: optionalProofContractFields({
        kind: 3,
        domain_source: { export: "E" },
        witness: { path: 1 },
        constraint_source: { fact_ids: "FACT-1" },
        value_source: "x",
        proves: "CLAIM-a",
        predicate_source: [REF],
        domains: "x",
        source: { reader: "magic" },
        initial_source: { symbol_id: 1 },
        pattern_source: null,
      }),
      emptyMaps: optionalProofContractFields({
        predicate_source: { p: { export: "x" } },
        domains: { t: null },
        domain_source: null,
        witness: null,
        constraint_source: null,
      }),
      full: optionalProofContractFields({
        kind: "rule",
        domain_source: {
          symbol_id: "S",
          export: "E",
          field: "f",
          arg: 2,
          extra: 1,
        },
        witness: { path: "w.ts", extra: 1 },
        constraint_source: { fact_ids: ["FACT-1", 2, "FACT-3"] },
        value_source: [
          null,
          { source: { ...SOURCE, extra: 1 }, measure: "value" },
          { export: "E" },
          { symbol_id: "S", export: "E", arg: 1, measure: "value", x: 1 },
          { symbol_id: "S", measure: "count" },
          { symbol_id: "S", export: 3, arg: 0, measure: "sum" },
        ],
        proves: ["CLAIM-a", 1],
        predicate_source: {
          p: { symbol_id: "S", export: "p", arg: 1, harness_for: ["h", 2] },
          q: { symbol_id: "S" },
          r: { export: "r" },
        },
        domains: {
          t: { source: { ...SOURCE, extra: 1 } },
          u: { symbol_id: "S", arg: 1.5 },
          v: { export: "v" },
        },
        source: { ...SOURCE, extra: 1 },
        initial_source: { symbol_id: "S", export: "I" },
        pattern_source: { symbol_id: "S", arg: 3 },
      }),
      exportNumber: optionalProofContractFields({
        pattern_source: { symbol_id: "S", export: 3 },
      }),
      minimal: optionalProofContractFields({
        domain_source: { symbol_id: "S", export: 1, field: 2, arg: 0 },
      }),
    });
  });
});

test("adds no keys for absent optional fields", () => {
  expect(Object.keys(optionalProofContractFields({}))).toEqual([]);
  expect(
    Object.keys(
      optionalProofContractFields({
        predicate_source: {},
        domains: {},
        source: {},
        initial_source: {},
        pattern_source: {},
      }),
    ),
  ).toEqual([]);
});

describe("proofBindingsErrors", () => {
  test("reports each malformed binding", () => {
    expectGolden(
      "proof-protocol-binding-errors",
      table(proofBindingsErrors, {
        object: {},
        empty: [],
        valid: [
          {
            symbol_id: "SYM-a",
            target: "t",
            native_id: "n",
            aliases: ["x"],
            source_file: "a.ts",
            line: 1,
          },
        ],
        bad: [
          null,
          "x",
          {},
          { symbol_id: " ", target: "" },
          {
            symbol_id: "SYM-a",
            target: "t",
            native_id: "",
            aliases: "x",
            source_file: " ",
            line: 0,
          },
          { symbol_id: "SYM-b", target: "t", aliases: ["x", ""], line: 1.5 },
          { symbol_id: "SYM-c", target: "t", aliases: [], line: "2" },
          { symbol_id: "SYM-a", target: "t" },
          { symbol_id: "SYM-a", target: "u" },
          { symbol_id: "SYM-b", target: "t", line: null },
          { symbol_id: " ", target: "t" },
          { symbol_id: "SYM-z", target: "" },
          { symbol_id: "SYM-z", target: "" },
        ],
      }),
    );
  });
});

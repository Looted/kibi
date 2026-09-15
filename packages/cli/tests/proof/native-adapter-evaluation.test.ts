import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluateContractAgainstRun } from "../../src/proof/evaluate.js";
import { convertJUnitXml } from "../../src/proof/producers/junit-adapter.js";
import { convertTap } from "../../src/proof/producers/tap-adapter.js";
import type {
  ProofContract,
  ProofRunArtifact,
} from "../../src/public/proof-protocol.js";

const fixture = (name: string) =>
  readFileSync(join(import.meta.dir, "fixtures", name), "utf8");

const contract = (symbol_id: string): ProofContract => ({
  version: "kibi.proof-contract.v1",
  integration: "native",
  required_proofs: [{ symbol_id, target: "default" }],
  success_policy: "all_required_first_attempt",
});

const run = (
  proof_results: ProofRunArtifact["proof_results"],
): ProofRunArtifact => ({
  version: "kibi.proof-run.v1",
  producer: { name: "test" },
  command_argv: ["native"],
  code_snapshot: "a".repeat(64),
  environment: {},
  run: {
    outcome: "passed",
    exit_code: 0,
    started_at: "2026-01-01T00:00:00.000Z",
    finished_at: "2026-01-01T00:00:01.000Z",
  },
  proof_results,
});

describe("native report adapters and strict evaluation", () => {
  test("parses escaped/self-closing/nested JUnit cases from a fixture", () => {
    const converted = convertJUnitXml(fixture("adversarial-junit.xml"), [
      {
        symbol_id: "SYM-ESCAPED",
        target: "default",
        native_id: "Escaped::A & B",
      },
      { symbol_id: "SYM-NESTED", target: "default", native_id: "Nested::case" },
    ]);
    expect(converted.fatal).not.toBe(true);
    expect(converted.results).toEqual([
      expect.objectContaining({ symbol_id: "SYM-ESCAPED", outcome: "failed" }),
      expect.objectContaining({ symbol_id: "SYM-NESTED", outcome: "failed" }),
    ]);
  });

  test("preserves TAP subtest identity from a fixture", () => {
    const converted = convertTap(fixture("adversarial-tap.tap"), [
      { symbol_id: "SYM-CHILD", target: "default", native_id: "outer > child" },
      { symbol_id: "SYM-OUTER", target: "default", native_id: "outer" },
    ]);
    expect(converted.fatal).not.toBe(true);
    expect(converted.results.map((result) => result.native_id)).toEqual([
      "outer > child",
      "outer",
    ]);
  });

  test("keeps sibling subtest identities distinct and checks completed child plans", () => {
    const siblings = [
      "TAP version 13",
      "# Subtest: first",
      "    1..1",
      "    ok 1 - case",
      "ok 1 - first",
      "# Subtest: second",
      "    1..1",
      "    ok 1 - case",
      "ok 2 - second",
      "1..2",
    ].join("\n");
    const converted = convertTap(siblings, [
      { symbol_id: "SYM-FIRST", target: "default", native_id: "first > case" },
      {
        symbol_id: "SYM-SECOND",
        target: "default",
        native_id: "second > case",
      },
      { symbol_id: "SYM-FIRST-OUTER", target: "default", native_id: "first" },
      { symbol_id: "SYM-SECOND-OUTER", target: "default", native_id: "second" },
    ]);
    expect(converted.fatal).not.toBe(true);
    expect(converted.results.map((result) => result.native_id)).toEqual([
      "first > case",
      "first",
      "second > case",
      "second",
    ]);

    const childPlanMismatch = convertTap(
      [
        "TAP version 13",
        "# Subtest: child",
        "    1..2",
        "    ok 1 - case",
        "ok 1 - child",
        "1..1",
      ].join("\n"),
      [{ symbol_id: "SYM-CHILD", target: "default", native_id: "child" }],
    );
    expect(childPlanMismatch.fatal).toBe(true);
    expect(childPlanMismatch.results).toEqual([]);
    expect(childPlanMismatch.diagnostics).toContain(
      "TAP plan mismatch in child: expected 2 assertion(s), observed 1",
    );
  });

  test("keeps plain native passes unavailable to the strict evaluator", () => {
    const converted = convertJUnitXml(
      '<testsuite><testcase name="case"/></testsuite>',
      [{ symbol_id: "SYM-CASE", target: "default", native_id: "case" }],
    );
    const result = evaluateContractAgainstRun(
      run(converted.results),
      contract("SYM-CASE"),
    );
    expect(result.satisfied).toBe(false);
    expect(result.gaps[0]?.reason).toContain("attempt history unavailable");
  });

  test("does not let malformed or conflicting native reports satisfy evaluation", () => {
    const malformed = convertJUnitXml(
      '<testsuite><testcase name="case"><failure></testsuite>',
      [{ symbol_id: "SYM-CASE", target: "default", native_id: "case" }],
    );
    const conflicting = convertTap(
      ["TAP version 13", "1..2", "ok 1 - case", "not ok 2 - case"].join("\n"),
      [{ symbol_id: "SYM-CASE", target: "default", native_id: "case" }],
    );
    expect(malformed.fatal).toBe(true);
    expect(conflicting.fatal).toBe(true);
    expect(
      evaluateContractAgainstRun(run(malformed.results), contract("SYM-CASE"))
        .satisfied,
    ).toBe(false);
    expect(
      evaluateContractAgainstRun(run(conflicting.results), contract("SYM-CASE"))
        .satisfied,
    ).toBe(false);
  });

  test("rejects ambiguous duplicate bindings before projecting a native result", () => {
    const converted = convertJUnitXml(
      '<testsuite><testcase name="case"/></testsuite>',
      [
        { symbol_id: "SYM-A", target: "default", native_id: "case" },
        { symbol_id: "SYM-B", target: "default", native_id: "case" },
      ],
    );
    expect(converted.fatal).toBe(true);
    expect(converted.results).toEqual([]);
    expect(converted.diagnostics).toContain("ambiguous junit binding for case");
  });

  test("rejects conflicting duplicate JUnit case outcomes", () => {
    const converted = convertJUnitXml(
      [
        "<testsuite>",
        '<testcase name="case"/>',
        '<testcase name="case"><failure/></testcase>',
        "</testsuite>",
      ].join(""),
      [{ symbol_id: "SYM-CASE", target: "default", native_id: "case" }],
    );
    expect(converted.fatal).toBe(true);
    expect(converted.results).toEqual([]);
    expect(converted.diagnostics).toContain(
      "ambiguous duplicate junit result for case",
    );
  });
});

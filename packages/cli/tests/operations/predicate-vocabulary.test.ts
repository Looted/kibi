import { describe, expect, test } from "bun:test";
import {
  applyArgumentRewrites,
  predicateArgumentConformance,
  predicateCanonicalKey,
  predicateVocabularyErrors,
  predicateVocabularyFromEntity,
} from "../../src/operations/modeling/predicate-vocabulary.js";

const schema = {
  type: "fact",
  fact_kind: "predicate_schema",
  predicate_name: "check_finding_policy",
  argument_names: ["rule", "finding", "severity"],
  argument_types: ["check_rule", "finding_class", "diagnostic_severity"],
  argument_constants: { severity: ["warning", "info"] },
  argument_aliases: { severity: { warn: "warning", informational: "info" } },
};

describe("predicate argument vocabularies", () => {
  test("reads vocabularies from Markdown objects and Prolog JSON strings", () => {
    const fromObject = predicateVocabularyFromEntity(schema);
    const fromJson = predicateVocabularyFromEntity({
      ...schema,
      argument_constants: JSON.stringify(schema.argument_constants),
      argument_aliases: JSON.stringify(schema.argument_aliases),
    });
    expect(fromJson).toEqual(fromObject);
    expect(fromObject.constants).toEqual({ severity: ["warning", "info"] });
  });

  test("accepts a well-formed vocabulary", () => {
    expect(predicateVocabularyErrors(schema)).toEqual([]);
  });

  test("reports every cross-field vocabulary error", () => {
    const errors = predicateVocabularyErrors({
      ...schema,
      argument_constants: { severity: ["warning"], verdict: ["yes"] },
      argument_aliases: {
        severity: { warn: "warning", info: "notice", warning: "warning" },
        finding: { dup: "duplicate" },
      },
    });
    expect(errors).toEqual([
      "argument_constants.verdict is not one of argument_names (rule, finding, severity)",
      "argument_aliases.severity.info must name a declared constant of severity",
      "argument_aliases.severity.warning shadows a declared constant; remove the alias",
      "argument_aliases.finding requires argument_constants.finding to declare the canonical constants",
    ]);
  });

  test("vocabulary fields are rejected outside predicate_schema facts", () => {
    expect(
      predicateVocabularyErrors({
        type: "fact",
        fact_kind: "predicate",
        argument_constants: { severity: ["warning"] },
      }),
    ).toEqual([
      "argument_constants and argument_aliases are only valid on fact_kind predicate_schema",
    ]);
  });

  test("open arguments conform; aliases rewrite; other values are undeclared", () => {
    const vocabulary = predicateVocabularyFromEntity(schema);
    expect(
      predicateArgumentConformance(
        schema.argument_names,
        ["domain_redundancy", "same_signature", "warning"],
        vocabulary,
      ),
    ).toEqual({ rewrites: [], undeclared: [] });

    const alias = predicateArgumentConformance(
      schema.argument_names,
      ["domain_redundancy", "same_signature", "warn"],
      vocabulary,
    );
    expect(alias.rewrites).toEqual([
      { index: 2, argumentName: "severity", from: "warn", to: "warning" },
    ]);
    expect(
      applyArgumentRewrites(
        ["domain_redundancy", "same_signature", "warn"],
        alias.rewrites,
      ),
    ).toEqual(["domain_redundancy", "same_signature", "warning"]);

    expect(
      predicateArgumentConformance(
        schema.argument_names,
        ["domain_redundancy", "same_signature", "fatal"],
        vocabulary,
      ).undeclared,
    ).toEqual([
      {
        index: 2,
        argumentName: "severity",
        value: "fatal",
        allowed: ["warning", "info"],
      },
    ]);
  });

  test("canonical keys follow the predicate apply-plan convention", () => {
    expect(predicateCanonicalKey("p", ["a", "b"])).toBe("p(a,b)");
  });
});

describe("vocabulary enforcement at write and modeling time", () => {
  const schemaRow =
    '[[\'FACT-SCHEMA-CHECK-FINDING-POLICY\',\'fact\',[fact_kind=predicate_schema,predicate_name="check_finding_policy",argument_names=["rule","finding","severity"],argument_constants="{\\"severity\\":[\\"warning\\",\\"info\\"]}",argument_aliases="{\\"severity\\":{\\"warn\\":\\"warning\\"}}"]]]';

  function prologWith(results: string) {
    const goals: string[] = [];
    return {
      goals,
      prolog: {
        query: async (goal: string) => {
          goals.push(goal);
          return { success: true, bindings: { Results: results } };
        },
      },
    };
  }

  const fact = (severity: string) => ({
    type: "fact",
    id: "FACT-NEW",
    fact_kind: "predicate",
    predicate_namespace: "kibi.checks",
    predicate_name: "check_finding_policy",
    predicate_args: ["domain_redundancy", "same_signature", severity],
  });

  test("upsert accepts declared constants and looks up the exact signature", async () => {
    const { assertPredicateArgumentVocabulary } = await import(
      "../../src/operations/mutation/predicate-vocabulary-guard.js"
    );
    const { prolog, goals } = prologWith(schemaRow);
    await assertPredicateArgumentVocabulary(prolog, fact("warning"));
    expect(goals[0]).toContain("Name == check_finding_policy");
    expect(goals[0]).toContain("Namespace == 'kibi.checks'");
    expect(goals[0]).toContain("Arity =:= 3");
  });

  test("upsert rejects aliases and undeclared values with the constant to use", async () => {
    const { assertPredicateArgumentVocabulary } = await import(
      "../../src/operations/mutation/predicate-vocabulary-guard.js"
    );
    await expect(
      assertPredicateArgumentVocabulary(
        prologWith(schemaRow).prolog,
        fact("warn"),
      ),
    ).rejects.toThrow(
      "argument severity uses alias warn; use the declared constant warning",
    );
    await expect(
      assertPredicateArgumentVocabulary(
        prologWith(schemaRow).prolog,
        fact("fatal"),
      ),
    ).rejects.toThrow(
      "argument severity value fatal is not declared by FACT-SCHEMA-CHECK-FINDING-POLICY; allowed: warning, info",
    );
  });

  test("facts without a closed schema and non-predicate entities pass untouched", async () => {
    const { assertPredicateArgumentVocabulary } = await import(
      "../../src/operations/mutation/predicate-vocabulary-guard.js"
    );
    const empty = prologWith("[]");
    await assertPredicateArgumentVocabulary(empty.prolog, fact("anything"));
    const untouched = prologWith(schemaRow);
    await assertPredicateArgumentVocabulary(untouched.prolog, {
      type: "req",
      id: "REQ-x",
    });
    expect(untouched.goals).toEqual([]);
  });

  test("suggestions bind aliases to constants and leave undeclared values unbound", async () => {
    const { buildSuggestion } = await import(
      "../../src/operations/modeling/predicate-applyplan.js"
    );
    const candidate = {
      id: "FACT-SCHEMA-CHECK-FINDING-POLICY",
      predicate_name: "check_finding_policy",
      title: "Check finding policy",
      description: "A check rule reports a finding class at a severity.",
      argument_names: ["rule", "finding", "severity"],
      argument_types: ["check_rule", "finding_class", "diagnostic_severity"],
      argument_constants: { severity: ["warning", "info"] },
      argument_aliases: { severity: { warn: "warning" } },
      keywords: [],
      examples: [],
      tags: [],
    };
    const text = "Domain redundancy reports same-signature findings.";
    const alias = buildSuggestion(candidate, text, "domain_redundancy", 1, {
      rule: "domain_redundancy",
      finding: "same_signature",
      severity: "warn",
    });
    expect(alias.predicate_args).toEqual([
      "domain_redundancy",
      "same_signature",
      "warning",
    ]);
    expect(alias.canonical_key).toBe(
      "check_finding_policy(domain_redundancy,same_signature,warning)",
    );
    expect(alias.unbound_arguments).not.toContain("severity");

    const undeclared = buildSuggestion(
      candidate,
      text,
      "domain_redundancy",
      1,
      {
        rule: "domain_redundancy",
        finding: "same_signature",
        severity: "fatal",
      },
    );
    expect(undeclared.binding_status).toBe("incomplete");
    expect(undeclared.unbound_arguments).toContain("severity");
    expect(undeclared.schema.argument_constants).toEqual({
      severity: ["warning", "info"],
    });
  });
});

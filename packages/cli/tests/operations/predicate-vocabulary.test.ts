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

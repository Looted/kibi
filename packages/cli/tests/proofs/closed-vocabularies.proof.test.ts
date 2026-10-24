import { describe, expect, test } from "bun:test";
import { buildBindingHints } from "../../src/operations/modeling/predicate-binding-hints.js";
import { BUILT_IN_PREDICATE_SCHEMAS } from "../../src/operations/modeling/predicate-catalog.js";
import type { PredicateSuggestion } from "../../src/operations/modeling/predicate-types.js";
import { predicateVocabularyErrors } from "../../src/operations/modeling/predicate-vocabulary.js";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  failedMembers,
  writeCodeCertificate,
} from "../../src/public/proof-certificates.js";

// implements REQ-model-predicates-closed-vocabularies

type Schema = (typeof BUILT_IN_PREDICATE_SCHEMAS)[number];

function exampleArgs(example: string): string[] {
  return example
    .slice(example.indexOf("(") + 1, example.lastIndexOf(")"))
    .split(",")
    .map((value) => value.trim());
}

/** A suggestion of `schema` with every argument still unbound. */
function unbound(schema: Schema): PredicateSuggestion {
  return {
    schema,
    unbound_arguments: [...schema.argument_names],
    predicate_args: schema.argument_names.map(() => ""),
    binding_provenance_by_argument: {},
    subject_pairing: "paired",
  } as unknown as PredicateSuggestion;
}

/** Every built-in predicate schema declares valid closed vocabularies that its examples use and its unbound hints list: the exhaustive certificate. */
async function closedVocabulariesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-model-predicates-closed-vocabularies-exhaustive",
    domain: {
      symbolId: "SYM-built-in-predicate-schemas",
      members: BUILT_IN_PREDICATE_SCHEMAS,
    },
    key: (schema) => schema.id,
    check(schema) {
      const errors = predicateVocabularyErrors({
        ...schema,
        fact_kind: "predicate_schema",
      });
      if (errors.length > 0) throw new Error(errors.join("; "));
      const closed = Object.entries(schema.argument_constants ?? {});
      const hints = buildBindingHints(unbound(schema), "", []);
      for (const [name, constants] of closed) {
        if (
          constants.length === 0 ||
          new Set(constants).size !== constants.length
        )
          throw new Error(`${name} must list distinct constants`);
        const position = schema.argument_names.indexOf(name);
        for (const example of schema.examples) {
          const value = exampleArgs(example)[position];
          if (value === undefined || !constants.includes(value))
            throw new Error(`example ${example} uses ${value} for ${name}`);
        }
        const hint = hints.find((entry) => entry.argument === name);
        if (JSON.stringify(hint?.allowedValues) !== JSON.stringify(constants))
          throw new Error(
            `the unbound ${name} hint lists ${JSON.stringify(hint?.allowedValues)}`,
          );
      }
      // An open argument never claims a closed list.
      for (const hint of hints)
        if (
          hint.allowedValues !== undefined &&
          schema.argument_constants?.[hint.argument] === undefined
        )
          throw new Error(`open argument ${hint.argument} lists allowedValues`);
    },
  });
}

describe("closed predicate vocabularies, proved by exhaustion", () => {
  test("every built-in predicate schema declares valid closed vocabularies that its examples use and its unbound hints list", async () => {
    const certificate = await closedVocabulariesCertificate();
    writeCodeCertificate(certificate);
    expect(failedMembers(certificate)).toEqual([]);
  });
});

import { describe, expect, test } from "bun:test";
import { evaluateSemanticApplicability } from "../../../src/operations/modeling/predicate-applicability.js";
import { isGenericPlaceholder } from "../../../src/operations/modeling/predicate-bindings.js";
import { inferArgs } from "../../../src/operations/modeling/predicate-inference.js";
import { predicateSchemaFromEntity } from "../../../src/operations/modeling/predicate-loader.js";
import { predicateVocabularyErrors } from "../../../src/operations/modeling/predicate-vocabulary.js";
import {
  alignRequirementVocabulary,
  readSubjectVocabulary,
} from "../../../src/operations/modeling/vocabulary-alignment.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";

const schema = (fields: Record<string, unknown>) => ({
  fact_kind: "predicate_schema",
  predicate_name: "route_access",
  argument_names: ["role", "route"],
  ...fields,
});

describe("predicate vocabulary errors", () => {
  test("names every malformed constants and aliases field", () => {
    expect(
      predicateVocabularyErrors(
        schema({ argument_constants: "{not json", argument_aliases: "[1]" }),
      ),
    ).toStrictEqual([
      "argument_constants must map argument names to constant lists",
      "argument_aliases must map argument names to alias-to-constant objects",
    ]);
    expect(
      predicateVocabularyErrors(
        schema({
          argument_constants: { role: [""], route: ["home"] },
          argument_aliases: { owner: { boss: "admin" }, route: "landing" },
        }),
      ),
    ).toStrictEqual([
      "argument_constants.role must be a non-empty list of non-empty strings",
      "argument_aliases.owner is not one of argument_names (role, route)",
      "argument_aliases.route must map alias spellings to constants",
    ]);
  });
});

describe("predicate schema loading", () => {
  test("keeps the schema's constants and aliases", () => {
    const [loaded] = predicateSchemaFromEntity(
      schema({
        id: "FACT-route-access",
        title: "Route access",
        argument_types: ["role", "route"],
        argument_constants: { role: ["admin", "guest"] },
        argument_aliases: { role: { administrator: "admin" } },
      }),
    );
    expect(loaded).toMatchObject({
      argument_constants: { role: ["admin", "guest"] },
      argument_aliases: { role: { administrator: "admin" } },
    });
  });
});

describe("predicate argument helpers", () => {
  test("treats an executable policy name as a placeholder", () => {
    expect(isGenericPlaceholder("executable_policy")).toBe(true);
    expect(isGenericPlaceholder("retry_policy")).toBe(false);
  });

  test("binds only the subject slot of a project-local schema", () => {
    expect(
      inferArgs(
        {
          id: "FACT-local",
          predicate_name: "local_rule",
          argument_names: ["subject", "target"],
          argument_types: ["entity", "entity"],
        } as never,
        "The editor must sync the target.",
        "editor",
      ),
    ).toStrictEqual(["editor", "unknown"]);
  });

  test("names a required semantic cue the prose lacks", () => {
    const result = evaluateSemanticApplicability(
      {
        schema: {
          id: "FACT-offline",
          predicate_name: "offline_behavior_rule",
          title: "Offline behavior",
          description: "Offline behavior",
          argument_names: ["subject"],
          argument_types: ["entity"],
          keywords: [],
          examples: [],
          tags: [],
        },
        components: { negative_evidence: 0, exact_pattern: 0 },
      } as never,
      "The client must keep working offline.",
    );
    expect(result.reasons).toContain(
      "required semantic cue absent for offline_behavior_rule",
    );
  });
});

describe("vocabulary alignment", () => {
  const prolog = (answer: Record<string, unknown>) =>
    ({
      query: async (goal: string) =>
        goal.includes("subject_vocabulary_json")
          ? answer
          : { success: true, bindings: { Json: "[]" } },
    }) as never;

  test("reports a failed vocabulary query", async () => {
    await expect(
      readSubjectVocabulary(
        prolog({ success: false, bindings: {}, error: "no module" }),
      ),
    ).rejects.toThrow("Vocabulary query failed: no module");
    await expect(
      readSubjectVocabulary(prolog({ success: false, bindings: {} })),
    ).rejects.toThrow("Vocabulary query failed: unknown error");
  });

  test("keeps the ranked candidates when they already hold the proposed key", async () => {
    const vocabulary = [
      {
        factId: "FACT-SUBJ-SESSION",
        subjectKey: "session.timeout",
        title: "Session timeout",
        reqDerived: false,
        requirements: [],
      },
    ];
    const outcome = await alignRequirementVocabulary(
      {
        workspaceRoot: process.cwd(),
        signal: new AbortController().signal,
        clock: () => new Date(0),
        prolog: prolog({
          success: true,
          bindings: { Json: JSON.stringify(vocabulary) },
        }),
      } as OperationContext,
      {
        claimKey: "CLAIM-0000000000000001",
        statement: "Session timeout must be 30 minutes.",
        proposedSubjectKey: "session.timeout",
      },
    );
    expect(
      outcome?.subject.candidates.map((row) => row.subjectKey),
    ).toStrictEqual(["session.timeout"]);
  });
});

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildSuggestion } from "../../../src/operations/modeling/predicate-applyplan.js";
import {
  type SchemaRef,
  bindingsFor,
  resolveSchema,
} from "./suggestion-scenarios.js";

type Scenario = {
  schema: SchemaRef;
  text: string;
  subject?: string;
  score: number;
  bindings?: string;
  polarity?: "assert" | "deny";
  diagnostics?: Parameters<typeof buildSuggestion>[6];
  expected: string;
};

// Golden suggestions over built-in and custom schemas, chosen so each
// binding, pairing and polarity branch decides at least one of them.
const { cases } = JSON.parse(
  readFileSync(
    path.join(
      import.meta.dir,
      "fixtures",
      "predicate-applyplan-suggestions.golden.json",
    ),
    "utf8",
  ),
) as { cases: Scenario[] };

describe("buildSuggestion golden scenarios", () => {
  for (const [index, scenario] of cases.entries()) {
    const ref = scenario.schema.builtin ?? scenario.schema.custom;
    test(`scenario ${index}: ${ref} ${JSON.stringify(scenario.text)}`, () => {
      const schema = resolveSchema(scenario.schema);
      const suggestion = buildSuggestion(
        schema,
        scenario.text,
        scenario.subject ?? "unknown",
        scenario.score,
        bindingsFor(schema, scenario.bindings, scenario.subject ?? "unknown"),
        scenario.polarity,
        scenario.diagnostics,
      );
      expect(JSON.parse(JSON.stringify(suggestion))).toStrictEqual(
        JSON.parse(scenario.expected),
      );
    });
  }
});

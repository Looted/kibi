// implements REQ-mcp-suggest-predicates
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as applicability from "../../src/operations/modeling/predicate-applicability.js";
import { BUILT_IN_PREDICATE_SCHEMAS } from "../../src/operations/modeling/predicate-catalog.js";
import * as loader from "../../src/operations/modeling/predicate-loader.js";
import * as ranker from "../../src/operations/modeling/predicate-ranker.js";
import type { PredicateScoreComponents } from "../../src/operations/modeling/predicate-types.js";
import {
  executeSuggestPredicates,
  handleKbSuggestPredicates,
} from "../../src/operations/modeling/suggest-predicates.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.ts";

const spies: Array<{ mockRestore: () => void }> = [];
let restoreEnv: (() => void) | undefined;

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  restoreEnv?.();
  restoreEnv = undefined;
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("suggest-predicates remaining routing and ranking branches", () => {
  test("executeSuggestPredicates uses the operation context prolog port", async () => {
    restoreEnv = isolateKibiEnv();
    const result = await executeSuggestPredicates(
      {
        text: "This design exists because the legacy renderer made zoom flicker visible during playback.",
        includeExistingSchemas: false,
      },
      {
        workspaceRoot: process.cwd(),
        signal: new AbortController().signal,
        clock: () => new Date(0),
        prolog: null,
      },
    );
    expect(result.structuredContent.recommendedAction).toBe("review_nonlogical");
  });

  test("unknown schemaId resolves the schema reference without a write plan", async () => {
    restoreEnv = isolateKibiEnv();
    const result = await handleKbSuggestPredicates(null, {
      text: "The editor must save changes automatically when the user navigates away.",
      schemaId: "FACT-SCHEMA-DOES-NOT-EXIST",
      includeExistingSchemas: false,
      existingLogicClaims: ["CLAIM-1111111111111111"],
      source: ".kb/requirements/REQ-1.md",
      requirementId: "REQ-1",
      subjectHint: " editor ",
      maxCandidates: 99,
      minScore: 0,
    });
    expect(result.structuredContent.recommendedAction).toBe(
      "resolve_schema_reference",
    );
    expect(result.structuredContent.applyPlan).toEqual([]);
    expect(result.structuredContent.relationshipPlan).toBeNull();
    expect(result.structuredContent.recommendedPredicateSchema).toBeNull();
    expect(result.structuredContent.warnings.join(" ")).toMatch(
      /not available/,
    );
    expect(result.content[0]?.text).toMatch(/unavailable or semantically inapplicable/);
  });

  test("duplicate existing schemas are collapsed before ranking", async () => {
    restoreEnv = isolateKibiEnv();
    const duplicate = BUILT_IN_PREDICATE_SCHEMAS[0];
    if (!duplicate) throw new Error("expected built-in schema");
    const load = spyOn(loader, "loadExistingPredicateSchemas").mockResolvedValue([
      duplicate,
      { ...duplicate },
    ]);
    spies.push(load);
    const result = await handleKbSuggestPredicates(null, {
      text: "The editor must save changes automatically when the user navigates away.",
      includeExistingSchemas: true,
      maxCandidates: 3,
    });
    const names = result.structuredContent.candidates.map(
      (candidate) => `${candidate.schema.id}:${candidate.predicate_name}`,
    );
    expect(new Set(names).size).toBe(names.length);
  });

  test("clamps candidate bounds and keeps rejected diagnostics for an explicit schema", async () => {
    restoreEnv = isolateKibiEnv();
    const result = await handleKbSuggestPredicates(null, {
      text: "The package manager installs packages in the workspace.",
      includeExistingSchemas: false,
      schemaId: "FACT-SCHEMA-DEPENDENCY-RESOLUTION-POLICY",
      maxCandidates: 0,
    });
    expect(result.structuredContent.candidates).toHaveLength(1);
    expect(result.structuredContent.candidates[0]?.eligibility).toBe("rejected");
    expect(result.structuredContent.recommendedAction).toBe(
      "record_ontology_gap",
    );
  });

  test("rejects a weak two-way eligibility tie and keeps name-stable ranking", async () => {
    restoreEnv = isolateKibiEnv();
    const components: PredicateScoreComponents = {
      exact_pattern: 0.5,
      keyword_hits: 1,
      descriptor_overlap: 0.2,
      usage_match: 0.2,
      negative_evidence: 0,
      broad_token_penalty: 0,
      specificity_bonus: 0,
      total: 0.5,
    };
    const rank = spyOn(ranker, "rankSchema").mockImplementation((schema) => ({
      schema,
      score: 0.5,
      components,
    }));
    spies.push(rank);
    const named = new Set<string>();
    const apply = spyOn(
      applicability,
      "evaluateSemanticApplicability",
    ).mockImplementation((ranked) => {
      const name = ranked.schema.predicate_name;
      if (named.size < 3) named.add(name);
      const [first, second, third] = [...named];
      if (name === first) {
        return { eligible: true, reasons: [], applicabilityScore: 0.72 };
      }
      if (name === second) {
        return { eligible: true, reasons: [], applicabilityScore: 0.7 };
      }
      if (name === third) {
        return { eligible: true, reasons: [], applicabilityScore: 0.5 };
      }
      return { eligible: false, reasons: ["unrelated"], applicabilityScore: 0.1 };
    });
    spies.push(apply);

    const tied = await handleKbSuggestPredicates(null, {
      text: "The editor must save changes automatically when the user navigates away.",
      includeExistingSchemas: false,
      maxCandidates: 8,
      minScore: 0,
    });
    expect(
      tied.structuredContent.candidates.some((candidate) =>
        candidate.rejection_reasons.some((reason) =>
          reason.includes("weak-candidate margin abstention"),
        ),
      ),
    ).toBe(true);
    expect(
      tied.structuredContent.candidates.some(
        (candidate) => candidate.eligibility === "eligible",
      ),
    ).toBe(true);

    named.clear();
    apply.mockImplementation((ranked) => {
      const name = ranked.schema.predicate_name;
      if (named.size < 3) named.add(name);
      const [first, second, third] = [...named];
      if (name === first) {
        return { eligible: true, reasons: [], applicabilityScore: 0.85 };
      }
      if (name === second) {
        return { eligible: true, reasons: [], applicabilityScore: 0.7 };
      }
      if (name === third) {
        return { eligible: true, reasons: [], applicabilityScore: 0.65 };
      }
      return { eligible: false, reasons: ["unrelated"], applicabilityScore: 0.1 };
    });
    const strong = await handleKbSuggestPredicates(null, {
      text: "The editor must save changes automatically when the user navigates away.",
      includeExistingSchemas: false,
      maxCandidates: 8,
      minScore: 0,
    });
    expect(
      strong.structuredContent.candidates.filter(
        (candidate) => candidate.eligibility === "eligible",
      ).length,
    ).toBeGreaterThan(1);
    expect(strong.structuredContent.recommendedAction).not.toBe(
      "record_ontology_gap",
    );
  });
});

import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { evaluateProseCoverageCorpus } from "kibi-cli/operations/semantic-advisor/prose-coverage-evaluator";
import { PrologProcess } from "kibi-cli/prolog";
import { jsonSchemaToZod } from "../../src/server/json-schema-to-zod.js";
import { formatImpactText } from "../../src/tools/check-format.js";
import { collectQueryPlanSafetyViolations } from "../../src/tools/query-plan-safety.js";
import {
  formatInvalidRelationshipError,
  formatInvalidRelationshipTuple,
  formatRelationshipSourceMismatch,
  validateLiveRelationshipTargets,
} from "../../src/tools/relationship-validation.js";
import { handleSparql } from "../../src/tools/sparql.js";
import { handleKbSuggestPredicates } from "../../src/tools/suggest-predicates.js";
import { handleKbUpsert } from "../../src/tools/upsert.js";

type LightweightQueryResult = {
  readonly success: boolean;
  readonly error?: string;
  readonly bindings?: Record<string, string>;
};

type PrologQueryResult = Awaited<ReturnType<PrologProcess["query"]>>;

type QueryableProlog = {
  readonly query: (goal: string) => Promise<LightweightQueryResult>;
  readonly invalidateCache?: () => void;
};

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function tempFile(content: string): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-gap-coverage-"));
  tempRoots.push(root);
  const filePath = path.join(root, "checks.pl");
  writeFileSync(filePath, content);
  return filePath;
}

describe("coverage gap branches", () => {
  test("jsonSchemaToZod returns described any schema for non-primitive enums", () => {
    const schema = jsonSchemaToZod({
      enum: [{ nested: true }],
      description: "opaque enum",
    });

    expect(schema.description).toBe("opaque enum");
    expect(schema.safeParse(Symbol("value")).success).toBe(true);
  });

  test("formatImpactText reports the empty impact-diagnostics branch", () => {
    const text = formatImpactText({
      impactDiagnostics: [],
      sourceFiles: [],
      extractedSymbols: [],
      linkedEntities: [],
      nextActions: [],
    });

    expect(text).toBe("No impact diagnostics found");
  });

  test("collectQueryPlanSafetyViolations maps unsafe negation clauses", () => {
    const filePath = tempFile(
      [
        "safe_rule(Id) :-",
        "  kb_entity(Id, req, _),",
        "  \\+ kb_relationship(specified_by, Id, _).",
        "",
        "unsafe_rule(Id) :-",
        "  \\+ kb_relationship(specified_by, Id, _),",
        "  kb_entity(Id, req, _).",
        "",
      ].join("\n"),
    );

    const violations = collectQueryPlanSafetyViolations(filePath);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      rule: "query-plan-safety",
      entityId: "unsafe_rule",
      source: `${filePath}:6`,
    });
  });

  test("relationship formatting covers recipe branches and malformed relationships", () => {
    expect(
      formatInvalidRelationshipTuple({
        relType: "depends_on",
        fromType: "req",
        toType: "fact",
      }),
    ).toContain("Use a typed relationship");
    expect(
      formatInvalidRelationshipTuple({
        relType: "verified_by",
        fromType: "fact",
        toType: "test",
      }),
    ).toContain("Facts are not directly verified by tests");
    expect(
      formatInvalidRelationshipTuple({
        relType: "validates",
        fromType: "test",
        toType: "fact",
      }),
    ).toContain("Tests validate requirements or scenarios");
    expect(
      formatInvalidRelationshipError(
        "Invalid relationship: validates from req to fact.",
      ),
    ).toContain("validates is only valid");
    expect(
      formatInvalidRelationshipError(
        "Invalid relationship: ~w from ~w to ~w-[verified_by,req,fact]",
      ),
    ).toContain("verified_by is only valid");
    expect(formatInvalidRelationshipError("unrelated error")).toBeNull();
    expect(
      formatRelationshipSourceMismatch("REQ-1", {
        from: "REQ-2",
        to: "TEST-1",
      }),
    ).toContain("upsert REQ-2 instead");
    expect(() =>
      formatRelationshipSourceMismatch("REQ-1", { type: "verified_by" }),
    ).toThrow("Relationship from must be a non-empty string");
  });

  test("validateLiveRelationshipTargets ignores unknown endpoints and rejects invalid live tuples", async () => {
    const queries: string[] = [];
    const prolog: QueryableProlog = {
      query: mock(async (goal: string) => {
        queries.push(goal);
        if (goal.includes("UNKNOWN")) return { success: false };
        if (goal.includes("REQ-1"))
          return { success: true, bindings: { Type: "'req'" } };
        if (goal.includes("FACT-1"))
          return { success: true, bindings: { Type: "fact" } };
        if (goal.includes("validate_relationship")) return { success: false };
        return { success: false };
      }),
    };

    await validateLiveRelationshipTargets(
      prolog as Parameters<typeof validateLiveRelationshipTargets>[0],
      { id: "REQ-1", type: "req" },
      [{ type: "relates_to", from: "REQ-1", to: "UNKNOWN" }],
    );
    await expect(
      validateLiveRelationshipTargets(
        prolog as Parameters<typeof validateLiveRelationshipTargets>[0],
        { id: "REQ-1", type: "req" },
        [{ type: "verified_by", from: "REQ-1", to: "FACT-1" }],
      ),
    ).rejects.toThrow("verified_by is only valid");
    expect(queries.some((goal) => goal.includes("UNKNOWN"))).toBe(true);
  });

  test("validateLiveRelationshipTargets uses self endpoint type and tolerates lookup errors", async () => {
    const queries: string[] = [];
    const prolog: QueryableProlog = {
      query: mock(async (goal: string) => {
        queries.push(goal);
        if (goal.includes("THROW")) throw new Error("lookup failed");
        if (goal.includes("TEST-1"))
          return { success: true, bindings: { Type: "test" } };
        return { success: true };
      }),
    };

    await validateLiveRelationshipTargets(
      prolog as Parameters<typeof validateLiveRelationshipTargets>[0],
      { id: "REQ-1", type: "req" },
      [
        { type: "verified_by", from: "REQ-1", to: "TEST-1" },
        { type: "relates_to", from: "REQ-1", to: "THROW" },
      ],
    );

    expect(queries.some((goal) => goal.includes("TEST-1"))).toBe(true);
    expect(queries.some((goal) => goal.includes("THROW"))).toBe(true);
  });

  test("handleSparql rejects invalid positive-timeout inputs before Prolog", async () => {
    const prolog = new PrologProcess();
    prolog.query = mock(
      async (): Promise<PrologQueryResult> => ({
        success: true,
        bindings: {},
      }),
    );

    await expect(
      handleSparql(prolog, {
        endpoint: "https://query.wikidata.org/sparql",
        query: "SELECT * WHERE { ?s ?p ?o }",
        timeoutMs: 0,
      }),
    ).rejects.toThrow("timeoutMs must be a positive number");
  });

  test("prose coverage evaluator reports missing, kind, predicate, property, and operator failures", () => {
    const result = evaluateProseCoverageCorpus([
      {
        id: "missing",
        text: "Plain descriptive prose.",
        expected: { kind: "predicate" },
      },
      {
        id: "kind",
        text: "Only admins can delete records.",
        expected: { kind: "strict_property" },
      },
      {
        id: "predicate",
        text: "Only admins can delete records.",
        expected: { kind: "predicate", predicate_name: "state_transition" },
      },
      {
        id: "property",
        text: "Sessions must be at most 3 active sessions.",
        expected: { kind: "strict_property", property_key: "wrong" },
      },
      {
        id: "operator",
        text: "Sessions must be at most 3 active sessions.",
        expected: { kind: "strict_property", operator: "gte" },
      },
    ]);

    expect(result.summary.failed).toBe(5);
    expect(result.failures.map((failure) => failure.id)).toEqual([
      "missing",
      "kind",
      "predicate",
      "property",
      "operator",
    ]);
  });

  test("suggest-predicates covers prohibition, fallback conditional, and schema defaults", async () => {
    const prohibition = await handleKbSuggestPredicates(null, {
      text: "Only editors can delete locked records.",
      minScore: 0.3,
    });
    const permission = prohibition.structuredContent.candidates.find(
      (candidate) => candidate.predicate_name === "permission_rule",
    );
    expect(permission?.predicate_args).toEqual([
      "editor",
      "delete",
      "locked_records",
      "assert",
    ]);

    const conditional = await handleKbSuggestPredicates(null, {
      text: "When review starts, the ticket transitions from open to closed.",
      minScore: 0.9,
    });
    expect(conditional.structuredContent.candidates[0]?.predicate_name).toBe(
      "state_transition",
    );
  });

  test("upsert validates value-field hints and nested list parsing", async () => {
    const validationProlog = new PrologProcess();
    validationProlog.query = mock(
      async (): Promise<PrologQueryResult> => ({
        success: true,
        bindings: {},
      }),
    );

    await expect(
      handleKbUpsert(validationProlog, {
        type: "fact",
        id: "FACT-VALUE-HINT",
        properties: {
          title: "Value hint",
          status: "open",
          fact_kind: "property_value",
          value: true,
        },
      }),
    ).rejects.toThrow("value_bool: true");

    const goals: string[] = [];
    const upsertProlog = new PrologProcess();
    upsertProlog.query = mock(
      async (goal: string | string[]): Promise<PrologQueryResult> => {
        const queryGoal = Array.isArray(goal) ? goal.join("\n") : goal;
        goals.push(queryGoal);
        if (queryGoal.includes("findall(To, kb_relationship(relates_to")) {
          return {
            success: true,
            bindings: {
              Targets: "['A,B', [nested,value], plain]",
              Sources: "[]",
            },
          };
        }
        if (queryGoal.includes("findall")) {
          return {
            success: true,
            bindings: { Targets: "[]", Sources: "[]" },
          };
        }
        if (queryGoal.startsWith("kb_commit_upsert(")) {
          return {
            success: true,
            bindings: { ChangeKind: "created" },
          };
        }
        return { success: true, bindings: {} };
      },
    );
    const result = await handleKbUpsert(upsertProlog, {
      type: "req",
      id: "REQ-NESTED-LIST",
      properties: {
        title: "Nested list",
        status: "open",
      },
    });

    expect(result.structuredContent?.relationships_created).toBe(0);
    expect(goals.some((goal) => goal.includes("findall"))).toBe(true);
    expect(
      goals.some(
        (goal) =>
          goal.startsWith("kb_commit_upsert(") &&
          goal.includes("rel(relates_to"),
      ),
    ).toBe(false);
  });
});

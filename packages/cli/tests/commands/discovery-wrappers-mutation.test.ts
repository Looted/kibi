import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { stripVTControlCharacters } from "node:util";
import { coverageCommand } from "../../src/commands/coverage.js";
import * as discovery from "../../src/commands/discovery-shared.js";
import { gapsCommand } from "../../src/commands/gaps.js";
import { graphCommand } from "../../src/commands/graph.js";
import { queryCommand } from "../../src/commands/query.js";
import { searchCommand } from "../../src/commands/search.js";
import { statusCommand } from "../../src/commands/status.js";
import type { PrologProcess } from "../../src/prolog.js";
import { VALID_ENTITY_TYPES } from "../../src/public/operations/discovery-entities.js";
import * as runtimeTypes from "../../src/public/operations/runtime-types.js";
import {
  querySpec,
  searchSpec,
  statusSpec,
} from "../../src/public/operations/specs/discovery.js";
import {
  coverageSpec,
  findGapsSpec,
  graphSpec,
} from "../../src/public/operations/specs/reporting.js";
import * as usageTelemetry from "../../src/usage-telemetry.js";
import * as migrateHint from "../../src/utils/migrate-hint.js";

type Result = {
  content: { type: "text"; text: string }[];
  structuredContent: unknown;
};

const restores: Array<() => void> = [];
let logs: string[] = [];
let errors: string[] = [];
let previousExitCode: typeof process.exitCode;

beforeEach(() => {
  previousExitCode = process.exitCode;
  process.exitCode = 0;
  logs = [];
  errors = [];
  const logSpy = spyOn(console, "log").mockImplementation((...args) => {
    logs.push(args.map(String).join(" "));
  });
  const errorSpy = spyOn(console, "error").mockImplementation((...args) => {
    errors.push(args.map(String).join(" "));
  });
  restores.push(
    () => logSpy.mockRestore(),
    () => errorSpy.mockRestore(),
  );
});

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
  process.exitCode = previousExitCode;
});

function result(text: string | undefined, structured: unknown): Result {
  return {
    content: text === undefined ? [] : [{ type: "text", text }],
    structuredContent: structured,
  };
}

/** Records every reporting call and answers each with the next result. */
function stubReporting(...answers: Result[]) {
  const calls: unknown[][] = [];
  const spy = spyOn(discovery, "executeReportingSpec").mockImplementation(
    (async (...args: unknown[]) => {
      calls.push(args);
      return answers.shift() ?? result(undefined, undefined);
    }) as never,
  );
  restores.push(() => spy.mockRestore());
  return calls;
}

function stubOperation(...answers: Result[]) {
  const calls: unknown[][] = [];
  const spy = spyOn(runtimeTypes, "executeOperation").mockImplementation(
    (async (...args: unknown[]) => {
      calls.push(args);
      const next = answers.shift();
      if (next === undefined) throw new Error("no answer");
      return next;
    }) as never,
  );
  restores.push(() => spy.mockRestore());
  return calls;
}

function stubPrint() {
  const calls: unknown[][] = [];
  const spy = spyOn(discovery, "printDiscoveryResult").mockImplementation(
    (...args: unknown[]) => {
      calls.push(args);
    },
  );
  restores.push(() => spy.mockRestore());
  return calls;
}

const stripAnsi = stripVTControlCharacters;

describe("statusCommand", () => {
  test("runs the status spec at the working directory and prints its result", async () => {
    const ops = stubOperation(
      result("status ok", { branch: "main" }),
      result(undefined, { branch: "dev" }),
    );
    const prints = stubPrint();
    const hints: string[] = [];
    const hint = spyOn(
      migrateHint,
      "printSchemaMigrationHint",
    ).mockImplementation((root) => {
      hints.push(root);
    });
    restores.push(() => hint.mockRestore());
    await statusCommand({ format: "json" });
    expect(hints).toStrictEqual([]);
    await statusCommand({});
    // Text output names a pending migration first; JSON carries schemaStatus.
    expect(hints).toStrictEqual([process.cwd()]);
    expect(ops[0]?.[1]).toBe(statusSpec);
    expect(ops[0]?.[2]).toStrictEqual({});
    expect(ops[0]?.[3]).toStrictEqual({ workspaceRoot: process.cwd() });
    expect(typeof (ops[0]?.[0] as { open?: unknown }).open).toBe("function");
    expect(prints).toStrictEqual([
      ["json", { branch: "main" }, "status ok"],
      [undefined, { branch: "dev" }, "Status unavailable"],
    ]);
  });
});

describe("gapsCommand", () => {
  test("passes type, source, CSV filters and paging", async () => {
    const calls = stubReporting(result("gap table", { gaps: [1] }));
    const prints = stubPrint();
    await gapsCommand("req", {
      missingRel: " implements , ,verified_by",
      presentRel: "specified_by",
      tag: "a,b",
      source: "src/app.ts",
      limit: "7",
      offset: "3",
      format: "table",
    });
    expect(calls[0]?.[0]).toBe(findGapsSpec);
    expect(calls[0]?.[1]).toStrictEqual({
      type: "req",
      missingRelationships: ["implements", "verified_by"],
      presentRelationships: ["specified_by"],
      tags: ["a", "b"],
      sourceFile: "src/app.ts",
      limit: 7,
      offset: 3,
    });
    expect(prints).toStrictEqual([["table", { gaps: [1] }, "gap table"]]);
  });

  test("omits unset type and source and defaults paging", async () => {
    const calls = stubReporting(result(undefined, { gaps: [] }));
    const prints = stubPrint();
    await gapsCommand(undefined, { missingRel: "  ", tag: "" });
    expect(calls[0]?.[1]).toStrictEqual({
      missingRelationships: [],
      presentRelationships: [],
      tags: [],
      limit: 100,
      offset: 0,
    });
    expect(prints).toStrictEqual([
      [undefined, { gaps: [] }, "No matching gaps found."],
    ]);
  });
});

describe("graphCommand", () => {
  test("refuses a missing or blank seed", async () => {
    const calls = stubReporting();
    await graphCommand({});
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    await graphCommand({ from: "   " });
    expect(process.exitCode).toBe(1);
    expect(errors).toStrictEqual([
      "Error: --from is required",
      "Error: --from is required",
    ]);
    expect(calls).toStrictEqual([]);
  });

  test("passes every flag and the defaults", async () => {
    const calls = stubReporting(
      result("graph text", { nodes: [1] }),
      result(undefined, { nodes: [] }),
    );
    const prints = stubPrint();
    await graphCommand({
      from: " REQ-1 ,, REQ-2 ",
      relationships: "specified_by, implements",
      direction: "both",
      depth: "3",
      entityTypes: "req",
      maxNodes: "9",
      maxEdges: "11",
      format: "json",
    });
    await graphCommand({ from: "REQ-1", relationships: " " });
    expect(calls[0]?.[0]).toBe(graphSpec);
    expect(calls[0]?.[1]).toStrictEqual({
      seedIds: ["REQ-1", "REQ-2"],
      relationships: ["specified_by", "implements"],
      direction: "both",
      depth: 3,
      entityTypes: ["req"],
      maxNodes: 9,
      maxEdges: 11,
    });
    expect(calls[1]?.[1]).toStrictEqual({
      seedIds: ["REQ-1"],
      relationships: [],
      direction: "outgoing",
      depth: 1,
      entityTypes: [],
      maxNodes: 200,
      maxEdges: 500,
    });
    expect(prints).toStrictEqual([
      ["json", { nodes: [1] }, "graph text"],
      [undefined, { nodes: [] }, "Graph traversal returned no nodes."],
    ]);
    expect(process.exitCode).toBe(0);
  });
});

describe("searchCommand", () => {
  test("refuses a missing or blank query", async () => {
    const ops = stubOperation();
    await searchCommand(undefined, {});
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    await searchCommand(" ", {});
    expect(process.exitCode).toBe(1);
    expect(errors).toStrictEqual([
      "Error: search query is required",
      "Error: search query is required",
    ]);
    expect(ops).toStrictEqual([]);
  });

  test("refuses an unknown entity type", async () => {
    const ops = stubOperation();
    await searchCommand("auth", { type: "nope" });
    expect(process.exitCode).toBe(1);
    expect(errors).toStrictEqual([
      `Error: invalid type 'nope'. Valid types: ${VALID_ENTITY_TYPES.join(", ")}`,
    ]);
    expect(ops).toStrictEqual([]);
  });

  test("passes the query, type and paging and prints the result", async () => {
    const found = result("found", { results: [1], count: 1 });
    const empty = result(undefined, undefined);
    const ops = stubOperation(found, empty);
    const prints = stubPrint();
    const noted: unknown[] = [];
    const note = spyOn(
      usageTelemetry,
      "noteCliOperationCall",
    ).mockImplementation((call) => {
      noted.push(call);
    });
    restores.push(() => note.mockRestore());
    await searchCommand("auth", {
      type: "scenario",
      limit: "4",
      offset: "2",
      format: "json",
    });
    await searchCommand("login", {});
    expect(ops[0]?.[1]).toBe(searchSpec);
    expect(ops[0]?.[2]).toStrictEqual({
      query: "auth",
      type: "scenario",
      limit: 4,
      offset: 2,
    });
    expect(ops[0]?.[3]).toStrictEqual({ workspaceRoot: process.cwd() });
    expect(ops[1]?.[2]).toStrictEqual({ query: "login", limit: 20, offset: 0 });
    expect(prints).toStrictEqual([
      ["json", { results: [1], count: 1 }, "found"],
      [undefined, { results: [], count: 0 }, "No search results for 'login'."],
    ]);
    expect(noted).toStrictEqual([
      { operation: "kb_search", result: found },
      { operation: "kb_search", result: empty },
    ]);
    expect(process.exitCode).toBe(0);
  });
});

describe("coverageCommand", () => {
  test("passes every flag", async () => {
    const calls = stubReporting(result("summary", { rows: [] }));
    const prints = stubPrint();
    await coverageCommand({
      by: "symbol",
      tag: " auth, ,session ",
      includePassing: true,
      status: "active, ,draft",
      includeTransitive: false,
      limit: "5",
      offset: "2",
      includeMigrationPreview: true,
      migrationLimit: "3",
      migrationOffset: "4",
      migrationPredicateLimit: "6",
      migrationPredicateMinScore: "0.5",
      format: "json",
    });
    expect(calls[0]?.[0]).toBe(coverageSpec);
    expect(calls[0]?.[1]).toStrictEqual({
      by: "symbol",
      tags: ["auth", "session"],
      includePassing: true,
      statuses: ["active", "draft"],
      includeTransitive: false,
      limit: 5,
      offset: 2,
      includeMigrationPreview: true,
      migrationLimit: 3,
      migrationOffset: 4,
      migrationPredicateLimit: 6,
      migrationPredicateMinScore: 0.5,
    });
    expect(prints).toStrictEqual([["json", { rows: [] }, "summary"]]);
  });

  test("defaults every flag", async () => {
    const calls = stubReporting(result(undefined, { rows: [] }));
    const prints = stubPrint();
    await coverageCommand({ cases: false });
    expect(calls[0]?.[1]).toStrictEqual({
      by: "req",
      tags: [],
      includePassing: false,
      statuses: [],
      includeTransitive: true,
      limit: 100,
      offset: 0,
      includeMigrationPreview: false,
      migrationLimit: 1,
      migrationOffset: 0,
      migrationPredicateLimit: 5,
      migrationPredicateMinScore: 0.35,
    });
    expect(prints).toStrictEqual([
      [undefined, { rows: [] }, "Coverage summary unavailable."],
    ]);
  });

  const caseRows = {
    rows: [
      { id: "REQ-none" },
      { id: "REQ-empty", proofStages: { cases: { status: "x", cases: [] } } },
      { id: "REQ-unstaged", proofStages: { cases: { status: "x" } } },
      {
        id: "REQ-1",
        proofStages: {
          cases: {
            status: "partial",
            summary: { covered: 1, uncovered: 2, unspecified: 3, waived: 4 },
            cases: [
              {
                caseId: "C1",
                factId: "F1",
                constraint: "max",
                predicted: "acceptance",
                coverage: "covered",
                scenarios: ["SCEN-1", "SCEN-2"],
              },
              {
                caseId: "C2",
                factId: "F2",
                constraint: "min",
                predicted: "rejection",
                coverage: "uncovered",
                assumption: { n: 0 },
              },
              {
                caseId: "C3",
                factId: "F3",
                constraint: "min",
                predicted: "acceptance",
                coverage: "uncovered",
              },
              {
                caseId: "C4",
                factId: "F4",
                constraint: "eq",
                predicted: "rejection",
                coverage: "waived",
              },
            ],
          },
        },
      },
      {
        id: "REQ-2",
        proofStages: {
          cases: {
            status: "open",
            cases: [
              {
                caseId: "C5",
                factId: "F5",
                constraint: "eq",
                predicted: "rejection",
                coverage: "uncovered",
              },
              {
                caseId: "C6",
                factId: "F6",
                constraint: "eq",
                predicted: "acceptance",
                coverage: "covered",
              },
            ],
          },
        },
      },
    ],
  };

  test("prints the edge cases of each requirement", async () => {
    stubReporting(result("ignored", caseRows));
    await coverageCommand({ cases: true });
    expect(logs).toStrictEqual([
      [
        "REQ-1: partial (1 covered, 2 uncovered, 3 unspecified, 4 waived)",
        "  C1 F1 max -> acceptance: covered by SCEN-1, SCEN-2",
        "  C2 F2 min -> rejection: uncovered",
        '    assumes {"n":0}',
        "  C3 F3 min -> acceptance: uncovered",
        "  C4 F4 eq -> rejection: waived",
        "REQ-2: open (0 covered, 0 uncovered, 0 unspecified, 0 waived)",
        "  C5 F5 eq -> rejection: uncovered",
        "    assumes {}",
        "  C6 F6 eq -> acceptance: covered by ",
      ].join("\n"),
    ]);
  });

  test("prints the cases as JSON keyed by requirement", async () => {
    stubReporting(result("ignored", caseRows));
    await coverageCommand({ cases: true, format: "json" });
    const [, , , third, fourth] = caseRows.rows;
    expect(logs).toStrictEqual([
      JSON.stringify(
        {
          rows: [
            { id: "REQ-1", cases: third?.proofStages?.cases },
            { id: "REQ-2", cases: fourth?.proofStages?.cases },
          ],
        },
        null,
        2,
      ),
    ]);
  });

  test("says so when no requirement has cases", async () => {
    stubReporting(
      result(undefined, { rows: [{ id: "REQ-0" }] }),
      result(undefined, { rows: "not a list" }),
      result(undefined, undefined),
    );
    await coverageCommand({ cases: true, format: "table" });
    await coverageCommand({ cases: true });
    await coverageCommand({ cases: true, format: "json" });
    expect(logs).toStrictEqual([
      "No requirement in this page has derived edge cases.",
      "No requirement in this page has derived edge cases.",
      JSON.stringify({ rows: [] }, null, 2),
    ]);
  });
});

describe("queryCommand", () => {
  test("needs a type, a source or a relationship seed", async () => {
    const ops = stubOperation();
    expect(await queryCommand(undefined, {})).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual([
      "Error: Must specify entity type, --source, or --relationships option",
    ]);
    expect(await queryCommand("", { id: "X" })).toStrictEqual({ exitCode: 1 });
    expect(ops).toStrictEqual([]);
  });

  test("refuses an unknown type", async () => {
    const ops = stubOperation();
    expect(await queryCommand("nope", {})).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual([
      `Error: Invalid type 'nope'. Valid types: ${VALID_ENTITY_TYPES.join(", ")}`,
    ]);
    expect(ops).toStrictEqual([]);
  });

  test("passes every filter and prints entities as JSON", async () => {
    const entities = [{ id: "REQ-1" }];
    const ops = stubOperation(
      result(undefined, { entities }),
      result(undefined, { entities }),
    );
    expect(
      await queryCommand("req", {
        id: "REQ-1",
        tag: "auth",
        source: "src/a.ts",
        limit: "5",
        offset: "1",
      }),
    ).toStrictEqual({ exitCode: 0 });
    expect(
      await queryCommand(undefined, { source: "src/b.ts", format: "json" }),
    ).toStrictEqual({ exitCode: 0 });
    expect(ops[0]?.[1]).toBe(querySpec);
    expect(ops[0]?.[2]).toStrictEqual({
      type: "req",
      id: "REQ-1",
      tags: ["auth"],
      sourceFile: "src/a.ts",
      limit: 5,
      offset: 1,
    });
    expect(ops[0]?.[3]).toStrictEqual({ workspaceRoot: process.cwd() });
    expect(ops[1]?.[2]).toStrictEqual({
      sourceFile: "src/b.ts",
      limit: 100,
      offset: 0,
    });
    const json = JSON.stringify(entities, null, 2);
    expect(logs).toStrictEqual([json, json]);
  });

  test("prints an empty answer by format", async () => {
    const ops = stubOperation(
      result(undefined, { entities: [] }),
      result(undefined, undefined),
      result(undefined, {}),
    );
    await queryCommand("req", { format: "json" });
    await queryCommand("req", { format: "table" });
    await queryCommand("req", {});
    expect(logs).toStrictEqual([
      "[]",
      "No entities found",
      "No entities found",
    ]);
    expect(ops[2]?.[2]).toStrictEqual({ type: "req", limit: 100, offset: 0 });
  });

  test("prints entities as a truncated table", async () => {
    stubOperation(
      result(undefined, {
        entities: [
          {
            id: "REQ-ABCDEFGHIJKLMNOPQ",
            type: "req",
            title: "T".repeat(45),
            status: "open",
            tags: ["auth", 1, "y".repeat(30)],
          },
          { id: 5, type: null, title: [], status: 2, tags: "no" },
        ],
      }),
    );
    await queryCommand("req", { format: "table" });
    expect(stripAnsi(logs[0] ?? "")).toBe(
      [
        "┌──────────────────┬──────────┬────────────────────────────────────────┬────────────┬──────────────────────────────┐",
        "│ ID               │ Type     │ Title                                  │ Status     │ Tags                         │",
        "├──────────────────┼──────────┼────────────────────────────────────────┼────────────┼──────────────────────────────┤",
        `│ REQ-ABCDEFGHIJKL │ req      │ ${"T".repeat(38)} │ open       │ auth, ${"y".repeat(22)} │`,
        "├──────────────────┼──────────┼────────────────────────────────────────┼────────────┼──────────────────────────────┤",
        "│ N/A              │ N/A      │ N/A                                    │ N/A        │                              │",
        "└──────────────────┴──────────┴────────────────────────────────────────┴────────────┴──────────────────────────────┘",
      ].join("\n"),
    );
  });

  test("reports an operation failure", async () => {
    const spy = spyOn(runtimeTypes, "executeOperation").mockImplementation(
      (async () => {
        throw "plain failure";
      }) as never,
    );
    restores.push(() => spy.mockRestore());
    expect(await queryCommand("req", {})).toStrictEqual({ exitCode: 1 });
    spy.mockImplementation((async () => {
      throw new Error("prolog down");
    }) as never);
    expect(await queryCommand("req", {})).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual([
      "Error: plain failure",
      "Error: prolog down",
    ]);
  });

  function stubRelationships(
    answer: { success: boolean; bindings: Record<string, string> },
    goals: string[] = [],
  ) {
    const spy = spyOn(discovery, "withAttachedBranchProlog").mockImplementation(
      (async (callback: (prolog: PrologProcess) => Promise<unknown>) =>
        callback({
          query: async (goal: string) => {
            goals.push(goal);
            return answer;
          },
        } as unknown as PrologProcess)) as never,
    );
    restores.push(() => spy.mockRestore());
    return goals;
  }

  test("asks for the outgoing relationships of an escaped seed", async () => {
    const goals = stubRelationships({ success: true, bindings: {} });
    expect(
      await queryCommand(undefined, { relationships: "it's" }),
    ).toStrictEqual({ exitCode: 0 });
    expect(goals).toStrictEqual([
      "findall([Type,From,To], (member(Type, [depends_on, specified_by, verified_by, validates, implements, covered_by, executable_for, constrained_by, constrains, requires_property, requires_predicate, requires_rule, guards, publishes, consumes, supersedes, restates, assumes, exempts, relates_to]), kb_relationship(Type, 'it''s', To), From='it''s'), Results)",
    ]);
    expect(logs).toStrictEqual(["No entities found"]);
  });

  test("keeps only well-formed rows of the seed and pages them", async () => {
    stubRelationships({
      success: true,
      bindings: {
        Results:
          "[[specified_by,REQ-1,SCEN-1],[implements,REQ-1],[implements],[nope,REQ-1,X],[[a],REQ-1,X],[implements,REQ-2,X],[implements,[REQ-1],X],[implements,REQ-1,[x]],[verified_by,REQ-1,TEST-1,extra],[relates_to,REQ-1,R]]",
      },
    });
    await queryCommand(undefined, {
      relationships: "REQ-1",
      offset: "1",
      limit: "1",
    });
    await queryCommand(undefined, { relationships: "REQ-1" });
    expect(logs).toStrictEqual([
      JSON.stringify(
        [{ type: "verified_by", from: "REQ-1", to: "TEST-1" }],
        null,
        2,
      ),
      JSON.stringify(
        [
          { type: "specified_by", from: "REQ-1", to: "SCEN-1" },
          { type: "verified_by", from: "REQ-1", to: "TEST-1" },
          { type: "relates_to", from: "REQ-1", to: "R" },
        ],
        null,
        2,
      ),
    ]);
  });

  test("treats a failed query as no relationships", async () => {
    stubRelationships({
      success: false,
      bindings: { Results: "[[specified_by,REQ-1,SCEN-1]]" },
    });
    await queryCommand(undefined, { relationships: "REQ-1", format: "json" });
    expect(logs).toStrictEqual(["[]"]);
  });

  test("prints relationships as a truncated table", async () => {
    stubRelationships({
      success: true,
      bindings: {
        Results: `[[specified_by,'REQ-ABCDEFGHIJKLMNOPQ',SCEN-ABCDEFGHIJKLMNOPQ],[implements,'REQ-ABCDEFGHIJKLMNOPQ','']]`,
      },
    });
    await queryCommand(undefined, {
      relationships: "REQ-ABCDEFGHIJKLMNOPQ",
      format: "table",
    });
    expect(stripAnsi(logs[0] ?? "")).toBe(
      [
        "┌────────────────────┬──────────────────┬──────────────────┐",
        "│ Type               │ From             │ To               │",
        "├────────────────────┼──────────────────┼──────────────────┤",
        "│ specified_by       │ REQ-ABCDEFGHIJKL │ SCEN-ABCDEFGHIJK │",
        "├────────────────────┼──────────────────┼──────────────────┤",
        "│ implements         │ REQ-ABCDEFGHIJKL │ N/A              │",
        "└────────────────────┴──────────────────┴──────────────────┘",
      ].join("\n"),
    );
  });
});

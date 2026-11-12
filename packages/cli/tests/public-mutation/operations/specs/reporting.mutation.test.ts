import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toPrologString } from "../../../../src/prolog/codec.js";
import * as entities from "../../../../src/public/operations/discovery-entities.js";
import * as discovery from "../../../../src/public/operations/discovery-executors.js";
import * as legacy from "../../../../src/public/operations/legacy-migration-plan.js";
import { buildMigrationPlan } from "../../../../src/public/operations/migration-plan.js";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../../../src/public/operations/runtime-types.js";
import {
  COVERAGE_ROW_PAGE_SIZE,
  currentProofBindingMode,
  executeCoverage,
  executeFindGaps,
  executeGraph,
  perContractTestBindings,
  readCoveragePages,
  withBranchName,
} from "../../../../src/public/operations/specs/reporting.js";
import { expectGolden } from "../../helpers/golden.js";

const roots: string[] = [];
const spies: { mockRestore: () => void }[] = [];
const savedMode = process.env.KIBI_PROOF_BINDING_MODE;
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
  if (savedMode === undefined)
    Reflect.deleteProperty(process.env, "KIBI_PROOF_BINDING_MODE");
  else process.env.KIBI_PROOF_BINDING_MODE = savedMode;
});

type Responder = (goal: string) => PrologQueryResult | undefined;

const json = (value: unknown): PrologQueryResult => ({
  success: true,
  bindings: { JsonString: JSON.stringify(value) },
});

function engine(respond: Responder) {
  const goals: string[] = [];
  const prolog = {
    oneShotMode: true,
    goals,
    async query(goal: string) {
      goals.push(goal);
      const answer = respond(goal);
      if (answer === undefined) throw new Error(`unexpected goal ${goal}`);
      return answer;
    },
  };
  return prolog as unknown as PrologPort & { goals: string[] };
}

function workspace(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-reporting-"));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(join(root, file, ".."), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return root;
}

function context(extra: Partial<OperationContext> = {}): OperationContext {
  return {
    workspaceRoot: workspace(),
    signal: new AbortController().signal,
    clock: () => new Date("2026-03-04T05:06:07.000Z"),
    ...extra,
  } as OperationContext;
}

/** The goal of an operation JSON query, without the module load. */
const goalOf = (goal: string) => goal.replace(/^\(use_module\('[^']*'\), /, "");

describe("withBranchName", () => {
  const attached = { branchAttachment: { kbBranch: "feature/x" } } as never;
  test("names the branch and keeps the store key", () => {
    expect(
      withBranchName(
        { meta: { branch: "abc123", n: 1 } as Record<string, unknown> },
        attached,
      ),
    ).toEqual({
      meta: { branch: "feature/x", n: 1, branchStoreKey: "abc123" },
    });
    expect(withBranchName({ meta: { branch: "unknown" } }, attached)).toEqual({
      meta: { branch: "feature/x" },
    });
    expect(
      withBranchName(
        { meta: { branch: 3 } as Record<string, unknown> },
        attached,
      ),
    ).toEqual({
      meta: { branch: "feature/x" },
    });
    expect(
      Object.keys(withBranchName({ meta: {} }, attached).meta ?? {}),
    ).toEqual(["branch"]);
  });

  test("leaves a payload it cannot or need not rename", () => {
    const payload = { meta: { branch: "feature/x" } };
    expect(withBranchName(payload, attached)).toBe(payload);
    const bare = { rows: [] } as { meta?: Record<string, unknown> };
    expect(withBranchName(bare, attached)).toBe(bare);
    const unattached = { meta: { branch: "abc" } };
    expect(withBranchName(unattached, {} as never)).toBe(unattached);
  });
});

describe("executeFindGaps", () => {
  test("asks discovery with each filter and its defaults", async () => {
    const prolog = engine(() => json({ rows: [], count: 0 }));
    await executeFindGaps({}, context({ prolog }));
    await executeFindGaps(
      {
        type: "req",
        missingRelationships: ["verified_by"],
        presentRelationships: ["specified_by"],
        tags: ["core"],
        sourceFile: "docs/",
        limit: 5,
        offset: 2,
      },
      context({ prolog }),
    );
    expect(prolog.goals.map(goalOf)).toEqual([
      "discovery:find_gaps_json(none, [], [], [], none, 100, 0, JsonString))",
      "discovery:find_gaps_json('req', ['verified_by'], ['specified_by'], ['core'], 'docs/', 5, 2, JsonString))",
    ]);
    expect(prolog.goals[0]).toMatch(
      /^\(use_module\('[^']*\/discovery\.pl'\), /,
    );
  });

  test("summarizes rows and provenance stubs", async () => {
    const run = async (payload: unknown) =>
      executeFindGaps(
        {},
        context({
          prolog: engine(() => json(payload)),
          branchAttachment: { kbBranch: "main" } as never,
        }),
      );
    expectGolden("reporting-find-gaps", {
      none: await run({ rows: [], count: 0 }),
      noRows: await run({ count: 0 }),
      stubs: await run({ count: 0, summary: { total: 0, provenanceStubs: 2 } }),
      rows: await run({
        rows: [{ id: "REQ-a" }, { id: "REQ-b" }],
        count: 7,
        summary: { total: 7, provenanceStubs: 1 },
        meta: { branch: "key" },
      }),
      uncounted: await run({ rows: [{ id: "REQ-a" }] }),
    });
  });

  test("rejects a bad type and wraps failures", async () => {
    await expect(executeFindGaps({ type: "story" }, context())).rejects.toThrow(
      "Invalid type 'story'. Valid types: req, scenario, test, adr, flag, event, symbol, fact. Use a single type value, or omit this parameter to query all entities.",
    );
    for (const type of [
      "req",
      "scenario",
      "test",
      "adr",
      "flag",
      "event",
      "symbol",
      "fact",
    ])
      await expect(executeFindGaps({ type }, context())).rejects.toThrow(
        "Find-gaps execution failed: Reporting operation requires a Prolog runtime",
      );
    const thrower = {
      oneShotMode: true,
      query: async () => {
        throw "plain";
      },
    } as unknown as PrologPort;
    await expect(
      executeFindGaps({}, context({ prolog: thrower })),
    ).rejects.toThrow("Find-gaps execution failed: plain");
    const failing = engine(() => ({
      success: false,
      bindings: {},
      error: "no",
    }));
    await expect(
      executeFindGaps({}, context({ prolog: failing })),
    ).rejects.toThrow(
      "Find-gaps execution failed: Find-gaps execution query failed: no",
    );
  });
});

describe("proof binding mode", () => {
  test("reads the opt-out from the environment", () => {
    Reflect.deleteProperty(process.env, "KIBI_PROOF_BINDING_MODE");
    expect(currentProofBindingMode()).toBe("per_contract");
    process.env.KIBI_PROOF_BINDING_MODE = " strict-snapshot ";
    expect(currentProofBindingMode()).toBe("strict_snapshot");
    process.env.KIBI_PROOF_BINDING_MODE = "strict";
    expect(currentProofBindingMode()).toBe("per_contract");
  });
});

describe("perContractTestBindings", () => {
  const props = (fields: Record<string, unknown>) =>
    `[${Object.entries(fields)
      .map(
        ([key, value]) =>
          `${key}=${toPrologString(typeof value === "string" ? value : JSON.stringify(value))}`,
      )
      .join(",")}]`;
  const contract = { version: "kibi.proof-contract.v1", integration: "bun" };
  const testRows = (rows: readonly [string, Record<string, unknown>][]) =>
    `[${rows.map(([id, fields]) => `['${id}',test,${props(fields)}]`).join(",")}]`;
  const setup = (
    rows: readonly [string, Record<string, unknown>][],
    files: Record<string, string> = {},
    withFs = true,
  ) => {
    const root = workspace(files);
    const prolog = engine((goal): PrologQueryResult | undefined => {
      if (goal.includes("kb_query_proof_contracts("))
        return { success: true, bindings: { Results: testRows(rows) } };
      if (goal.includes("kb_relationship(covered_by"))
        return {
          success: true,
          bindings: { Rels: "[['SYM-a','T-1',covered_by]]" },
        };
      return undefined;
    });
    const ctx = context({
      workspaceRoot: root,
      prolog,
      ...(withFs
        ? { fs: { readFile: (file: string) => readFile(file, "utf8") } }
        : {}),
    } as Partial<OperationContext>);
    return { ctx, prolog };
  };

  test("binds each readable test document once or twice", async () => {
    Reflect.deleteProperty(process.env, "KIBI_PROOF_BINDING_MODE");
    const doc = "---\nid: T-1\nproof_contract: {}\n---\nBody.\n";
    const linked =
      "---\nid: T-2\nlinks:\n  - type: validates\n    target: REQ-a\n---\nBody.\n";
    const { ctx, prolog } = setup(
      [
        ["T-1", { source: "tests/T-1.md", proof_contract: contract }],
        ["T-2", { source: "tests/T-2.md", proof_contract: contract }],
        ["T-3", { source: "tests/T-3.ts", proof_contract: contract }],
        ["T-4", { source: "tests/T-4.md" }],
        ["", { source: "tests/T-1.md", proof_contract: contract }],
      ],
      { "tests/T-1.md": doc, "tests/T-2.md": linked },
    );
    const value = await perContractTestBindings(ctx);
    expect(value).toMatch(
      /^_\{'T-1': '[0-9a-f]{64}', 'T-2': \['[0-9a-f]{64}', '[0-9a-f]{64}'\]\}$/,
    );
    expect(prolog.goals.some((goal) => goal.includes("covered_by"))).toBe(true);
    const { ctx: noFs } = setup(
      [["T-1", { source: "tests/T-1.md", proof_contract: contract }]],
      { "tests/T-1.md": doc },
      false,
    );
    expect(await perContractTestBindings(noFs)).toBeNull();
  });

  test("carries each test's current fingerprint components under the reserved key", async () => {
    Reflect.deleteProperty(process.env, "KIBI_PROOF_BINDING_MODE");
    const doc = "---\nid: T-1\nproof_contract: {}\n---\nBody.\n";
    const fingerprintContract = {
      version: "kibi.proof-contract.v1",
      integration: "bun",
      required_proofs: [{ symbol_id: "SYM-a", target: "default" }],
      success_policy: "all_required_first_attempt",
    };
    const integrations = JSON.stringify({
      version: "kibi.proof-integration.v1",
      integrations: [{ id: "bun", producer: "bun", command: ["bun", "test"] }],
    });
    const rows: [string, Record<string, unknown>][] = [
      ["T-1", { source: "tests/T-1.md", proof_contract: fingerprintContract }],
      ["T-2", { source: "tests/T-1.md", proof_contract: contract }],
    ];
    const { ctx } = setup(rows, {
      "tests/T-1.md": doc,
      ".kb/proof/integrations.json": integrations,
    });
    const value = await perContractTestBindings(ctx);
    const hex = "'[0-9a-f]{64}'";
    const components = ["contract", "integration", "command", "bindings", "producer"]
      .map((name) => `${name}: ${hex}`)
      .join(", ");
    expect(value).toMatch(
      new RegExp(
        `^_\\{'T-1': ${hex}, 'T-2': ${hex}, '\\$fingerprint_components': _\\{'T-1': _\\{${components}\\}, 'T-2': _\\{${components}\\}\\}\\}$`,
      ),
    );
    const { ctx: unconfigured } = setup(rows, { "tests/T-1.md": doc });
    expect(await perContractTestBindings(unconfigured)).toMatch(
      /^_\{'T-1': '[0-9a-f]{64}', 'T-2': '[0-9a-f]{64}'\}$/,
    );
  });

  test("skips a test whose id is not text", async () => {
    Reflect.deleteProperty(process.env, "KIBI_PROOF_BINDING_MODE");
    const doc = "---\nid: T-1\nproof_contract: {}\n---\nBody.\n";
    const { ctx } = setup([], { "tests/T-1.md": doc });
    spies.push(
      spyOn(entities, "loadEntities").mockResolvedValue([
        { id: 7, source: "tests/T-1.md", proof_contract: contract },
      ]),
    );
    expect(await perContractTestBindings(ctx)).toBeNull();
  });

  test("skips the store in strict mode and with no tests", async () => {
    process.env.KIBI_PROOF_BINDING_MODE = "strict-snapshot";
    const strict = setup([]);
    expect(await perContractTestBindings(strict.ctx)).toBeNull();
    expect(strict.prolog.goals).toEqual([]);
    Reflect.deleteProperty(process.env, "KIBI_PROOF_BINDING_MODE");
    const empty = setup([]);
    expect(await perContractTestBindings(empty.ctx)).toBeNull();
    expect(empty.prolog.goals.some((goal) => goal.includes("covered_by"))).toBe(
      false,
    );
  });

  test("surfaces an engine that cannot list tests", async () => {
    Reflect.deleteProperty(process.env, "KIBI_PROOF_BINDING_MODE");
    const down = engine(() => ({
      success: false,
      bindings: {},
      error: "gone",
    }));
    await expect(
      perContractTestBindings(context({ prolog: down })),
    ).rejects.toThrow("Per-contract receipt binding query failed: gone");
    const thrower = {
      query: async () => {
        throw "plain";
      },
    } as unknown as PrologPort;
    await expect(
      perContractTestBindings(context({ prolog: thrower })),
    ).rejects.toThrow("Per-contract receipt binding query failed: plain");
  });
});

describe("readCoveragePages", () => {
  const rows = (count: number, from: number) =>
    Array.from({ length: count }, (_, index) => ({ id: `R-${from + index}` }));
  const pager = (total: number) =>
    engine((goal) => {
      const [, limit, offset] = /page\((\d+), (\d+)\)/.exec(
        goal,
      ) as unknown as [string, string, string];
      const start = Number(offset);
      return json({
        summary: { total },
        rows: rows(Math.max(0, Math.min(Number(limit), total - start)), start),
      });
    });
  const goalFor = (limit: number, offset: number) =>
    `page(${limit}, ${offset})`;
  const pagesOf = (prolog: { goals: string[] }) =>
    prolog.goals.map((goal) => /page\(\d+, \d+\)/.exec(goal)?.[0]);

  test("reads small requests at once and larger ones in pages", async () => {
    expect(COVERAGE_ROW_PAGE_SIZE).toBe(10);
    const small = pager(50);
    expect((await readCoveragePages(small, goalFor, 10, 3)).rows).toHaveLength(
      10,
    );
    expect(pagesOf(small)).toEqual(["page(10, 3)"]);
    expect(small.goals[0]).toContain("/discovery.pl'), page(10, 3)");
    const broken = engine(() => ({
      success: false,
      bindings: {},
      error: "no",
    }));
    await expect(readCoveragePages(broken, goalFor, 1, 0)).rejects.toThrow(
      "Coverage execution query failed: no",
    );
    const large = pager(50);
    const read = await readCoveragePages(large, goalFor, 25, 5);
    expect(read.rows).toEqual(rows(25, 5));
    expect(read.summary).toEqual({ total: 50 });
    expect(pagesOf(large)).toEqual([
      "page(10, 5)",
      "page(10, 15)",
      "page(5, 25)",
    ]);
    const short = pager(17);
    expect((await readCoveragePages(short, goalFor, 40, 0)).rows).toEqual(
      rows(17, 0),
    );
    expect(pagesOf(short)).toEqual(["page(10, 0)", "page(10, 10)"]);
    const exact = pager(20);
    expect((await readCoveragePages(exact, goalFor, 40, 0)).rows).toHaveLength(
      20,
    );
    expect(pagesOf(exact)).toEqual([
      "page(10, 0)",
      "page(10, 10)",
      "page(10, 20)",
    ]);
    const first = pager(5);
    expect((await readCoveragePages(first, goalFor, 11, 0)).rows).toHaveLength(
      5,
    );
    expect(pagesOf(first)).toEqual(["page(10, 0)"]);
  });
});

describe("executeCoverage", () => {
  const payload = {
    summary: { total: 3, fullyCovered: 1, proofTested: 2 },
    rows: [
      {
        id: "REQ-a",
        proofStatus: "missing",
        proofGaps: ["missing_logic_claims"],
        proofRepairs: [
          {
            gap: "missing_logic_claims",
            priority: 30,
            stage: "logic_grounding",
            action: "Ground the claims.",
          },
        ],
      },
    ],
    meta: { snapshotId: "snap-9", scopeComplete: false, branch: "key" },
  };
  const coverageEngine = (answer: unknown = payload) =>
    engine((goal) => {
      if (goal.includes("coverage_report_json")) return json(answer);
      if (goal.includes("kb_query_proof_contracts("))
        return { success: true, bindings: { Results: "[]" } };
      return { success: true, bindings: {} };
    });
  const snapshotGit = {
    workspaceSnapshot: async () => ({
      version: "kibi.workspace-snapshot.v2",
      hash: "f".repeat(64),
      dirty: true,
      fileCount: 3,
    }),
  };
  const statusFails = (message: string) =>
    spies.push(
      spyOn(discovery, "executeStatus").mockRejectedValue(new Error(message)),
    );
  const statusPlan = () =>
    spies.push(
      spyOn(discovery, "executeStatus").mockResolvedValue({
        content: [],
        structuredContent: {
          migrationPlan: buildMigrationPlan({
            expected: { branch: "main" },
            evaluatedDomains: ["branch"],
          }),
        },
      } as never),
    );
  const coverageGoals = (prolog: { goals: string[] }) =>
    prolog.goals
      .filter((goal) => goal.includes("coverage_report_json"))
      .map(goalOf);

  test("builds each coverage goal", async () => {
    statusFails("Failed to resolve active branch");
    process.env.KIBI_PROOF_BINDING_MODE = "strict-snapshot";
    const plain = coverageEngine();
    await executeCoverage({}, context({ prolog: plain }));
    await executeCoverage(
      {
        by: "symbol",
        tags: ["core"],
        includePassing: true,
        includeTransitive: false,
        limit: 4,
        offset: 1,
      },
      context({ prolog: plain, git: snapshotGit } as never),
    );
    await executeCoverage(
      { statuses: ["tested", "missing", "unresolved", "not_applicable"] },
      context({ prolog: plain }),
    );
    expect(coverageGoals(plain)).toEqual([
      "discovery:coverage_report_json('req', [], false, true, 10, 0, 'unknown', '2026-03-04T05:06:07.000Z', 604800, JsonString))",
      `discovery:coverage_report_json('symbol', ['core'], true, false, 4, 1, '${"f".repeat(64)}', '2026-03-04T05:06:07.000Z', 604800, JsonString))`,
      "discovery:coverage_report_json('req', [], false, ['tested','missing','unresolved','not_applicable'], true, 10, 0, 'unknown', '2026-03-04T05:06:07.000Z', 604800, JsonString))",
    ]);
    Reflect.deleteProperty(process.env, "KIBI_PROOF_BINDING_MODE");
    const bound = engine((goal) => {
      if (goal.includes("coverage_report_json")) return json(payload);
      if (goal.includes("kb_query_proof_contracts("))
        return {
          success: true,
          bindings: {
            Results: `[['T-1',test,[source="tests/T-1.md",proof_contract=${toPrologString(JSON.stringify({ version: "v" }))}]]]`,
          },
        };
      return { success: true, bindings: {} };
    });
    const root = workspace({ "tests/T-1.md": "---\nid: T-1\n---\nBody.\n" });
    const withFs = (extra: Partial<OperationContext> = {}) =>
      context({
        workspaceRoot: root,
        prolog: bound,
        fs: { readFile: (file: string) => readFile(file, "utf8") },
        ...extra,
      } as Partial<OperationContext>);
    await executeCoverage({ limit: 3 }, withFs());
    await executeCoverage({ limit: 3, statuses: ["tested"] }, withFs());
    await executeCoverage({ limit: 3, by: "type" }, withFs());
    const [perContract, filtered, byType] = coverageGoals(bound).map((goal) =>
      goal.replace(/'[0-9a-f]{64}'/g, "HASH"),
    );
    expect([perContract, filtered, byType]).toEqual([
      "discovery:coverage_report_json('req', [], false, per_contract, _{'T-1': HASH}, true, 3, 0, 'unknown', '2026-03-04T05:06:07.000Z', 604800, JsonString))",
      "discovery:coverage_report_json('req', [], false, ['tested'], per_contract, _{'T-1': HASH}, true, 3, 0, 'unknown', '2026-03-04T05:06:07.000Z', 604800, JsonString))",
      "discovery:coverage_report_json('type', [], false, true, 3, 0, 'unknown', '2026-03-04T05:06:07.000Z', 604800, JsonString))",
    ]);
  });

  test("rejects an unknown status", async () => {
    await expect(
      executeCoverage({ statuses: ["tested", "done"] }, context()),
    ).rejects.toThrow(
      "Coverage execution failed: Invalid coverage status 'done'. Valid statuses: tested, missing, unresolved, not_applicable.",
    );
  });

  test("assembles the report, its plans and its proof snapshot", async () => {
    process.env.KIBI_PROOF_BINDING_MODE = "strict-snapshot";
    statusFails("Failed to resolve active branch");
    const unattached = await executeCoverage(
      {},
      context({ prolog: coverageEngine() }),
    );
    expectGolden("reporting-coverage-unattached", unattached);
    for (const spy of spies.splice(0)) spy.mockRestore();
    statusPlan();
    const attached = await executeCoverage(
      { by: "symbol" },
      context({
        prolog: coverageEngine({
          summary: {},
          rows: [],
          meta: { snapshotId: 4 },
        }),
        git: snapshotGit,
        branchAttachment: { gitBranch: "main", kbBranch: "main" },
      } as never),
    );
    expectGolden("reporting-coverage-attached", attached);
    const failingSnapshot = await executeCoverage(
      { by: "type" },
      context({
        prolog: coverageEngine({ summary: { total: 1 }, rows: [] }),
        git: {
          workspaceSnapshot: async () => {
            throw new Error("no tree");
          },
        },
      } as never),
    );
    expect(failingSnapshot.structuredContent?.meta).toEqual({
      proofReceiptMaxAgeSeconds: 604800,
      proofSnapshot: "unknown",
      proofSnapshotAvailable: false,
      proofSnapshotError: "no tree",
    });
    expect(failingSnapshot.content[0]?.text).toBe(
      "Coverage summary: 0 structurally covered and 0 tested end to end out of 1.",
    );
    expect(Object.keys(failingSnapshot.structuredContent ?? {})).toEqual([
      "summary",
      "rows",
      "migrationPlan",
      "meta",
    ]);
  });

  test("lets a status failure other than a missing branch through", async () => {
    statusFails("store corrupt");
    await expect(
      executeCoverage({}, context({ prolog: coverageEngine() })),
    ).rejects.toThrow("Coverage execution failed: store corrupt");
    for (const spy of spies.splice(0)) spy.mockRestore();
    spies.push(
      spyOn(discovery, "executeStatus").mockImplementation(() => {
        throw "plain";
      }),
    );
    await expect(
      executeCoverage({ by: "type" }, context({ prolog: coverageEngine() })),
    ).rejects.toThrow("Coverage execution failed: plain");
  });

  test("previews legacy migration only on request", async () => {
    process.env.KIBI_PROOF_BINDING_MODE = "strict-snapshot";
    statusFails("Failed to resolve active branch");
    const preview = spyOn(
      legacy,
      "buildLegacyMigrationPlanFromContext",
    ).mockResolvedValue({ version: "preview" } as never);
    spies.push(preview);
    const run = (input: Record<string, unknown>) =>
      executeCoverage(input, context({ prolog: coverageEngine() })).then(
        (result) =>
          Object.keys(result.structuredContent ?? {}).includes(
            "legacyMigrationPlan",
          ),
      );
    expect(await run({})).toBe(false);
    expect(await run({ includeMigrationPreview: false })).toBe(false);
    expect(await run({ includeMigrationPreview: true })).toBe(true);
    expect(await run({ includeMigrationPreview: true, by: "type" })).toBe(
      false,
    );
    expect(preview).toHaveBeenCalledTimes(1);
    const [plan, input, snapshot] = preview.mock.calls[0] as unknown[];
    expect([
      (plan as { version?: unknown }).version !== undefined,
      input,
      snapshot,
    ]).toEqual([true, { includeMigrationPreview: true }, "unknown"]);
  });
});

describe("executeGraph", () => {
  test("bounds the depth", async () => {
    for (const depth of [0, 6, -1])
      await expect(
        executeGraph({ seedIds: ["A"], depth }, context()),
      ).rejects.toThrow(new RangeError("Graph depth must be between 1 and 5"));
    const prolog = engine(() => json({ nodes: [], edges: [] }));
    for (const depth of [1, 5])
      await executeGraph({ seedIds: ["A"], depth }, context({ prolog }));
    expect(prolog.goals).toHaveLength(2);
    expect(prolog.goals[0]).toMatch(
      /^\(use_module\('[^']*\/discovery\.pl'\), /,
    );
  });

  test("asks for the traversal with each option and its defaults", async () => {
    const prolog = engine(() => json({ nodes: [], edges: [] }));
    await executeGraph({ seedIds: ["A", "B"] }, context({ prolog }));
    await executeGraph(
      {
        seedIds: ["A"],
        relationships: ["implements"],
        direction: "both",
        depth: 3,
        entityTypes: ["req"],
        maxNodes: 7,
        maxEdges: 9,
      },
      context({ prolog }),
    );
    expect(prolog.goals.map(goalOf)).toEqual([
      "discovery:graph_expand_json(['A','B'], [], 'outgoing', 1, [], 200, 500, JsonString))",
      "discovery:graph_expand_json(['A'], ['implements'], 'both', 3, ['req'], 7, 9, JsonString))",
    ]);
  });

  test("summarizes the traversal and wraps failures", async () => {
    const run = (payload: unknown) =>
      executeGraph(
        { seedIds: ["A", "B"] },
        context({
          prolog: engine(() => json(payload)),
          branchAttachment: { kbBranch: "main" } as never,
        }),
      );
    expectGolden("reporting-graph", {
      empty: await run({ nodes: [], edges: [] }),
      missing: await run({}),
      nodes: await run({
        nodes: [{ id: "A" }, { id: "B" }],
        edges: [{ from: "A", to: "B" }],
        truncated: false,
        meta: { branch: "key" },
      }),
      noEdges: await run({ nodes: [{ id: "A" }] }),
    });
    await expect(executeGraph({ seedIds: ["A"] }, context())).rejects.toThrow(
      "Graph execution failed: Reporting operation requires a Prolog runtime",
    );
    const thrower = {
      oneShotMode: true,
      query: async () => {
        throw "plain";
      },
    } as unknown as PrologPort;
    await expect(
      executeGraph({ seedIds: ["A"] }, context({ prolog: thrower })),
    ).rejects.toThrow("Graph execution failed: plain");
    const failing = engine(() => ({
      success: false,
      bindings: {},
      error: "no",
    }));
    await expect(
      executeGraph({ seedIds: ["A"] }, context({ prolog: failing })),
    ).rejects.toThrow(
      "Graph execution failed: Graph execution query failed: no",
    );
  });
});

describe("executeCoverage details", () => {
  const missingRow = {
    id: "REQ-m",
    proofStatus: "unresolved",
    proofGaps: [],
    proofRepairs: [],
    proofStages: { sourceCoordinates: { missingSymbols: ["SYM-gone"] } },
  };
  const answer = (value: unknown) =>
    engine((goal) =>
      goal.includes("coverage_report_json")
        ? json(value)
        : { success: true, bindings: {} },
    );
  const strict = () => {
    process.env.KIBI_PROOF_BINDING_MODE = "strict-snapshot";
  };

  test("adds coordinate evidence to requirement rows only", async () => {
    strict();
    spies.push(
      spyOn(discovery, "executeStatus").mockResolvedValue({
        content: [],
      } as never),
    );
    const rowsOf = async (by: "req" | "symbol" | "type") =>
      (
        await executeCoverage(
          { by },
          context({ prolog: answer({ summary: {}, rows: [missingRow] }) }),
        )
      ).structuredContent?.rows;
    const byDefault = (
      await executeCoverage(
        {},
        context({ prolog: answer({ summary: {}, rows: [missingRow] }) }),
      )
    ).structuredContent?.rows;
    expect(byDefault).toEqual(await rowsOf("req"));
    expectGolden("reporting-coverage-coordinates", {
      req: await rowsOf("req"),
      symbol: await rowsOf("symbol"),
      type: await rowsOf("type"),
    });
  });

  test("plans symbol repairs and names the expected branch", async () => {
    strict();
    spies.push(
      spyOn(discovery, "executeStatus").mockRejectedValue(
        new Error("Failed to resolve active branch"),
      ),
    );
    const result = await executeCoverage(
      { by: "symbol" },
      context({
        prolog: answer({ rows: [{ id: "SYM-a", coverage: 0 }] }),
        branchAttachment: { gitBranch: "dev", kbBranch: "kb-dev" },
      } as never),
    );
    expect(Object.keys(result.structuredContent ?? {})).toContain(
      "symbolRepairPlan",
    );
    expect(result.structuredContent?.migrationPlan?.expected).toMatchObject({
      branch: "dev",
      kbBranch: "kb-dev",
    });
    expect(result.content[0]?.text).toBe(
      "Coverage summary: 0 structurally covered and 0 tested end to end out of 0.",
    );
    expectGolden("reporting-coverage-symbol", result.structuredContent);
  });
});

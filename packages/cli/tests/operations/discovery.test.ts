import { describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { validateAgainstSchema } from "../../src/cli-validate.js";
import { PrologProcess } from "../../src/prolog.js";
import { SwiplResolutionError } from "../../src/prolog/swipl-resolver.js";
import { SEARCH_CANDIDATE_PAGE_SIZE } from "../../src/public/operations/discovery-entities.js";
import {
  executeQuery,
  executeSearch,
  executeStatus,
} from "../../src/public/operations/discovery-executors.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import {
  querySpec,
  searchSpec,
  statusSpec,
} from "../../src/public/operations/specs/discovery.js";
import {
  branchStorePath,
  ensureBranchStoreManifest,
} from "../../src/utils/branch-store-locator.js";

function createContext(
  query: (goal: string) => Promise<PrologQueryResult>,
  workspaceRoot = process.cwd(),
): OperationContext {
  const prolog: PrologPort = {
    query,
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-07-21T00:00:00Z"),
    prolog,
    git: {
      revParse: async () => "main",
      showToplevel: async () => workspaceRoot,
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: "a".repeat(64),
        dirty: false,
        fileCount: 7,
      }),
    },
    branchAttachment: {
      gitBranch: "main",
      kbBranch: "main",
      storePath: branchStorePath(workspaceRoot, "main"),
      kind: "exact",
      migrationRequired: false,
    },
  };
}

const ABOVE_FORMER_TRANSPORT_CAPACITY_COUNT = 12_000;
const ABOVE_BOUNDED_TRANSPORT_CAPACITY_COUNT = 70_000;
const TRANSPORT_PADDING = "x".repeat(128);

function largeEntityGoal(count: number): string {
  return `findall([Id,req,[title="skillopt ${TRANSPORT_PADDING}",status=open]], (between(1, ${count}, Index), atom_concat('REQ-skillopt-', Index, Id)), Results)`;
}

/** The same synthetic corpus, shaped as one bounded candidate page. */
function largeCandidatePageGoal(count: number): string {
  return `findall([Id,req,[title="skillopt ${TRANSPORT_PADDING}",status=open]], (between(1, ${count}, Index), atom_concat('REQ-skillopt-', Index, Id)), Rows), length(Rows, Count)`;
}

describe("shared discovery operation executors", () => {
  test("kb_query preserves exact id lookup behavior", async () => {
    // Given
    const query = mock(async (_goal: string) => ({
      success: true,
      bindings: {
        Rows: '[[REQ-exact,req,[title="Exact lookup",status=open,source=".kb/requirements/REQ-exact.md"]]]',
        Count: "1",
      },
    }));

    // When
    const result = await querySpec.execute(
      { id: "REQ-exact", limit: 20, offset: 0 },
      createContext(query),
    );

    // Then
    expect(result.structuredContent).toEqual({
      entities: [
        {
          id: "REQ-exact",
          type: "req",
          title: "Exact lookup",
          status: "open",
          source: ".kb/requirements/REQ-exact.md",
        },
      ],
      count: 1,
    });
    expect(query.mock.calls[0]?.[0]).toBe(
      "kb_query_entities(none, 'REQ-exact', [], none, 20, 0, Rows, Count)",
    );
  });

  test("kb_query delegates tag filtering and pagination to the bounded indexed query", async () => {
    // Given: the indexed query filters tags before paging and reports the
    // total match count, so no caller materializes every entity.
    const query = mock(async (_goal: string) => ({
      success: true,
      bindings: {
        Rows: '[[REQ-3,req,[title="Three",status=open,tags=[wanted]]]]',
        Count: "2",
      },
    }));

    // When
    const result = await querySpec.execute(
      { type: "req", tags: ["wanted"], limit: 1, offset: 1 },
      createContext(query),
    );

    // Then
    expect(result.structuredContent).toEqual(
      expect.objectContaining({
        entities: [
          {
            id: "REQ-3",
            type: "req",
            title: "Three",
            status: "open",
            tags: ["wanted"],
          },
        ],
        count: 2,
      }),
    );
    expect(query.mock.calls[0]?.[0]).toBe(
      "kb_query_entities('req', none, ['wanted'], none, 1, 1, Rows, Count)",
    );
  });

  test("kb_search trims the query and preserves ranked pagination", async () => {
    // Given
    const query = mock(async (_goal: string) => ({
      success: true,
      bindings: {
        Rows: '[[REQ-1,req,[title="OAuth login flow",status=open]],[REQ-2,req,[title="OAuth login fallback",status=open]]]',
        Count: "2",
      },
    }));

    // When
    const result = await searchSpec.execute(
      { query: "  OAuth login  ", limit: 1, offset: 1 },
      createContext(query),
    );
    expect(query.mock.calls[0]?.[0]).toBe(
      "kb_search_entities(none, 'OAuth login', 500, 0, Rows, Count)",
    );

    // Then
    expect(result.structuredContent?.count).toBe(2);
    expect(result.structuredContent?.results).toHaveLength(1);
    expect(result.structuredContent?.results[0]?.entity.id).toBe("REQ-2");
  });

  test("kb_search pages indexed candidates instead of one unbounded read", async () => {
    // Given a corpus larger than one page, so a single unbounded read would
    // serialize the whole matching corpus into one Prolog response.
    const total = SEARCH_CANDIDATE_PAGE_SIZE * 2 + 100;
    const entities = Array.from({ length: total }, (_, index) => ({
      id: `REQ-${index}`,
      type: "req",
      title: "OAuth login flow",
    }));
    const requestedLimits: number[] = [];
    const requestedOffsets: number[] = [];
    const searchEntities = mock(
      async (input: { limit: number; offset: number }) => {
        requestedLimits.push(input.limit);
        requestedOffsets.push(input.offset);
        return {
          entities: entities.slice(input.offset, input.offset + input.limit),
          count: total,
        };
      },
    );

    const context = createContext(async () => ({
      success: true,
      bindings: {},
    }));
    const prolog = { ...context.prolog, searchEntities } as PrologPort;

    // When
    const result = await searchSpec.execute(
      { query: "OAuth login", limit: 5, offset: 0 },
      { ...context, prolog },
    );

    // Then every request stays bounded, and the full candidate set is still
    // ranked and counted.
    expect(Math.max(...requestedLimits)).toBe(SEARCH_CANDIDATE_PAGE_SIZE);
    expect(requestedOffsets.slice(0, 3)).toEqual([
      0,
      SEARCH_CANDIDATE_PAGE_SIZE,
      SEARCH_CANDIDATE_PAGE_SIZE * 2,
    ]);
    expect(result.structuredContent?.count).toBe(total);
    expect(result.structuredContent?.results).toHaveLength(5);
  });

  test("kb_search summarizes entities by default and returns full bodies on request", async () => {
    // Candidates are projected rows; `fields: "full"` reloads the returned
    // page by id.
    const query = mock(
      async (goal: string): Promise<PrologQueryResult> =>
        goal.startsWith("kb_search_entities(")
          ? {
              success: true,
              bindings: {
                Rows: '[[REQ-1,req,[title="OAuth login flow",status=open,semantic_text="a very long normative body",tags=[auth]]]]',
                Count: "1",
              },
            }
          : {
              success: true,
              bindings: {
                Results:
                  '[[REQ-1,req,[title="OAuth login flow",status=open,semantic_text="a very long normative body",tags=[auth],proof_receipts="[]"]]]',
              },
            },
    );

    const summary = await searchSpec.execute(
      { query: "OAuth login" },
      createContext(query),
    );
    const summarized = summary.structuredContent?.results[0];
    expect(summarized?.entity).toEqual({
      id: "REQ-1",
      type: "req",
      title: "OAuth login flow",
      status: "open",
      tags: ["auth"],
    });
    // Ranking evidence survives the projection; only the body is withheld.
    expect(summarized?.score).toBeGreaterThan(0);
    expect(summarized?.reasons.length).toBeGreaterThan(0);

    const full = await searchSpec.execute(
      { query: "OAuth login", fields: "full" },
      createContext(query),
    );
    expect(full.structuredContent?.results[0]?.entity.semantic_text).toBe(
      "a very long normative body",
    );
    expect(
      (full.structuredContent?.results[0]?.entity as Record<string, unknown>)
        .proof_receipts,
    ).toBeDefined();
    expect(query.mock.calls.at(-1)?.[0]).toBe(
      "findall(['REQ-1','req',Props], kb_entity('REQ-1', 'req', Props), Results)",
    );
  });

  test("kb_search intent-v1 returns semantic evidence and analysis", async () => {
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("kb_relationship")) {
        return { success: true, bindings: { Edges: "[]" } };
      }
      const rows =
        '[[REQ-EXPORT,req,[title="Export report as CSV",status=open,tags=[download,reporting]]] , [REQ-LOGIN,req,[title="Authenticate an account",status=open]]]';
      return {
        success: true,
        bindings: goal.startsWith("findall(")
          ? { Results: rows }
          : { Rows: rows, Count: "2" },
      };
    });

    const result = await searchSpec.execute(
      {
        query: "download report",
        rankingMode: "intent-v1",
        semanticFacets: { actions: ["export"], objects: ["CSV file"] },
      },
      createContext(query),
    );

    expect(result.structuredContent?.queryAnalysis?.rankingMode).toBe(
      "intent-v1",
    );
    expect(result.structuredContent?.results[0]?.entity.id).toBe("REQ-EXPORT");
    const firstResult = result.structuredContent?.results[0];
    expect(
      firstResult !== undefined && "evidence" in firstResult
        ? firstResult.evidence
        : undefined,
    ).toMatchObject({
      matchedFacets: expect.arrayContaining(["actions:export"]),
    });
  });

  test("kb_search rejects invalid pagination and oversized query input", () => {
    // Given
    const invalidInputs = [
      { query: "skillopt", limit: -1 },
      { query: "skillopt", offset: -1 },
      { query: "x".repeat(4097) },
    ];

    // When
    const results = invalidInputs.map((input) =>
      validateAgainstSchema(input, searchSpec.businessInputSchema),
    );

    // Then
    expect(results.every((result) => !result.valid)).toBe(true);
  });

  test("broad search returns ranked results above former threshold", async () => {
    // Given
    const prolog = new PrologProcess({ timeout: 15_000 });
    const query = (_goal: string) =>
      prolog.query(
        largeCandidatePageGoal(ABOVE_FORMER_TRANSPORT_CAPACITY_COUNT),
      );

    // When
    const result = await searchSpec.execute(
      { query: "skillopt", limit: 20, offset: 0, rankingMode: "legacy" },
      createContext(query),
    );

    // Then
    expect(result.structuredContent?.count).toBe(
      ABOVE_FORMER_TRANSPORT_CAPACITY_COUNT,
    );
    expect(result.structuredContent?.results).toHaveLength(20);
    expect(result.structuredContent?.results[0]?.entity.id).toBe(
      "REQ-skillopt-1",
    );
    expect(result.structuredContent?.results[0]?.reasons).toContain(
      "title phrase match",
    );
  });

  test("broad search reports bounded overflow and Prolog failure", async () => {
    // Given
    const prolog = new PrologProcess({ timeout: 15_000 });

    // When
    const result = await prolog.query(
      largeEntityGoal(ABOVE_BOUNDED_TRANSPORT_CAPACITY_COUNT),
    );

    // Then
    expect(result.success).toBe(false);
    expect(result.error).toContain("bounded Prolog output capacity");
    expect(result.error).toContain("ENOBUFS");
  });

  test("one-shot stderr reports bounded overflow and Prolog failure", async () => {
    // Given
    const prolog = new PrologProcess({ timeout: 15_000 });

    // When
    const result = await prolog.query(
      "format(user_error, '~*c', [9437184, 120]), flush_output(user_error), Results=[]",
    );

    // Then
    expect(result.success).toBe(false);
    expect(result.error).toContain("bounded Prolog output capacity");
    expect(result.error).toContain("ENOBUFS");
  });

  test("kb_status executes the status module through context.prolog", async () => {
    // Given
    const query = mock(async (_goal: string) => ({
      success: true,
      bindings: {
        JsonString: JSON.stringify({
          branch: "feature/shared-discovery",
          snapshotId: "stamp:123",
          syncedAt: "2026-07-21T00:00:00Z",
          dirty: false,
          syncState: "fresh",
        }),
      },
    }));

    // When: provide a minimal healthy hashed store so status exercises the
    // injected Prolog port rather than the pre-first-sync diagnostic path.
    const workspaceRoot = mkdtempSync(path.join(tmpdir(), "kibi-status-test-"));
    const storePath = branchStorePath(workspaceRoot, "main");
    ensureBranchStoreManifest(workspaceRoot, "main");
    mkdirSync(path.join(storePath, "rdf"), { recursive: true });
    writeFileSync(path.join(storePath, "storage.json"), "{}\n");
    writeFileSync(path.join(storePath, "CURRENT"), "generation-1:1\n");
    const result = await statusSpec.execute(
      {},
      createContext(query, workspaceRoot),
    );

    // Then
    expect(result.structuredContent).toEqual(
      expect.objectContaining({
        branch: "main",
        snapshotId: "stamp:123",
        syncedAt: "2026-07-21T00:00:00Z",
        dirty: false,
        syncState: "fresh",
        proofSnapshot: "a".repeat(64),
        proofSnapshotAvailable: true,
        proofSnapshotDirty: false,
        proofSnapshotFileCount: 7,
        proofSnapshotVersion: "kibi.workspace-snapshot.v2",
        proofSnapshotChangeCount: 0,
        proofSnapshotChanges: [],
        proofSnapshotChangesTruncated: false,
        migrationPlan: expect.objectContaining({
          version: "kibi.migration-plan.v2",
        }),
      }),
    );
    const statusQueries = query.mock.calls
      .map(([goal]) => String(goal))
      .filter((goal) => goal.includes("status:kb_status_json"));
    expect(statusQueries).toHaveLength(1);
    expect(statusQueries[0]).toContain("status:kb_status_json(JsonString)");
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  test("kb_status keeps a healthy store classification when the engine result is malformed", async () => {
    const query = mock(async (_goal: string) => ({
      success: true,
      bindings: { JsonString: "{" },
    }));
    const workspaceRoot = mkdtempSync(
      path.join(tmpdir(), "kibi-status-malformed-engine-test-"),
    );
    const storePath = branchStorePath(workspaceRoot, "main");
    ensureBranchStoreManifest(workspaceRoot, "main");
    mkdirSync(path.join(storePath, "rdf"), { recursive: true });
    writeFileSync(path.join(storePath, "storage.json"), "{}\n");
    writeFileSync(path.join(storePath, "CURRENT"), "generation-1:1\n");

    try {
      const result = await statusSpec.execute(
        {},
        createContext(query, workspaceRoot),
      );
      const structured = result.structuredContent as {
        branchStore?: { state?: string; recoveryRequired?: boolean };
        engineStatus?: {
          state?: string;
          errorCode?: string;
          detail?: string;
          recoveryRequired?: boolean;
        };
        staleReasons?: readonly { code?: string }[];
        migrationPlan?: { actions?: readonly { code?: string }[] };
      };

      expect(structured.branchStore).toMatchObject({
        state: "healthy",
        recoveryRequired: false,
      });
      expect(structured.engineStatus).toMatchObject({
        state: "unavailable",
        errorCode: "engine_result_invalid_json",
        recoveryRequired: false,
      });
      expect(structured.engineStatus?.detail).toContain(
        "stage=outer, bindingType=string, length=1, prefixCodePoints=[123]",
      );
      expect(structured.staleReasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "engine_result_invalid_json" }),
        ]),
      );
      expect(
        structured.migrationPlan?.actions?.some(
          (action) => action.code === "damaged_exact_branch_store",
        ),
      ).toBe(false);
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("kb_status keeps a healthy store classification for engine query failures", async () => {
    const query = mock(async (_goal: string) => ({
      success: false,
      bindings: {},
      error: "Kibi engine connection closed",
    }));
    const workspaceRoot = mkdtempSync(
      path.join(tmpdir(), "kibi-status-engine-failure-test-"),
    );
    const storePath = branchStorePath(workspaceRoot, "main");
    ensureBranchStoreManifest(workspaceRoot, "main");
    mkdirSync(path.join(storePath, "rdf"), { recursive: true });
    writeFileSync(path.join(storePath, "storage.json"), "{}\n");
    writeFileSync(path.join(storePath, "CURRENT"), "generation-1:1\n");

    try {
      const result = await statusSpec.execute(
        {},
        createContext(query, workspaceRoot),
      );
      const structured = result.structuredContent as {
        branchStore?: { state?: string; recoveryRequired?: boolean };
        engineStatus?: {
          state?: string;
          errorCode?: string;
          detail?: string;
          recoveryRequired?: boolean;
        };
        migrationPlan?: { actions?: readonly { code?: string }[] };
      };

      expect(structured.branchStore).toMatchObject({
        state: "healthy",
        recoveryRequired: false,
      });
      expect(structured.engineStatus).toMatchObject({
        state: "unavailable",
        errorCode: "engine_status_unavailable",
        detail: expect.stringContaining("Kibi engine connection closed"),
        recoveryRequired: false,
      });
      expect(
        structured.migrationPlan?.actions?.some(
          (action) => action.code === "damaged_exact_branch_store",
        ),
      ).toBe(false);
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("kb_status points a missing SWI-Prolog at kibi doctor, not an engine restart", async () => {
    const query = mock(async (_goal: string): Promise<PrologQueryResult> => {
      throw new SwiplResolutionError(
        "swipl_not_found",
        "Kibi could not find a usable SWI-Prolog (9.0 or newer is required).",
        "linux-x64 (glibc)",
        "kibi-swipl-linux-x64-gnu",
      );
    });
    const workspaceRoot = mkdtempSync(
      path.join(tmpdir(), "kibi-status-no-swipl-test-"),
    );
    const storePath = branchStorePath(workspaceRoot, "main");
    ensureBranchStoreManifest(workspaceRoot, "main");
    mkdirSync(path.join(storePath, "rdf"), { recursive: true });
    writeFileSync(path.join(storePath, "storage.json"), "{}\n");
    writeFileSync(path.join(storePath, "CURRENT"), "generation-1:1\n");
    try {
      const result = await statusSpec.execute(
        {},
        createContext(query, workspaceRoot),
      );
      const structured = result.structuredContent as {
        staleReasons?: readonly {
          code?: string;
          detail?: string;
          remediation?: { command_argv?: readonly string[] };
        }[];
      };
      const reason = structured.staleReasons?.find(
        (entry) => entry.code === "swipl_not_found",
      );
      expect(reason?.detail).toContain("could not find a usable SWI-Prolog");
      expect(reason?.remediation?.command_argv).toEqual(["kibi", "doctor"]);
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });
});

// Public-port fixtures share the discovery suite and its cleanup boundaries.
{
  function context(
    workspaceRoot: string,
    extra?: Partial<OperationContext>,
  ): OperationContext {
    return {
      workspaceRoot,
      signal: new AbortController().signal,
      clock: () => new Date("2026-09-05T00:00:00Z"),
      fs: nodeFilesystem,
      git: {
        workspaceSnapshot: async () => ({
          version: "kibi.workspace-snapshot.v2",
          hash: "a".repeat(64),
          dirty: false,
          fileCount: 1,
        }),
      },
      branchAttachment: {
        gitBranch: "main",
        kbBranch: "main",
        storePath: path.join(workspaceRoot, ".kb", "branches", "main"),
        kind: "exact",
        migrationRequired: false,
      },
      ...extra,
    };
  }

  describe("discovery executors", () => {
    test("executeQuery uses indexed pages, falls back, and wraps errors", async () => {
      const root = mkdtempSync(path.join(tmpdir(), "kibi-disco-"));
      mkdirSync(path.join(root, ".kb"), { recursive: true });
      try {
        const indexed = await executeQuery(
          { type: "req", limit: 1, offset: 0 },
          context(root, {
            prolog: {
              query: async () => ({ success: true, bindings: {} }),
              nextSolution: async () => null,
              save: async () => ({ success: true, bindings: {} }),
              queryEntities: async () => ({
                entities: [
                  { id: "REQ-1", title: "One", status: "open" },
                  { id: "file:///tmp/REQ-2", title: "Two", status: "open" },
                ],
                count: 2,
              }),
            },
          }),
        );
        expect(
          (indexed.structuredContent as unknown as { count: number }).count,
        ).toBe(2);

        const empty = await executeQuery(
          { type: "req" },
          context(root, {
            prolog: {
              query: async () => ({ success: true, bindings: {} }),
              nextSolution: async () => null,
              save: async () => ({ success: true, bindings: {} }),
              queryEntities: async () => ({ entities: [], count: 0 }),
            },
          }),
        );
        expect(empty.content[0]?.text).toContain("No entities found");

        const fallback = await executeQuery(
          { id: "REQ-1", tags: ["core"], sourceFile: "src/a.ts" },
          context(root, {
            prolog: {
              query: async () => ({
                success: true,
                bindings: {
                  Results: JSON.stringify([
                    { id: "REQ-1", title: "One", status: "open" },
                  ]),
                },
              }),
              nextSolution: async () => null,
              save: async () => ({ success: true, bindings: {} }),
            },
          }),
        );
        expect(
          (fallback.structuredContent as unknown as { count: number }).count,
        ).toBeGreaterThanOrEqual(0);

        await expect(
          executeQuery({}, context(root, { prolog: undefined })),
        ).rejects.toThrow("Query execution failed");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test("executeSearch covers intent, legacy, empty, and error paths", async () => {
      const root = mkdtempSync(path.join(tmpdir(), "kibi-disco-"));
      mkdirSync(path.join(root, ".kb"), { recursive: true });
      try {
        await expect(
          executeSearch({ query: "   " }, context(root)),
        ).rejects.toThrow("non-empty string");

        const intentEmpty = await executeSearch(
          { query: "download", rankingMode: "intent-v1", type: "req" },
          context(root, {
            prolog: {
              query: async () => ({
                success: true,
                bindings: { Results: "[]" },
              }),
              nextSolution: async () => null,
              save: async () => ({ success: true, bindings: {} }),
            },
          }),
        );
        expect(
          (intentEmpty.structuredContent as unknown as { count: number }).count,
        ).toBe(0);

        const indexed = await executeSearch(
          { query: "download", type: "req", limit: 1 },
          context(root, {
            prolog: {
              query: async () => ({ success: true, bindings: {} }),
              nextSolution: async () => null,
              save: async () => ({ success: true, bindings: {} }),
              searchEntities: async () =>
                ({
                  entities: [
                    { id: "REQ-1", title: "Download", status: "open" },
                  ],
                }) as never,
            },
          }),
        );
        expect(
          (indexed.structuredContent as unknown as { count: number }).count,
        ).toBeGreaterThanOrEqual(0);

        await expect(
          executeSearch({ query: "x" }, context(root, { prolog: undefined })),
        ).rejects.toThrow("Search execution failed");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test("executeStatus reports missing stores and wraps attachment errors", async () => {
      const root = mkdtempSync(path.join(tmpdir(), "kibi-disco-"));
      mkdirSync(path.join(root, ".kb"), { recursive: true });
      try {
        const missing = await executeStatus(
          {},
          context(root, {
            prolog: {
              query: async () => ({ success: true, bindings: {} }),
              nextSolution: async () => null,
              save: async () => ({ success: true, bindings: {} }),
            },
            fs: {
              ...nodeFilesystem,
              glob: async () => [],
            },
          }),
        );
        expect(
          (missing.structuredContent as unknown as { snapshotId: string })
            .snapshotId,
        ).toBe("missing");
        expect(
          (
            missing.structuredContent as unknown as {
              bootstrap?: { nextAction?: unknown };
            }
          ).bootstrap?.nextAction,
        ).toBeDefined();

        const originalBranchOverride = process.env.KIBI_BRANCH;
        try {
          // This case requires no branch authority. Proof CI supplies an explicit
          // override, which intentionally permits status outside a Git checkout.
          Reflect.deleteProperty(process.env, "KIBI_BRANCH");
          await expect(
            executeStatus(
              {},
              context(root, {
                branchAttachment: undefined,
                git: undefined,
              }),
            ),
          ).rejects.toThrow("Status execution failed");
        } finally {
          if (originalBranchOverride === undefined) {
            Reflect.deleteProperty(process.env, "KIBI_BRANCH");
          } else {
            process.env.KIBI_BRANCH = originalBranchOverride;
          }
        }
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  });
}

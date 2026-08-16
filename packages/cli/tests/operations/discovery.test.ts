import { describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { validateAgainstSchema } from "../../src/cli-validate.js";
import { PrologProcess } from "../../src/prolog.js";
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

describe("shared discovery operation executors", () => {
  test("kb_query preserves exact id lookup behavior", async () => {
    // Given
    const query = mock(async (_goal: string) => ({
      success: true,
      bindings: {
        Results:
          '[[REQ-exact,req,[title="Exact lookup",status=open,source="documentation/requirements/REQ-exact.md"]]]',
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
          source: "documentation/requirements/REQ-exact.md",
        },
      ],
      count: 1,
    });
    expect(query.mock.calls[0]?.[0]).toContain("'REQ-exact'");
  });

  test("kb_query filters tags before applying pagination", async () => {
    // Given
    const query = mock(async () => ({
      success: true,
      bindings: {
        Results:
          '[[REQ-1,req,[title="One",status=open,tags=[other]]],[REQ-2,req,[title="Two",status=open,tags=[wanted]]],[REQ-3,req,[title="Three",status=open,tags=[wanted]]]]',
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
  });

  test("kb_search trims the query and preserves ranked pagination", async () => {
    // Given
    const query = mock(async () => ({
      success: true,
      bindings: {
        Results:
          '[[REQ-1,req,[title="OAuth login flow",status=open]],[REQ-2,req,[title="OAuth login fallback",status=open]]]',
      },
    }));

    // When
    const result = await searchSpec.execute(
      { query: "  OAuth login  ", limit: 1, offset: 1 },
      createContext(query),
    );

    // Then
    expect(result.structuredContent?.count).toBe(2);
    expect(result.structuredContent?.results).toHaveLength(1);
    expect(result.structuredContent?.results[0]?.entity.id).toBe("REQ-2");
  });

  test("kb_search intent-v1 returns semantic evidence and analysis", async () => {
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("kb_relationship")) {
        return { success: true, bindings: { Edges: "[]" } };
      }
      return {
        success: true,
        bindings: {
          Results:
            '[[REQ-EXPORT,req,[title="Export report as CSV",status=open,tags=[download,reporting]]] , [REQ-LOGIN,req,[title="Authenticate an account",status=open]]]',
        },
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
      prolog.query(largeEntityGoal(ABOVE_FORMER_TRANSPORT_CAPACITY_COUNT));

    // When
    const result = await searchSpec.execute(
      { query: "skillopt", limit: 20, offset: 0 },
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
        verificationSnapshot: "a".repeat(64),
        verificationSnapshotAvailable: true,
        verificationSnapshotDirty: false,
        verificationSnapshotFileCount: 7,
        verificationSnapshotVersion: "kibi.workspace-snapshot.v2",
        verificationSnapshotChangeCount: 0,
        verificationSnapshotChanges: [],
        verificationSnapshotChangesTruncated: false,
        migrationPlan: expect.objectContaining({
          version: "kibi.migration-plan.v2",
        }),
      }),
    );
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toContain(
      "status:kb_status_json(JsonString)",
    );
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
});

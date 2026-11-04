import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  QUERY_BODY_MAX_CHARS,
  type QueryInput,
  executeQuery,
  executeStatus,
} from "../../../src/public/operations/discovery-executors.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologPort,
} from "../../../src/public/operations/runtime-types.js";
import {
  branchStorePath,
  ensureBranchStoreManifest,
} from "../../../src/utils/branch-store-locator.js";
import {
  createTempDir,
  isolateKibiEnv,
  removeTempDir,
} from "../../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];
const roots: string[] = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

type Answer = Record<string, unknown>;

function factProlog(answer: Answer | ((goal: string) => Answer)) {
  const goals: string[] = [];
  const prolog = {
    oneShotMode: true,
    async query(goal: string) {
      goals.push(goal);
      const value = typeof answer === "function" ? answer(goal) : answer;
      return { success: true, bindings: { JsonString: JSON.stringify(value) } };
    },
  } as unknown as PrologPort;
  return { prolog, goals };
}

function context(
  workspaceRoot: string,
  prolog?: PrologPort,
  extra: Partial<OperationContext> = {},
): OperationContext {
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00Z"),
    fs: nodeFilesystem,
    ...(prolog ? { prolog } : {}),
    ...extra,
  } as OperationContext;
}

async function ask(
  input: QueryInput,
  answer: Answer | ((goal: string) => Answer),
) {
  const { prolog, goals } = factProlog(answer);
  const result = await executeQuery(input, context("/tmp", prolog));
  return { result, goals, text: result.content[0]?.text ?? "" };
}

async function failure(input: QueryInput): Promise<string> {
  const { prolog } = factProlog({ mode: "predicate", rows: [], count: 0 });
  try {
    await executeQuery(input, context("/tmp", prolog));
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("expected executeQuery to fail");
}

describe("typed fact query arguments", () => {
  test("rejects malformed where, args and page bounds", async () => {
    expect(
      await failure({
        predicate: "p",
        where: [] as unknown as Record<string, string>,
      }),
    ).toBe(
      "Query execution failed: where must be an object of argument name to value.",
    );
    expect(
      await failure({ predicate: "p", args: "x" as unknown as string[] }),
    ).toBe(
      "Query execution failed: args must be an array of constants (null = any).",
    );
    expect(await failure({ predicate: "p", limit: -1 })).toBe(
      "Query execution failed: limit and offset must be non-negative numbers.",
    );
    expect(await failure({ predicate: "p", propertyKey: "k" })).toBe(
      "Query execution failed: propertyKey does not apply to a predicate question; allowed with it: predicate, namespace, where, args, polarity, scope, distinct.",
    );
    expect(
      await failure({ predicate: "p", propertyKey: "k", subjectKey: "s" }),
    ).toBe(
      "Query execution failed: subjectKey, propertyKey do not apply to a predicate question; allowed with it: predicate, namespace, where, args, polarity, scope, distinct.",
    );
  });

  test("positional args with wildcards", async () => {
    const { goals } = await ask(
      { predicate: "p", args: [null, "*", "x"] },
      { mode: "predicate", rows: [], count: 0 },
    );
    expect(goals[0]).toContain("['$any','$any','x']");
  });
});

describe("predicate answers", () => {
  test("suggest a distinct count over the last free argument", async () => {
    const { result, text } = await ask(
      { predicate: "p", where: { a: "1" } },
      {
        mode: "predicate",
        rows: [
          {
            id: "FACT-1",
            name: "p",
            args: ["1", "2"],
            effect: "e",
            polarity: "deny",
          },
        ],
        count: 1,
        schema: { argumentNames: ["a", "b", 3] },
        distinct: { argument: "b", values: ["2"] },
      },
    );
    expect(result.structuredContent?.factQuery?.next).toStrictEqual([
      {
        call: 'kb_query({"id":"FACT-1"})',
        why: "full fact text and relationships of one row",
      },
      {
        call: 'kb_query({"predicate":"p","where":{"a":"1"},"distinct":"b"})',
        why: "count the distinct values of 'b' across these facts",
      },
    ]);
    expect(text).toContain("FACT-1: p(1, 2) -> e [deny]");
    expect(text).toContain('Distinct b: ["2"]');
  });

  test("an empty answer suggests a value that exists", async () => {
    const { result } = await ask(
      { predicate: "p", where: { a: "x", b: "y" } },
      {
        mode: "predicate",
        rows: [],
        count: 0,
        suggestions: { a: ["x"], n: "not a list", b: [3, "z"], c: ["w"] },
        distinct: { argument: "a" },
      },
    );
    expect(result.structuredContent?.factQuery?.next).toStrictEqual([
      {
        call: 'kb_query({"predicate":"p","where":{"a":"x","b":"y","c":"w"}})',
        why: "'c' has no fact with that value; 'w' is one that exists",
      },
    ]);
  });

  test("with nothing better, the next call lists the schemas", async () => {
    const { result } = await ask(
      { predicate: "p" },
      {
        mode: "predicate",
        rows: [],
        count: 0,
        warnings: ["w"],
        suggestions: { a: ["x"] },
      },
    );
    expect(result.structuredContent?.factQuery?.next).toStrictEqual([
      {
        call: 'kb_query({"factKind":"predicate_schema"})',
        why: "list the predicates this KB can answer about and their argument names",
      },
    ]);
  });
});

describe("property and fact kind answers", () => {
  test("an empty property answer lists the subjects", async () => {
    const { result } = await ask(
      { subjectKey: "s" },
      { mode: "property", rows: [], count: 0 },
    );
    expect(result.structuredContent?.factQuery?.next).toStrictEqual([
      {
        call: 'kb_query({"factKind":"subject"})',
        why: "list the subject keys that exist",
      },
    ]);
    const nonEmpty = await ask(
      { subjectKey: "s" },
      { mode: "property", rows: [{ title: "x" }], count: 1 },
    );
    expect(nonEmpty.result.structuredContent?.factQuery?.next).toStrictEqual(
      [],
    );
  });

  test("property_value facts point at the first subject", async () => {
    const { result, goals } = await ask(
      { factKind: "property_value" },
      { mode: "fact_kind", rows: [{ subject_key: "svc" }], count: 1 },
    );
    expect(goals[0]).toContain("discovery:ask_fact_kind_json('property_value'");
    expect(result.structuredContent?.factQuery?.next).toStrictEqual([
      {
        call: 'kb_query({"subjectKey":"svc"})',
        why: "the properties of the first listed subject",
      },
    ]);
    const noKey = await ask(
      { factKind: "property_value" },
      { mode: "fact_kind", rows: [{ subject_key: 1 }], count: 1 },
    );
    expect(noKey.result.structuredContent?.factQuery?.next).toStrictEqual([]);
  });

  test("other fact kinds open the first row", async () => {
    const { result } = await ask(
      { factKind: "subject" },
      { mode: "fact_kind", rows: [{ id: "FACT-s", title: "S" }], count: 1 },
    );
    expect(result.structuredContent?.factQuery?.next).toStrictEqual([
      { call: 'kb_query({"id":"FACT-s"})', why: "full fact text of one row" },
    ]);
    const empty = await ask(
      { factKind: "subject" },
      { mode: "fact_kind", rows: [], count: 0 },
    );
    expect(empty.result.structuredContent?.factQuery?.next).toStrictEqual([]);
  });

  test("schema rows read as signatures", async () => {
    const { text } = await ask(
      { factKind: "predicate_schema" },
      {
        mode: "schemas",
        rows: [
          { id: "FACT-s", name: "p", arity: 2, argumentNames: ["a", "b"] },
          { id: "", name: "q", arity: 0, builtin: true },
          { id: "B-1", name: "r", arity: 0, builtin: true },
        ],
        count: 3,
      },
    );
    expect(text).toContain(
      "p(a, b); q() [builtin, not a stored entity]; r() [builtin B-1, not a stored entity]",
    );
  });
});

describe("includeBody", () => {
  function entityProlog(entity: Record<string, unknown>) {
    return {
      query: async () => ({ success: false, bindings: {} }),
      queryEntities: async () => ({ entities: [entity], count: 1 }),
    } as unknown as PrologPort;
  }

  test("an unreadable, bodiless or long authored document", async () => {
    const root = createTempDir("kibi-query-body-");
    roots.push(root);
    mkdirSync(path.join(root, "docs"), { recursive: true });
    const unreadable = await executeQuery(
      { id: "REQ-1", includeBody: true },
      context(root, entityProlog({ id: "REQ-1", source: "docs/missing.md" })),
    );
    expect(unreadable.structuredContent?.body).toStrictEqual({
      id: "REQ-1",
      path: "docs/missing.md",
      text: null,
    });
    expect(unreadable.content[0]?.text).toEndWith(
      "The authored document docs/missing.md of REQ-1 could not be read.",
    );
    writeFileSync(path.join(root, "docs/plain.md"), "no front matter\n");
    const bodiless = await executeQuery(
      { id: "REQ-1", includeBody: true },
      context(root, entityProlog({ id: "REQ-1", source: "docs/plain.md" })),
    );
    expect(bodiless.structuredContent?.body).toStrictEqual({
      id: "REQ-1",
      path: "docs/plain.md",
      text: null,
    });
    const long = "x".repeat(QUERY_BODY_MAX_CHARS + 5);
    writeFileSync(
      path.join(root, "docs/long.md"),
      `---\nid: REQ-1\ntitle: Long\n---\n${long}\n`,
    );
    const truncated = await executeQuery(
      { id: "REQ-1", includeBody: true },
      context(root, entityProlog({ id: "REQ-1", source: "docs/long.md" }), {
        fs: undefined,
      }),
    );
    expect(truncated.structuredContent?.body).toStrictEqual({
      id: "REQ-1",
      path: "docs/long.md",
      text: "x".repeat(QUERY_BODY_MAX_CHARS),
      truncated: true,
    });
  });
});

describe("executeStatus", () => {
  function healthyStore(root: string): string {
    const store = branchStorePath(root, "main");
    ensureBranchStoreManifest(root, "main");
    mkdirSync(path.join(store, "rdf"), { recursive: true });
    writeFileSync(path.join(store, "storage.json"), "{}\n");
    writeFileSync(path.join(store, "CURRENT"), "generation-abc:1\n");
    return store;
  }

  function statusContext(root: string, payload: unknown): OperationContext {
    return context(
      root,
      {
        queryStatusJson: async () => ({
          success: true,
          bindings: { JsonString: JSON.stringify(payload) },
        }),
        query: async () => ({ success: true, bindings: {} }),
      } as unknown as PrologPort,
      {
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
          storePath: branchStorePath(root, "main"),
          kind: "exact",
          migrationRequired: false,
        },
      } as Partial<OperationContext>,
    );
  }

  test("an invalid status payload reports the engine unavailable", async () => {
    restores.push(isolateKibiEnv());
    const root = createTempDir("kibi-status-invalid-");
    roots.push(root);
    healthyStore(root);
    const result = await executeStatus({}, statusContext(root, { branch: 1 }));
    expect(result.structuredContent?.engineStatus).toStrictEqual({
      state: "unavailable",
      errorCode: "engine_status_unavailable",
      detail: "Status execution query returned an invalid payload",
      recoveryRequired: false,
    });
  });

  test("a stale state whose only reasons are unchanged bytes reads fresh", async () => {
    restores.push(isolateKibiEnv());
    const root = createTempDir("kibi-status-fresh-");
    roots.push(root);
    const store = healthyStore(root);
    mkdirSync(path.join(root, "docs"), { recursive: true });
    const text = "# a\n";
    writeFileSync(path.join(root, "docs/a.md"), text);
    writeFileSync(
      path.join(store, "sync-cache.json"),
      JSON.stringify({
        hashes: {
          "docs/a.md": createHash("sha256").update(text).digest("hex"),
        },
      }),
    );
    const result = await executeStatus(
      {},
      statusContext(root, {
        branch: "main",
        snapshotId: "s",
        syncedAt: null,
        dirty: true,
        syncState: "stale",
        staleReasons: [{ code: "knowledge_source_newer", path: "docs/a.md" }],
      }),
    );
    // The content-confirmed reason is dropped; only the compiler reason stays.
    expect(
      result.structuredContent?.staleReasons?.map((reason) => reason.code),
    ).toStrictEqual(["compiler_changed"]);
  });
});

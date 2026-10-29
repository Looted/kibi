// executable_for TEST-kibi-search-hints-host
import { afterAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  type PluginProviderStamp,
  SEARCH_HINTS_CAPABILITY_ID,
  type SearchHintsInput,
  type SearchHintsResult,
  type SearchHintsV1,
} from "kibi-plugin-sdk";

import { runtimeDirectory } from "../src/engine.js";
import type {
  IntentSearchAnalysis,
  MarkdownBodyCache,
} from "../src/intent-search.js";
import { composeSearchHints } from "../src/plugins/compose-search-hints.js";
import {
  type CapabilityModeResolution,
  type CapabilityProviderBinding,
  NO_SEARCH_HINTS,
} from "../src/plugins/registry.js";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../src/public/operations/runtime-types.js";
import { searchSpec } from "../src/public/operations/specs/discovery.js";
import {
  SEARCH_HINT_LIMIT,
  SEARCH_HINT_WEAK_SCORE,
  buildSearchHints,
  searchHintsEntities,
  searchHintsNote,
  searchHintsTrigger,
} from "../src/search-hints.js";

const workspace = mkdtempSync(path.join(tmpdir(), "kibi-search-hints-"));
afterAll(() => rmSync(workspace, { recursive: true, force: true }));

function analysis(
  overrides: Partial<IntentSearchAnalysis> = {},
): IntentSearchAnalysis {
  return {
    rankingMode: "intent-v1",
    candidateCount: 10,
    acceptedCount: 3,
    topScore: 0.3,
    topTwoMargin: 0.1,
    topRivalMargin: 0.1,
    abstained: false,
    ambiguous: false,
    ...overrides,
  };
}

function stamp(
  pluginId: string,
  mode: "replace" | "shadow" | "builtin",
): PluginProviderStamp {
  return {
    pluginId,
    pluginVersion: "1.0.0",
    capability: SEARCH_HINTS_CAPABILITY_ID,
    mode: mode === "builtin" ? "replace" : mode,
    external: mode !== "builtin",
    network: false,
    metered: false,
  };
}

function binding(
  pluginId: string,
  mode: "replace" | "shadow" | "builtin",
  capability: SearchHintsV1,
): CapabilityProviderBinding<SearchHintsV1> {
  return {
    pluginId,
    pluginVersion: "1.0.0",
    packageName: mode === "builtin" ? null : `${pluginId}-pkg`,
    mode,
    permissions: { network: false, metered: false, secrets: [] },
    external: mode !== "builtin",
    capability,
    stamp: stamp(pluginId, mode),
  };
}

function provider(
  answer: (
    input: SearchHintsInput,
  ) => SearchHintsResult | Promise<SearchHintsResult>,
): SearchHintsV1 & { calls: SearchHintsInput[] } {
  const calls: SearchHintsInput[] = [];
  return {
    id: "fake",
    model: "fake-model",
    calls,
    hint(input) {
      calls.push(input);
      return answer(input);
    },
  };
}

function resolution(
  replace: SearchHintsV1 | null,
  shadow: SearchHintsV1[] = [],
): CapabilityModeResolution<SearchHintsV1> {
  return {
    builtin: binding("builtin", "builtin", NO_SEARCH_HINTS),
    replace: replace === null ? null : binding("hints", "replace", replace),
    augment: [],
    shadow: shadow.map((capability, index) =>
      binding(`shadow-${index}`, "shadow", capability),
    ),
  };
}

const input: SearchHintsInput = {
  query: "q",
  limit: 20,
  entities: [
    { id: "REQ-a", type: "req", title: "A", text: "A", hash: "1" },
    { id: "REQ-b", type: "req", title: "B", text: "B", hash: "2" },
  ],
  cacheDirectory: workspace,
};

// executable_for TEST-kibi-search-hints-host
describe("search hints trigger", () => {
  test("abstained, missing and weak answers trigger; strong ones do not", () => {
    expect(searchHintsTrigger(analysis({ abstained: true }))).toBe("abstained");
    expect(searchHintsTrigger(analysis({ topScore: null }))).toBe("abstained");
    expect(
      searchHintsTrigger(analysis({ topScore: SEARCH_HINT_WEAK_SCORE - 0.01 })),
    ).toBe("weak");
    expect(
      searchHintsTrigger(analysis({ topScore: SEARCH_HINT_WEAK_SCORE })),
    ).toBeNull();
    // A close race between strong matches is not a reason for hints.
    expect(
      searchHintsTrigger(analysis({ topScore: 0.9, ambiguous: true })),
    ).toBeNull();
  });
});

// executable_for TEST-kibi-search-hints-host
describe("search hints entities", () => {
  test("only current entities, once each, with text that does not depend on the query", () => {
    const doc = path.join(workspace, "REQ-a.md");
    writeFileSync(doc, "---\nid: REQ-a\n---\nThe body of A.\n");
    const rows = [
      { id: "REQ-a", type: "req", title: "A", status: "active", source: doc },
      { id: "REQ-a", type: "req", title: "A again", status: "active" },
      { id: "REQ-old", type: "req", title: "Old", status: "superseded" },
      { id: "REQ-closed", type: "req", title: "Closed", status: "closed" },
      {
        id: "FACT-stub",
        type: "fact",
        title: "Stub",
        tags: ["bootstrap:provenance-stub"],
      },
      { id: "SCEN-a", type: "scenario", title: "S", semantic_text: "When A" },
    ];
    const read: MarkdownBodyCache = new Map();
    const unread: MarkdownBodyCache = new Map();
    const first = searchHintsEntities(rows, read, workspace);
    read.set(doc, "The body of A.\n");
    const second = searchHintsEntities(rows, unread, workspace);
    expect(first.map((row) => row.id)).toEqual(["REQ-a", "SCEN-a"]);
    expect(first[0]?.text).toContain("The body of A.");
    expect(first[1]?.text).toBe("S\nWhen A");
    // The body is read when the ranking left it out, so hashes agree.
    expect(second.map((row) => row.hash)).toEqual(first.map((row) => row.hash));
  });
});

// executable_for TEST-kibi-search-hints-host
describe("search hints composition", () => {
  test("replace hints are shown with their stamp; shadow hints only compared", async () => {
    const replace = provider(() => ({ hints: [{ id: "REQ-b", score: 0.6 }] }));
    const shadow = provider(() => ({ hints: [{ id: "REQ-a", score: 0.9 }] }));
    const composed = await composeSearchHints(
      resolution(replace, [shadow]),
      input,
      { operationName: "kb_search", timeoutMs: () => 500 },
    );
    expect(composed.hints).toEqual([{ id: "REQ-b", score: 0.6 }]);
    expect(composed.stamp?.pluginId).toBe("hints");
    expect(composed.fallbackUsed).toBe(false);
    expect(composed.shadowComparisons).toHaveLength(1);
    expect(composed.shadowComparisons[0]?.hints[0]?.id).toBe("REQ-a");
  });

  test("a shadow provider alone shows no hints", async () => {
    const shadow = provider(() => ({ hints: [{ id: "REQ-a", score: 0.9 }] }));
    const composed = await composeSearchHints(
      resolution(null, [shadow]),
      input,
      {
        operationName: "kb_search",
        timeoutMs: () => 500,
      },
    );
    expect(composed.hints).toEqual([]);
    expect(composed.stamp).toBeNull();
    expect(composed.shadowComparisons).toHaveLength(1);
  });

  test("a throwing, invalid or late provider gives no hints and a diagnostic", async () => {
    const failing = [
      provider(() => {
        throw Object.assign(new Error("boom"), { code: "model_missing" });
      }),
      provider(() => ({ hints: [{ id: "REQ-unknown", score: 0.5 }] })),
      provider(() => ({
        hints: [
          { id: "REQ-a", score: 0.2 },
          { id: "REQ-b", score: 0.5 },
        ],
      })),
      provider(() => ({ hints: [{ id: "REQ-a", score: 1.5 }] })),
      provider(
        () =>
          new Promise<SearchHintsResult>((resolve) =>
            setTimeout(() => resolve({ hints: [] }), 200),
          ),
      ),
    ];
    const codes: string[] = [];
    for (const capability of failing) {
      const composed = await composeSearchHints(resolution(capability), input, {
        operationName: "kb_search",
        timeoutMs: () => 20,
      });
      expect(composed.hints).toEqual([]);
      expect(composed.fallbackUsed).toBe(true);
      expect(composed.stamp?.fallbackUsed).toBe(true);
      expect(composed.diagnostics).toHaveLength(1);
      codes.push(composed.diagnostics[0]?.code ?? "");
    }
    expect(codes).toEqual([
      "model_missing",
      "INVALID_CAPABILITY_RESULT",
      "INVALID_CAPABILITY_RESULT",
      "INVALID_CAPABILITY_RESULT",
      "timeout",
    ]);
  });

  test("operations off the allowlist never reach a provider", async () => {
    const replace = provider(() => ({ hints: [{ id: "REQ-a", score: 0.5 }] }));
    const composed = await composeSearchHints(resolution(replace), input, {
      operationName: "kb_check",
      timeoutMs: () => 500,
    });
    expect(composed.hints).toEqual([]);
    expect(replace.calls).toHaveLength(0);
  });
});

function edgesProlog(edges: readonly [string, string, string][]): {
  query(goal: string): Promise<PrologQueryResult>;
} {
  return {
    async query() {
      return {
        success: true,
        bindings: {
          Edges: `[${edges.map((edge) => `[${edge.join(",")}]`).join(",")}]`,
        },
      } as PrologQueryResult;
    },
  };
}

const kbRows = [
  { id: "REQ-export", type: "req", title: "Export reports", status: "active" },
  { id: "REQ-login", type: "req", title: "Sign in", status: "active" },
  { id: "REQ-audit", type: "req", title: "Audit log", status: "active" },
  { id: "SCEN-export", type: "scenario", title: "Export a report" },
  { id: "TEST-orphan", type: "test", title: "Orphan test" },
];

// executable_for TEST-kibi-search-hints-host
describe("search hints for kb_search", () => {
  test("hits are lifted to their requirements, answered ones dropped, and capped", async () => {
    const replace = provider(() => ({
      hints: [
        { id: "SCEN-export", score: 0.7 },
        { id: "REQ-export", score: 0.65 },
        { id: "REQ-login", score: 0.6 },
        { id: "TEST-orphan", score: 0.5 },
        { id: "REQ-audit", score: 0.4 },
      ],
    }));
    const hints = await buildSearchHints({
      query: "how do I download a report",
      analysis: analysis({ topScore: 0.2 }),
      entities: kbRows,
      bodies: new Map(),
      governingIds: ["REQ-login"],
      resolution: resolution(replace),
      prolog: edgesProlog([["specified_by", "REQ-export", "SCEN-export"]]),
      workspaceRoot: workspace,
    });
    expect(hints?.trigger).toBe("weak");
    expect(hints?.provider?.pluginId).toBe("hints");
    expect(hints?.items).toEqual([
      {
        id: "REQ-export",
        title: "Export reports",
        score: 0.7,
        via: "SCEN-export",
      },
      { id: "TEST-orphan", title: "Orphan test", score: 0.5 },
      { id: "REQ-audit", title: "Audit log", score: 0.4 },
    ]);
    expect(replace.calls[0]?.limit).toBe(20);
    expect(hints?.items.length).toBeLessThanOrEqual(SEARCH_HINT_LIMIT);
  });

  test("a strong answer or no provider never asks for hints", async () => {
    const replace = provider(() => ({ hints: [] }));
    const base = {
      query: "export reports",
      entities: kbRows,
      bodies: new Map() as MarkdownBodyCache,
      governingIds: [],
      prolog: edgesProlog([]),
      workspaceRoot: workspace,
    };
    expect(
      await buildSearchHints({
        ...base,
        analysis: analysis({ topScore: 0.8 }),
        resolution: resolution(replace),
      }),
    ).toBeUndefined();
    expect(replace.calls).toHaveLength(0);
    expect(
      await buildSearchHints({
        ...base,
        analysis: analysis({ abstained: true, topScore: null }),
        resolution: resolution(null),
      }),
    ).toBeUndefined();
  });

  test("the answer text names hints as suggestions", () => {
    expect(searchHintsNote(undefined)).toBe("");
    expect(
      searchHintsNote({ trigger: "weak", provider: null, items: [] }),
    ).toBe("");
    const note = searchHintsNote({
      trigger: "weak",
      provider: null,
      items: [{ id: "REQ-export", title: "Export reports", score: 0.7 }],
    });
    expect(note).toContain("Export reports (REQ-export)");
    expect(note).toContain("not governing requirements");
  });
});

function searchContext(
  ensurePlugins: () => Promise<unknown>,
): OperationContext {
  const rows =
    '[[REQ-EXPORT,req,[title="Export report as CSV",status=open,tags=[download,reporting]]] , [REQ-LOGIN,req,[title="Authenticate an account",status=open]]]';
  const prolog: PrologPort = {
    query: async (goal): Promise<PrologQueryResult> => {
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      return {
        success: true,
        bindings: goal.startsWith("findall(")
          ? { Results: rows }
          : { Rows: rows, Count: "2" },
      };
    },
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    workspaceRoot: workspace,
    signal: new AbortController().signal,
    clock: () => new Date("2026-10-29T00:00:00Z"),
    prolog,
    ensurePlugins: ensurePlugins as OperationContext["ensurePlugins"],
  } as OperationContext;
}

// executable_for TEST-kibi-search-hints-host
describe("kb_search with a search hints provider", () => {
  const registry = (capability: SearchHintsV1) => async () => ({
    resolveSearchHints: async () => resolution(capability),
  });

  test("a weak answer carries hints in queryAnalysis and the text", async () => {
    const replace = provider(() => ({
      hints: [{ id: "REQ-LOGIN", score: 0.5 }],
    }));
    const result = await searchSpec.execute(
      { query: "who may sign in" },
      searchContext(registry(replace)),
    );
    const hints = result.structuredContent?.queryAnalysis?.hints;
    expect(hints?.items.map((item) => item.id)).toEqual(["REQ-LOGIN"]);
    expect(result.content[0]?.text).toContain("(REQ-LOGIN)");
    // Hints never change the ranked results.
    const plain = await searchSpec.execute(
      { query: "who may sign in", hints: false },
      searchContext(registry(replace)),
    );
    expect(plain.structuredContent?.queryAnalysis?.hints).toBeUndefined();
    expect(plain.structuredContent?.results).toEqual(
      result.structuredContent?.results,
    );
    expect(replace.calls).toHaveLength(1);
  });

  test("a strong answer never reaches the provider", async () => {
    const replace = provider(() => ({ hints: [] }));
    const result = await searchSpec.execute(
      { query: "export report as CSV" },
      searchContext(registry(replace)),
    );
    expect(result.structuredContent?.queryAnalysis?.hints).toBeUndefined();
    expect(replace.calls).toHaveLength(0);
  });

  test("a provider that cannot load is reported, and the search still answers", async () => {
    const result = await searchSpec.execute(
      { query: "who may sign in" },
      searchContext(async () => {
        throw new Error("kibi-plugin-search-hints is not installed");
      }),
    );
    expect(result.structuredContent?.queryAnalysis?.hints).toMatchObject({
      items: [],
      diagnostics: [{ code: "provider_unavailable" }],
    });
  });
});

function capturingProlog(edges: readonly [string, string, string][]) {
  const goals: string[] = [];
  return {
    goals,
    async query(goal: string): Promise<PrologQueryResult> {
      goals.push(goal);
      return {
        success: true,
        bindings: {
          Edges: `[${edges.map((edge) => `[${edge.join(",")}]`).join(",")}]`,
        },
      };
    },
  };
}

function hintsFor(
  replace: SearchHintsV1 | null,
  overrides: Partial<Parameters<typeof buildSearchHints>[0]> = {},
) {
  return buildSearchHints({
    query: "how do I download a report",
    analysis: analysis({ topScore: 0.2 }),
    entities: kbRows,
    bodies: new Map(),
    governingIds: [],
    resolution: resolution(replace),
    prolog: capturingProlog([]),
    workspaceRoot: workspace,
    ...overrides,
  });
}

// executable_for TEST-kibi-search-hints-host
describe("search hints host edges", () => {
  test("statuses are read case- and space-insensitively; ids, types and titles may be missing", () => {
    const rows = searchHintsEntities(
      [
        { id: "REQ-old", type: "req", title: "Old", status: " Superseded " },
        { id: "REQ-closed", type: "req", title: "C", status: "CLOSED" },
        { type: "req", title: "No id" },
        { id: "", type: "req", title: "Empty id" },
        { id: "REQ-bare" },
        { id: "REQ-two", type: "req", title: "Two", status: "open" },
      ],
      new Map(),
      workspace,
    );
    expect(rows.map((row) => [row.id, row.type, row.title, row.text])).toEqual([
      ["REQ-bare", "", "", ""],
      ["REQ-two", "req", "Two", "Two"],
    ]);
    // Different text, different hash.
    expect(rows[0]?.hash).not.toBe(rows[1]?.hash);
  });

  test("a body the ranking already read is reused, and one it skipped is read and kept", () => {
    const doc = path.join(workspace, "REQ-cached.md");
    writeFileSync(doc, "---\nid: REQ-cached\n---\nOn disk.\n");
    const bodies: MarkdownBodyCache = new Map([[doc, "Read by the ranking."]]);
    const [cached] = searchHintsEntities(
      [{ id: "REQ-cached", type: "req", title: "T", source: doc }],
      bodies,
      workspace,
    );
    expect(cached?.text).toBe("T\nRead by the ranking.");
    const skipped = path.join(workspace, "REQ-skipped.md");
    writeFileSync(skipped, "---\nid: REQ-skipped\n---\nFrom disk.\n");
    const fresh: MarkdownBodyCache = new Map();
    const [read] = searchHintsEntities(
      [{ id: "REQ-skipped", type: "req", title: "T", source: skipped }],
      fresh,
      workspace,
    );
    expect(read?.text).toBe("T\nFrom disk.\n");
    expect(fresh.get(skipped)).toBe("From disk.\n");
  });

  test("an entity's text is capped at 2000 characters", () => {
    const [row] = searchHintsEntities(
      [{ id: "REQ-long", type: "req", title: "x".repeat(3000) }],
      new Map(),
      workspace,
    );
    expect(row?.text).toHaveLength(2000);
  });

  test("an empty KB never reaches the provider", async () => {
    const replace = provider(() => ({ hints: [] }));
    expect(await hintsFor(replace, { entities: [] })).toBeUndefined();
    expect(replace.calls).toHaveLength(0);
  });

  test("the provider gets a private per-workspace cache directory", async () => {
    const replace = provider(() => ({ hints: [] }));
    await hintsFor(replace);
    const directory = replace.calls[0]?.cacheDirectory ?? "";
    const expected = path.join(
      runtimeDirectory(),
      `search-hints-${createHash("sha256")
        .update(path.resolve(workspace))
        .digest("hex")
        .slice(0, 24)}`,
    );
    expect(directory).toBe(expected);
    expect(statSync(directory).mode & 0o777).toBe(0o700);
  });

  test("only non-requirement hits are looked up in the graph, and only their links lift", async () => {
    const replace = provider(() => ({
      hints: [
        { id: "REQ-audit", score: 0.9 },
        { id: "TEST-orphan", score: 0.8 },
        { id: "SCEN-export", score: 0.7 },
      ],
    }));
    const prolog = capturingProlog([
      ["specified_by", "REQ-login", "SCEN-export"],
      ["specified_by", "REQ-export", "SCEN-export"],
      // Not a current entity: never lifted to.
      ["specified_by", "REQ-gone", "SCEN-export"],
      ["validates", "TEST-orphan", "SCEN-export"],
      ["supersedes", "REQ-audit", "REQ-login"],
    ]);
    const hints = await hintsFor(replace, { prolog });
    expect(prolog.goals).toHaveLength(1);
    expect(prolog.goals[0]).toContain("'TEST-orphan'");
    expect(prolog.goals[0]).toContain("'SCEN-export'");
    expect(prolog.goals[0]).not.toContain("'REQ-audit'");
    expect(hints?.items).toEqual([
      { id: "REQ-audit", title: "Audit log", score: 0.9 },
      { id: "TEST-orphan", title: "Orphan test", score: 0.8 },
      {
        id: "REQ-export",
        title: "Export reports",
        score: 0.7,
        via: "SCEN-export",
      },
      { id: "REQ-login", title: "Sign in", score: 0.7, via: "SCEN-export" },
    ]);
    // Requirement hits alone need no graph lookup.
    const direct = capturingProlog([]);
    const onlyRequirements = provider(() => ({
      hints: [{ id: "REQ-audit", score: 0.9 }],
    }));
    await hintsFor(onlyRequirements, { prolog: direct });
    expect(direct.goals).toEqual([]);
  });

  test("only the top three governing requirements are left out, and at most 10 hints show", async () => {
    const rows = Array.from({ length: 16 }, (_, index) => ({
      id: `REQ-${String(index).padStart(2, "0")}`,
      type: "req",
      title: `R${index}`,
      status: "open",
    }));
    const replace = provider(() => ({
      hints: rows.map((row, index) => ({
        id: row.id,
        score: 0.9 - index / 100,
      })),
    }));
    const hints = await hintsFor(replace, {
      entities: rows,
      governingIds: ["REQ-00", "REQ-01", "REQ-02", "REQ-03"],
    });
    expect(hints?.items.map((item) => item.id)).toEqual([
      "REQ-03",
      "REQ-04",
      "REQ-05",
      "REQ-06",
      "REQ-07",
      "REQ-08",
      "REQ-09",
      "REQ-10",
      "REQ-11",
      "REQ-12",
    ]);
  });

  test("shadow providers alone are compared, and fields appear only when there is something to say", async () => {
    const shadow = provider(() => ({
      hints: [{ id: "REQ-login", score: 0.5 }],
    }));
    const failing = provider(() => {
      throw new Error("shadow broke");
    });
    const hints = await hintsFor(null, {
      resolution: resolution(null, [shadow, failing]),
    });
    expect(hints).toEqual({
      trigger: "weak",
      provider: null,
      items: [],
      shadow: [
        {
          provider: stamp("shadow-0", "shadow"),
          items: [{ id: "REQ-login", score: 0.5 }],
        },
      ],
      diagnostics: [expect.objectContaining({ pluginId: "shadow-1" })],
    });
    const plain = await hintsFor(provider(() => ({ hints: [] })));
    expect(plain).toEqual({
      trigger: "weak",
      provider: stamp("hints", "replace"),
      items: [],
    });
  });

  test("a provider's first call may take 3 s, later calls 0.5 s", async () => {
    const slow = provider(
      () =>
        new Promise<SearchHintsResult>((resolve) =>
          setTimeout(() => resolve({ hints: [] }), 700),
        ),
    );
    const first = await hintsFor(slow);
    expect(first?.diagnostics).toBeUndefined();
    const second = await hintsFor(slow);
    expect(second?.diagnostics?.[0]?.code).toBe("timeout");
    // A different provider is not warmed by the first one.
    const other = provider(
      () =>
        new Promise<SearchHintsResult>((resolve) =>
          setTimeout(() => resolve({ hints: [] }), 700),
        ),
    );
    expect((await hintsFor(other))?.diagnostics).toBeUndefined();
    const shadowSlow = provider(
      () =>
        new Promise<SearchHintsResult>((resolve) =>
          setTimeout(() => resolve({ hints: [] }), 700),
        ),
    );
    const shadowFirst = await hintsFor(null, {
      resolution: resolution(null, [shadowSlow]),
    });
    expect(shadowFirst?.diagnostics).toBeUndefined();
    const shadowSecond = await hintsFor(null, {
      resolution: resolution(null, [shadowSlow]),
    });
    expect(shadowSecond?.diagnostics?.[0]?.code).toBe("timeout");
  });

  test("the composition says nothing for an operation off the allowlist, and records a failing shadow", async () => {
    const replace = provider(() => ({ hints: [{ id: "REQ-a", score: 0.5 }] }));
    expect(
      await composeSearchHints(resolution(replace), input, {
        operationName: "kb_check",
        timeoutMs: () => 500,
      }),
    ).toEqual({
      hints: [],
      stamp: null,
      shadowComparisons: [],
      fallbackUsed: false,
      diagnostics: [],
    });
    const composed = await composeSearchHints(
      resolution(replace, [
        provider(() => {
          throw new Error("no");
        }),
      ]),
      input,
      { operationName: "kb_search", timeoutMs: () => 500 },
    );
    expect(composed.hints).toEqual([{ id: "REQ-a", score: 0.5 }]);
    expect(composed.fallbackUsed).toBe(false);
    expect(composed.shadowComparisons).toEqual([]);
    expect(composed.diagnostics).toEqual([
      expect.objectContaining({ pluginId: "shadow-0" }),
    ]);
    const late = await composeSearchHints(
      resolution(
        provider(
          () =>
            new Promise<SearchHintsResult>((resolve) =>
              setTimeout(() => resolve({ hints: [] }), 100),
            ),
        ),
      ),
      input,
      { operationName: "kb_search", timeoutMs: () => 10 },
    );
    expect(late.diagnostics[0]?.message).toBe(
      "search hints provider did not answer within 10 ms",
    );
  });

  test("the text names at most five hints, separated by semicolons", () => {
    const items = Array.from({ length: 6 }, (_, index) => ({
      id: `REQ-${index}`,
      title: `T${index}`,
      score: 0.5,
    }));
    const note = searchHintsNote({ trigger: "weak", provider: null, items });
    expect(note).toContain(
      "T0 (REQ-0); T1 (REQ-1); T2 (REQ-2); T3 (REQ-3); T4 (REQ-4).",
    );
    expect(note).not.toContain("REQ-5");
  });
});

import { afterAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  type PluginProviderStamp,
  SEARCH_HINTS_CAPABILITY_ID,
  SEARCH_HINTS_MAX_LIMIT,
  type SearchHintsInput,
  type SearchHintsResult,
  type SearchHintsV1,
} from "kibi-plugin-sdk";

import { runtimeDirectory } from "../src/engine.js";
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
  providerMeaningRanker,
  searchHintsAnalysis,
  searchHintsNote,
} from "../src/search-hints.js";

const workspace = mkdtempSync(path.join(tmpdir(), "kibi-search-hints-"));
afterAll(() => rmSync(workspace, { recursive: true, force: true }));

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

describe("meaning ranker", () => {
  test("without a provider nothing is asked and nothing is reported", async () => {
    const ranker = providerMeaningRanker(resolution(null), workspace);
    expect(await ranker.rank("q", input.entities)).toBeUndefined();
    expect(ranker.report()).toBeUndefined();
  });

  test("a provider scores every entity sent, and its stamp and shadows are reported", async () => {
    const replace = provider((asked) => ({
      hints: asked.entities.map((entity, index) => ({
        id: entity.id,
        score: 0.9 - index / 10,
      })),
    }));
    const shadow = provider((asked) => ({
      hints: asked.entities.map((entity) => ({ id: entity.id, score: 0.5 })),
    }));
    const ranker = providerMeaningRanker(
      resolution(replace, [shadow]),
      workspace,
    );
    const scores = await ranker.rank("q", input.entities);
    expect([...(scores ?? [])]).toEqual([
      ["REQ-a", 0.9],
      ["REQ-b", 0.8],
    ]);
    expect(replace.calls[0]?.limit).toBe(2);
    expect(ranker.report()?.provider?.pluginId).toBe("hints");
    expect(ranker.report()?.shadow[0]?.items).toHaveLength(2);
    expect(ranker.report()?.diagnostics).toEqual([]);
    // The cache directory is private to the workspace.
    const directory = replace.calls[0]?.cacheDirectory ?? "";
    expect(path.dirname(directory)).toBe(runtimeDirectory());
    expect(path.basename(directory)).toBe(
      `search-hints-${createHash("sha256").update(path.resolve(workspace)).digest("hex").slice(0, 24)}`,
    );
    expect(statSync(directory).mode & 0o777).toBe(0o700);
  });

  test("no more entities than a provider may score are sent", async () => {
    const replace = provider(() => ({ hints: [] }));
    const many = Array.from({ length: SEARCH_HINTS_MAX_LIMIT + 1 }, (_, i) => ({
      id: `REQ-${i}`,
      type: "req",
      title: "t",
      text: "t",
      hash: String(i),
    }));
    await providerMeaningRanker(resolution(replace), workspace).rank("q", many);
    expect(replace.calls[0]?.entities).toHaveLength(SEARCH_HINTS_MAX_LIMIT);
    expect(SEARCH_HINTS_MAX_LIMIT).toBe(50_000);
  });

  test("a failing provider gives no scores and a diagnostic", async () => {
    const ranker = providerMeaningRanker(
      resolution(
        provider(() => {
          throw new Error("boom");
        }),
      ),
      workspace,
    );
    expect(await ranker.rank("q", input.entities)).toBeUndefined();
    expect(ranker.report()?.provider?.fallbackUsed).toBe(true);
    expect(ranker.report()?.diagnostics).toHaveLength(1);
  });

  test("shadow providers alone are compared and give no scores", async () => {
    const ranker = providerMeaningRanker(
      resolution(null, [provider(() => ({ hints: [] }))]),
      workspace,
    );
    expect(await ranker.rank("q", input.entities)).toBeUndefined();
    expect(ranker.report()?.provider).toBeNull();
  });

  test("a provider's first call may take 3 s, later calls 0.5 s", async () => {
    const slow = () =>
      provider(
        () =>
          new Promise<SearchHintsResult>((resolve) =>
            setTimeout(() => resolve({ hints: [] }), 700),
          ),
      );
    const capability = slow();
    const first = providerMeaningRanker(resolution(capability), workspace);
    await first.rank("q", input.entities);
    expect(first.report()?.diagnostics).toEqual([]);
    const second = providerMeaningRanker(resolution(capability), workspace);
    await second.rank("q", input.entities);
    expect(second.report()?.diagnostics[0]?.code).toBe("timeout");
    const shadow = slow();
    const shadowFirst = providerMeaningRanker(
      resolution(null, [shadow]),
      workspace,
    );
    await shadowFirst.rank("q", input.entities);
    expect(shadowFirst.report()?.diagnostics).toEqual([]);
    const shadowSecond = providerMeaningRanker(
      resolution(null, [shadow]),
      workspace,
    );
    await shadowSecond.rank("q", input.entities);
    expect(shadowSecond.report()?.diagnostics[0]?.code).toBe("timeout");
  });
});

describe("meaning list analysis and text", () => {
  const items = [{ id: "REQ-export", title: "Export reports", score: 0.7 }];
  test("is absent without a provider report and carries only what was said", () => {
    expect(searchHintsAnalysis(items, undefined)).toBeUndefined();
    expect(
      searchHintsAnalysis(items, {
        provider: null,
        shadow: [],
        diagnostics: [],
      }),
    ).toEqual({ provider: null, items });
    const full = searchHintsAnalysis(items, {
      provider: null,
      shadow: [{ provider: stamp("s", "shadow"), items: [] }],
      diagnostics: [
        {
          pluginId: "p",
          packageName: null,
          mode: "replace",
          code: "timeout",
          message: "late",
        },
      ],
    });
    expect(full?.shadow).toHaveLength(1);
    expect(full?.diagnostics).toHaveLength(1);
  });

  test("the text names the related decisions by id", () => {
    expect(searchHintsNote(undefined)).toBe("");
    expect(searchHintsNote({ provider: null, items: [] })).toBe("");
    expect(searchHintsNote({ provider: null, items })).toBe(
      " Related by meaning: REQ-export.",
    );
  });
});

function kbWorkspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-search-meaning-"));
  const write = (relative: string, text: string) => {
    mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    writeFileSync(path.join(root, relative), text);
  };
  write(
    ".kb/requirements/REQ-EXPORT.md",
    "---\nid: REQ-EXPORT\ntitle: Export report as CSV\nstatus: open\n---\nExport must write CSV.\n",
  );
  write(
    ".kb/requirements/REQ-LOGIN.md",
    "---\nid: REQ-LOGIN\ntitle: Authenticate an account\nstatus: open\n---\nAn account must authenticate.\n",
  );
  return root;
}

function searchContext(
  root: string,
  ensurePlugins: () => Promise<unknown>,
): OperationContext {
  const prolog: PrologPort = {
    query: async (): Promise<PrologQueryResult> => ({
      success: true,
      bindings: { Edges: "[]", Rows: "[]", Results: "[]", Count: "0" },
    }),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-10-29T00:00:00Z"),
    prolog,
    ensurePlugins: ensurePlugins as OperationContext["ensurePlugins"],
  } as OperationContext;
}

describe("kb_search with a search hints provider", () => {
  const registry = (capability: SearchHintsV1) => async () => ({
    resolveSearchHints: async () => resolution(capability),
  });

  test("every search fuses the provider's ranking and lists related decisions", async () => {
    const root = kbWorkspace();
    try {
      const replace = provider((asked) => ({
        hints: asked.entities
          .filter((entity) => entity.id === "REQ-LOGIN")
          .map((entity) => ({ id: entity.id, score: 0.5 })),
      }));
      const result = await searchSpec.execute(
        { query: "export report as CSV", limit: 1 },
        searchContext(root, registry(replace)),
      );
      const analysis = result.structuredContent?.queryAnalysis as
        | Record<string, unknown>
        | undefined;
      expect(analysis?.fused).toBe(true);
      expect(
        result.structuredContent?.queryAnalysis?.hints?.items.map(
          (item) => item.id,
        ),
      ).toEqual(["REQ-LOGIN"]);
      expect(result.content[0]?.text).toContain(
        "Related by meaning: REQ-LOGIN.",
      );
      const plain = await searchSpec.execute(
        { query: "export report as CSV", hints: false },
        searchContext(root, registry(replace)),
      );
      expect(plain.structuredContent?.queryAnalysis?.hints).toBeUndefined();
      expect(replace.calls).toHaveLength(1);
      // A later page carries no meaning list.
      const later = await searchSpec.execute(
        { query: "export report as CSV", offset: 1 },
        searchContext(root, registry(replace)),
      );
      expect(later.structuredContent?.queryAnalysis?.hints).toBeUndefined();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a provider that cannot load is reported, and the search still answers", async () => {
    const root = kbWorkspace();
    try {
      const result = await searchSpec.execute(
        { query: "export report as CSV" },
        searchContext(root, async () => {
          throw new Error("kibi-plugin-search-hints is not installed");
        }),
      );
      expect(result.structuredContent?.queryAnalysis?.hints).toMatchObject({
        items: [],
        diagnostics: [{ code: "provider_unavailable" }],
      });
      expect(result.structuredContent?.results[0]?.entity.id).toBe(
        "REQ-EXPORT",
      );
      const thrown = await searchSpec.execute(
        { query: "export report as CSV" },
        searchContext(root, async () => {
          throw "not an error";
        }),
      );
      expect(
        thrown.structuredContent?.queryAnalysis?.hints?.diagnostics?.[0]
          ?.message,
      ).toBe("not an error");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("search hints composition edges", () => {
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
});

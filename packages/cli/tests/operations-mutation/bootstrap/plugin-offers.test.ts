import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import {
  SEARCH_HINTS_OFFER_REQUIREMENTS,
  pluginOffers,
} from "../../../src/operations/bootstrap/plugin-offers.js";
import * as suggestion from "../../../src/plugins/reference-language-suggestion.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";

type Suggestion = ReturnType<typeof suggestion.referenceLanguageSuggestion>;

const spies: { mockRestore(): void }[] = [];
let suggest: ReturnType<
  typeof spyOn<typeof suggestion, "referenceLanguageSuggestion">
>;
let relevance: ReturnType<
  typeof spyOn<typeof suggestion, "workspacePackRelevance">
>;
let declares: ReturnType<typeof spyOn<typeof suggestion, "manifestDeclares">>;

beforeEach(() => {
  suggest = spyOn(suggestion, "referenceLanguageSuggestion").mockReturnValue(
    null,
  );
  relevance = spyOn(suggestion, "workspacePackRelevance").mockReturnValue(
    "relevance" as never,
  );
  declares = spyOn(suggestion, "manifestDeclares").mockReturnValue(
    "declares" as never,
  );
  spies.push(
    suggest,
    relevance,
    declares,
    spyOn(suggestion, "workspaceInstalledVersion").mockReturnValue(
      "installed" as never,
    ),
    spyOn(suggestion, "pinnedPackVersions").mockReturnValue("pinned" as never),
    spyOn(suggestion, "describeReferenceLanguageSuggestion").mockReturnValue(
      "described",
    ),
  );
});
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

function context(
  manifest: unknown,
  requirements: number | Error = 0,
  options: { fs?: boolean; glob?: boolean } = {},
): OperationContext {
  const reads: string[] = [];
  const fs = {
    readFile: async (file: string) => {
      reads.push(file);
      if (manifest instanceof Error) throw manifest;
      return typeof manifest === "string" ? manifest : JSON.stringify(manifest);
    },
    ...(options.glob === false
      ? {}
      : {
          glob: async (patterns: string[], opts: { cwd: string }) => {
            if (requirements instanceof Error) throw requirements;
            expect(patterns).toStrictEqual([".kb/requirements/**/*.md"]);
            expect(opts).toStrictEqual({ cwd: "/ws" });
            return Array.from(
              { length: requirements },
              (_, i) =>
                `.kb/requirements/R${String(requirements - i).padStart(3, "0")}.md`,
            );
          },
        }),
  };
  return {
    workspaceRoot: "/ws",
    ...(options.fs === false ? {} : { fs }),
    reads,
  } as unknown as OperationContext;
}

const UI = ["src/App.tsx", "src/b.jsx", "src/c.component.ts"];

describe("UI plugin offer", () => {
  test("offers kibi-plugin-ui for production component files", async () => {
    const files = [
      ...UI,
      "src/d.TSX",
      "src/e.tsx",
      "src/f.tsx",
      "node_modules/x/a.tsx",
      "dist/a.tsx",
      "build/a.tsx",
      "coverage/a.tsx",
      "test/a.tsx",
      "tests/a.tsx",
      "__tests__/a.tsx",
      "e2e/a.tsx",
      "pkg/tests/a.tsx",
      "src/a.test.tsx",
      "src/a.spec.tsx",
      "src/a.stories.tsx",
      "src/a.ts",
      "src/component.ts",
      "src/a.tsx.bak",
    ];
    expect(await pluginOffers(context({}), files)).toStrictEqual([
      {
        package: "kibi-plugin-ui",
        capability: "kibi.check-policy.v1",
        mode: "augment",
        reason: "6 UI component file(s) found",
        fileCount: 6,
        evidence: [
          "src/App.tsx",
          "src/b.jsx",
          "src/c.component.ts",
          "src/d.TSX",
          "src/e.tsx",
        ],
      },
    ]);
    expect(suggest).not.toHaveBeenCalled();
  });

  test("keeps production files whose names only contain test words", async () => {
    const files = [
      "src/a.test.x/b.tsx",
      "src/latest/a.tsx",
      "src/contest.tsx",
      "src/mytests/a.tsx",
      "src/a.testing.tsx",
    ];
    const [offer] = await pluginOffers(context({}), files);
    expect(offer?.evidence).toStrictEqual(files);
  });

  test("is not offered once activated or declined", async () => {
    for (const kibi of [
      { plugins: [{ package: "kibi-plugin-ui" }] },
      { declinedPlugins: ["kibi-plugin-ui"] },
    ])
      expect(await pluginOffers(context({ kibi }), UI)).toStrictEqual([]);
    for (const kibi of [
      { plugins: [null, 5, "kibi-plugin-ui", { package: 3 }] },
      { declinedPlugins: [5], plugins: "x" },
      { declinedPlugins: "kibi-plugin-ui" },
      {},
    ])
      expect(await pluginOffers(context({ kibi }), UI)).toHaveLength(1);
  });

  test("is offered when package.json is absent, unreadable or not an object", async () => {
    for (const manifest of [new Error("ENOENT"), "not json", null, 5, '"text"'])
      expect(await pluginOffers(context(manifest), UI)).toHaveLength(1);
    expect(await pluginOffers(context({}, 0, { fs: false }), UI)).toHaveLength(
      1,
    );
  });

  test("offers nothing into a malformed kibi block", async () => {
    for (const kibi of [null, "x", 5, ["a"]])
      expect(await pluginOffers(context({ kibi }), UI)).toStrictEqual([]);
  });
});

describe("search hints offer", () => {
  test("is offered once the KB holds enough requirements", async () => {
    expect(SEARCH_HINTS_OFFER_REQUIREMENTS).toBe(50);
    expect(await pluginOffers(context({}, 49), [])).toStrictEqual([]);
    const ctx = context({}, 50);
    expect(await pluginOffers(ctx, [])).toStrictEqual([
      {
        package: "kibi-plugin-search-hints",
        capability: "kibi.search-hints.v1",
        mode: "replace",
        reason:
          "50 requirements in the KB; kb_search can suggest which ones a weakly answered question means",
        fileCount: 50,
        evidence: [
          ".kb/requirements/R001.md",
          ".kb/requirements/R002.md",
          ".kb/requirements/R003.md",
          ".kb/requirements/R004.md",
          ".kb/requirements/R005.md",
        ],
      },
    ]);
    expect((ctx as unknown as { reads: string[] }).reads).toStrictEqual([
      "/ws/package.json",
    ]);
  });

  test("is not offered once configured, or when requirements cannot be listed", async () => {
    expect(
      await pluginOffers(
        context(
          { kibi: { declinedPlugins: ["kibi-plugin-search-hints"] } },
          60,
        ),
        [],
      ),
    ).toStrictEqual([]);
    expect(
      await pluginOffers(context({}, new Error("glob")), []),
    ).toStrictEqual([]);
    expect(
      await pluginOffers(context({}, 60, { glob: false }), []),
    ).toStrictEqual([]);
    expect(
      await pluginOffers(context({}, 60, { fs: false }), []),
    ).toStrictEqual([]);
  });
});

describe("reference plugin offer", () => {
  const references = (overrides: Partial<NonNullable<Suggestion>> = {}) =>
    ({
      package: "kibi-plugin-treesitter",
      capabilities: ["cap.a"],
      languages: [
        { name: "Go", files: 2 },
        { name: "Ruby", files: 3 },
      ],
      evidence: ["cmd/a.go"],
      packs: [],
      ...overrides,
    }) as unknown as Suggestion;

  test("passes the workspace and kibi block to the suggestion", async () => {
    const manifest = {
      kibi: {
        plugins: [
          { package: "p", capabilities: { c: "augment" } },
          { package: "q", capabilities: "x" },
          { package: "r", capabilities: null },
          { package: "s" },
          { package: 3 },
          null,
        ],
        declinedPlugins: ["d", 1],
        declinedLanguagePacks: ["kibi-lang-ruby", 7],
        generatedPaths: ["gen/**"],
      },
    };
    await pluginOffers(context(manifest), ["cmd/a.go"]);
    const config = {
      plugins: [
        { package: "p", capabilities: { c: "augment" } },
        { package: "q", capabilities: {} },
        { package: "r", capabilities: {} },
        { package: "s", capabilities: {} },
      ],
      declinedPlugins: ["d"],
      declinedLanguagePacks: ["kibi-lang-ruby", 7],
      generatedPaths: ["gen/**"],
    };
    expect(suggest.mock.calls).toStrictEqual([
      [
        ["cmd/a.go"],
        config,
        "installed",
        "pinned",
        undefined,
        "declares",
        "relevance",
      ] as never,
    ]);
    expect(relevance.mock.calls).toStrictEqual([
      ["/ws", ["cmd/a.go"], config] as never,
    ]);
    expect(declares.mock.calls).toStrictEqual([
      [manifest, "kibi-plugin-treesitter"] as never,
    ]);
  });

  test("reads lists that are not lists as empty", async () => {
    await pluginOffers(
      context({ kibi: { declinedLanguagePacks: 5, generatedPaths: "x" } }),
      ["cmd/a.go"],
    );
    expect(suggest.mock.calls[0]?.[1]).toStrictEqual({
      plugins: [],
      declinedPlugins: [],
    });
    await pluginOffers(context({}), ["cmd/a.go"]);
    expect(suggest.mock.calls[1]?.[1]).toStrictEqual({
      plugins: [],
      declinedPlugins: [],
    });
  });

  test("asks for the files of any language the plugin reads", async () => {
    for (const file of ["cmd/a.go", "src/x.tf", "lib/b.rb", "include/a.h"]) {
      suggest.mockClear();
      await pluginOffers(context({}), [file]);
      expect(suggest).toHaveBeenCalledTimes(1);
    }
    suggest.mockClear();
    const quiet = context({}, 0);
    expect(await pluginOffers(quiet, ["README.md", "src/a.ts"])).toStrictEqual(
      [],
    );
    expect(suggest).not.toHaveBeenCalled();
    expect((quiet as unknown as { reads: string[] }).reads).toStrictEqual([]);
  });

  test("offers the first capability and activates the rest", async () => {
    suggest.mockReturnValue(
      references({
        capabilities: ["cap.a", "cap.b", "cap.c"],
        packs: ["kibi-lang-go"],
      }),
    );
    expect(await pluginOffers(context({}), ["cmd/a.go"])).toStrictEqual([
      {
        package: "kibi-plugin-treesitter",
        capability: "cap.a",
        mode: "augment",
        reason: "described",
        fileCount: 5,
        evidence: ["cmd/a.go"],
        alsoInstall: ["kibi-lang-go"],
        alsoActivate: { "cap.b": "augment", "cap.c": "augment" },
      },
    ]);
    suggest.mockReturnValue(references());
    expect(await pluginOffers(context({}), ["cmd/a.go", ...UI])).toStrictEqual([
      {
        package: "kibi-plugin-treesitter",
        capability: "cap.a",
        mode: "augment",
        reason: "described",
        fileCount: 5,
        evidence: ["cmd/a.go"],
      },
      {
        package: "kibi-plugin-ui",
        capability: "kibi.check-policy.v1",
        mode: "augment",
        reason: "3 UI component file(s) found",
        fileCount: 3,
        evidence: UI,
      },
    ]);
  });

  test("offers nothing without a capability to activate", async () => {
    suggest.mockReturnValue(references({ capabilities: [] }));
    expect(await pluginOffers(context({}), ["cmd/a.go"])).toStrictEqual([]);
  });
});

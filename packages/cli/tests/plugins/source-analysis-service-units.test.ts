import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import type {
  PluginProviderStamp,
  SourceAnalysisResult,
  SymbolExtractorV1,
  SymbolExtractorV2,
} from "kibi-plugin-sdk";
import type {
  CapabilityModeResolution,
  CapabilityProviderBinding,
  CapabilityRegistry,
} from "../../src/plugins/registry.js";
import {
  type HostSourceAnalysisResultV2,
  SourceAnalysisService,
  analyzeWithResolution,
  createConservativeFallbackAnalysis,
  createSourceAnalysisService,
  providerBudgetMs,
} from "../../src/plugins/source-analysis-service.js";

afterEach(() => {
  mock.restore();
});

const permissions = { network: false, metered: false, secrets: [] };

function stamp(pluginId: string): PluginProviderStamp {
  return {
    pluginId,
    pluginVersion: "1.0.0",
    capability: "kibi.symbol-extractor.v2",
    mode: "augment",
    external: false,
    network: false,
    metered: false,
  };
}

function binding<T>(pluginId: string, capability: T) {
  return {
    pluginId,
    pluginVersion: "1.0.0",
    packageName: null,
    mode: "builtin",
    permissions,
    external: false,
    capability,
    stamp: stamp(pluginId),
  } as CapabilityProviderBinding<T>;
}

function resolution<T>(
  builtin: CapabilityProviderBinding<T>,
  rest: Partial<CapabilityModeResolution<T>> = {},
): CapabilityModeResolution<T> {
  return { builtin, replace: null, augment: [], shadow: [], ...rest };
}

const fingerprintOf = (...parts: string[]) =>
  createHash("sha256").update(parts.join("\0")).digest("hex");

const providerPrint = (pluginId: string) =>
  createHash("sha256")
    .update(`${pluginId}\u00001.0.0\u0000kibi.symbol-extractor.v2`)
    .digest("hex");

type V2Input = { path: string; content: string; language?: string };

function v2Result(input: V2Input, extra: Record<string, unknown> = {}) {
  return {
    contractVersion: "kibi.symbol-extractor.v2" as const,
    status: "ok" as const,
    sourceFile: input.path,
    language: input.language ?? "unknown",
    module: {
      title: "m",
      language: input.language ?? "unknown",
      analysisMode: "parser" as const,
    },
    symbols: [],
    diagnostics: [],
    uncoveredRanges: [],
    ...extra,
  };
}

function v2(
  id: string,
  options: {
    supports?: (input: { path: string; language?: string }) => boolean;
    analyze?: (input: V2Input & { timeoutMs?: number }) => unknown;
  } = {},
) {
  const supported: unknown[] = [];
  const analyzed: unknown[] = [];
  const capability = {
    id,
    supports: (input: { path: string; language?: string }) => {
      supported.push(input);
      return options.supports ? options.supports(input) : true;
    },
    analyze: async (input: V2Input & { timeoutMs?: number }) => {
      analyzed.push(input);
      return options.analyze ? options.analyze(input) : v2Result(input);
    },
  } as unknown as SymbolExtractorV2;
  return { capability, supported, analyzed };
}

function v2Service(
  resolved: CapabilityModeResolution<SymbolExtractorV2>,
  options: Record<string, unknown> = {},
) {
  return new SourceAnalysisService({
    registry: {} as CapabilityRegistry,
    resolveExtractorsV2: async () => resolved,
    ...options,
  });
}

function fallbackV2(
  filePath: string,
  language: string,
  status: "unsupported" | "failed",
  code: string,
  message: string,
  inputFingerprint: string,
  title = "a",
): HostSourceAnalysisResultV2 {
  return {
    contractVersion: "kibi.symbol-extractor.v2",
    status,
    sourceFile: filePath,
    language,
    module: {
      title,
      language,
      analysisMode: "fallback",
      fallbackReason: code,
    },
    symbols: [],
    diagnostics: [{ code, message }],
    uncoveredRanges: [],
    providerId: null,
    stamp: null,
    inputFingerprint,
    providerFingerprint: null,
    shadowComparisons: [],
  };
}

describe("providerBudgetMs", () => {
  test("keeps a tenth of the deadline, at most a second, as grace", () => {
    expect(providerBudgetMs(10000)).toBe(9000);
    expect(providerBudgetMs(60000)).toBe(59000);
    expect(providerBudgetMs(500)).toBe(450);
    expect(providerBudgetMs(19)).toBe(18);
    expect(providerBudgetMs(1)).toBe(1);
  });
});

describe("analyzeTextV2", () => {
  test("binds a successful result to the input and provider", async () => {
    const builtin = v2("builtin.v2");
    const result = await v2Service(
      resolution(binding("builtin", builtin.capability)),
    ).analyzeTextV2("src/a.ts", "export const a = 1;\n", " TypeScript ");
    expect(result).toStrictEqual({
      ...v2Result({
        path: "src/a.ts",
        content: "",
        language: "typescript",
      }),
      providerId: "builtin.v2",
      stamp: stamp("builtin"),
      inputFingerprint: fingerprintOf(
        "src/a.ts",
        "export const a = 1;\n",
        "language",
        "typescript",
        "typescript",
      ),
      providerFingerprint: providerPrint("builtin"),
      shadowComparisons: [],
    });
    expect(builtin.supported).toStrictEqual([
      { path: "src/a.ts", language: "typescript" },
    ]);
    expect(builtin.analyzed).toStrictEqual([
      {
        path: "src/a.ts",
        content: "export const a = 1;\n",
        language: "typescript",
        timeoutMs: 9000,
      },
    ]);
  });

  test("uses a host fingerprint for a known plugin", async () => {
    const builtin = v2("builtin.v2");
    const result = await v2Service(
      resolution(binding("builtin", builtin.capability)),
      { providerFingerprints: { builtin: "host-print", other: "x" } },
    ).analyzeTextV2("src/a.ts", "");
    expect(result.providerFingerprint).toBe("host-print");
  });

  test("never sends Kibi's own knowledge files to a provider", async () => {
    const builtin = v2("builtin.v2");
    const service = v2Service(
      resolution(binding("builtin", builtin.capability)),
    );
    for (const file of [".kb/schema.pl", "./.kb/a.ts", ".kb\\a.ts"]) {
      const result = await service.analyzeTextV2(file, "x");
      expect([file, result.status, result.diagnostics]).toStrictEqual([
        file,
        "unsupported",
        [
          {
            code: "kibi_knowledge_base_file",
            message:
              "Kibi's own knowledge-base files are not analyzed as project source.",
          },
        ],
      ]);
    }
    expect(builtin.supported).toStrictEqual([]);
    for (const file of ["src/.kb/a.ts", ".kbx/a.ts", "x.kb/a.ts"])
      expect((await service.analyzeTextV2(file, "x")).status).toBe("ok");
    expect(await service.analyzeTextV2(".kb/a.ts", "x")).toStrictEqual(
      fallbackV2(
        ".kb/a.ts",
        "typescript",
        "unsupported",
        "kibi_knowledge_base_file",
        "Kibi's own knowledge-base files are not analyzed as project source.",
        fingerprintOf(".kb/a.ts", "x", "language", "typescript", ""),
      ),
    );
  });

  test("refuses input past the code unit or byte limit", async () => {
    const builtin = v2("builtin.v2");
    const service = v2Service(
      resolution(binding("builtin", builtin.capability)),
    );
    const limit =
      "Source input exceeds the 5242880 UTF-16 code unit or 8 MiB UTF-8 analysis limit";
    const status = async (content: string): Promise<unknown[]> => {
      const result = await service.analyzeTextV2("src/a.ts", content);
      return [
        result.status,
        result.diagnostics[0]?.message,
        result.diagnostics[0]?.code,
      ];
    };
    const units = 5 * 1024 * 1024;
    expect(await status("a".repeat(units))).toStrictEqual([
      "ok",
      undefined,
      undefined,
    ]);
    expect(await status("a".repeat(units + 1))).toStrictEqual([
      "failed",
      limit,
      "input_limit",
    ]);
    const wide = "€".repeat(2796202);
    expect(await status(`${wide}ab`)).toStrictEqual([
      "ok",
      undefined,
      undefined,
    ]);
    expect(await status(`${wide}abc`)).toStrictEqual([
      "failed",
      limit,
      "input_limit",
    ]);
  });

  test("reports a failed provider resolution", async () => {
    const service = new SourceAnalysisService({
      registry: {} as CapabilityRegistry,
      resolveExtractorsV2: async () => {
        throw new Error("boom");
      },
    });
    expect(await service.analyzeTextV2("src/a.ts", "")).toStrictEqual(
      fallbackV2(
        "src/a.ts",
        "typescript",
        "failed",
        "provider_resolution_failed",
        "Error: boom",
        fingerprintOf("src/a.ts", "", "language", "typescript", ""),
      ),
    );
  });

  test("resolves v2 providers from the registry by default", async () => {
    const builtin = v2("builtin.v2");
    const service = new SourceAnalysisService({
      registry: {
        resolveSymbolExtractorsV2: async () =>
          resolution(binding("builtin", builtin.capability)),
      } as unknown as CapabilityRegistry,
    });
    expect((await service.analyzeTextV2("src/a.ts", "")).providerId).toBe(
      "builtin.v2",
    );
  });

  test("does not dispatch a file that is not one language", async () => {
    const builtin = v2("builtin.v2");
    const service = v2Service(
      resolution(binding("builtin", builtin.capability)),
    );
    const outcome = async (
      file: string,
      content: string,
    ): Promise<unknown[]> => {
      const result = await service.analyzeTextV2(file, content);
      return [result.status, result.diagnostics[0]?.code];
    };
    expect(await outcome("a.pl", "")).toStrictEqual([
      "unsupported",
      "source_language_ambiguous",
    ]);
    expect(await outcome("a.py", "#!/usr/bin/ruby\n")).toStrictEqual([
      "unsupported",
      "source_classification_conflict",
    ]);
    expect(await outcome("a.json", "{}")).toStrictEqual([
      "unsupported",
      "source_file_level_only",
    ]);
    expect(await service.analyzeTextV2("a.json", "{}")).toStrictEqual(
      fallbackV2(
        "a.json",
        "json",
        "unsupported",
        "source_file_level_only",
        "JSON is classified as a file-level document.",
        fingerprintOf("a.json", "{}", "file-level", "json", ""),
      ),
    );
    expect(builtin.supported).toStrictEqual([]);
    expect(await outcome("bin/tool", "")).toStrictEqual(["ok", undefined]);
    expect(builtin.supported).toStrictEqual([{ path: "bin/tool" }]);
    expect(builtin.analyzed).toStrictEqual([
      { path: "bin/tool", content: "", timeoutMs: 9000 },
    ]);
  });

  test("takes the first claiming provider in replace, builtin, augment order", async () => {
    const order: string[] = [];
    const make = (id: string, claims: boolean) =>
      v2(id, {
        supports: () => {
          order.push(id);
          return claims;
        },
      }).capability;
    const run = async (
      replace: boolean | null,
      builtin: boolean,
      augment: boolean[],
    ) => {
      order.length = 0;
      const resolved = resolution(
        binding("builtin", make("builtin", builtin)),
        {
          replace:
            replace === null
              ? null
              : binding("replace", make("replace", replace)),
          augment: augment.map((claims, index) =>
            binding(`aug${index}`, make(`aug${index}`, claims)),
          ),
        },
      );
      const result = await v2Service(resolved).analyzeTextV2("src/a.ts", "");
      return [result.providerId, [...order]];
    };
    expect(await run(true, true, [true])).toStrictEqual([
      "replace",
      ["replace"],
    ]);
    expect(await run(false, true, [true])).toStrictEqual([
      "builtin",
      ["replace", "builtin"],
    ]);
    expect(await run(null, false, [false, true, true])).toStrictEqual([
      "aug1",
      ["builtin", "aug0", "aug1"],
    ]);
    expect(await run(false, false, [false])).toStrictEqual([
      null,
      ["replace", "builtin", "aug0"],
    ]);
    const none = await v2Service(
      resolution(binding("builtin", make("builtin", false))),
    ).analyzeTextV2("src/a.ts", "");
    expect(none).toStrictEqual(
      fallbackV2(
        "src/a.ts",
        "typescript",
        "unsupported",
        "unsupported_language",
        "No configured source analyzer claims this file; file-level review remains required.",
        fingerprintOf("src/a.ts", "", "language", "typescript", ""),
      ),
    );
  });

  test("keeps a claimed failure authoritative", async () => {
    const failing = v2("failing.v2", {
      analyze: () => {
        throw new Error("parse error");
      },
    });
    const later = v2("later.v2");
    const result = await v2Service(
      resolution(binding("failing", failing.capability), {
        augment: [binding("later", later.capability)],
      }),
    ).analyzeTextV2("src/a.ts", "");
    expect(result).toStrictEqual({
      ...fallbackV2(
        "src/a.ts",
        "typescript",
        "failed",
        "provider_failed",
        "Extractor 'failing.v2' failed: Error: parse error",
        fingerprintOf("src/a.ts", "", "language", "typescript", ""),
      ),
      providerId: "failing.v2",
      stamp: stamp("failing"),
    });
    expect(later.supported).toStrictEqual([]);
    const throwing = v2("throwing.v2", {
      supports: () => {
        throw "no";
      },
    });
    expect(
      (
        await v2Service(
          resolution(binding("throwing", throwing.capability)),
        ).analyzeTextV2("src/a.ts", "")
      ).diagnostics,
    ).toStrictEqual([
      {
        code: "provider_failed",
        message: "Extractor 'throwing.v2' failed: no",
      },
    ]);
    const invalid = v2("invalid.v2", { analyze: () => "nope" });
    expect(
      (
        await v2Service(
          resolution(binding("invalid", invalid.capability)),
        ).analyzeTextV2("src/a.ts", "")
      ).diagnostics,
    ).toStrictEqual([
      {
        code: "provider_failed",
        message:
          "Extractor 'invalid.v2' failed: PluginValidationError: symbol analysis v2 result must be an object",
      },
    ]);
  });

  test("abandons a provider at the host deadline", async () => {
    const slow = v2("slow.v2", { analyze: () => new Promise(() => {}) });
    const result = await v2Service(
      resolution(binding("slow", slow.capability)),
      { analysisTimeoutMs: 20 },
    ).analyzeTextV2("src/a.ts", "");
    expect(result.diagnostics).toStrictEqual([
      {
        code: "provider_failed",
        message:
          "Extractor 'slow.v2' failed: Error: Source analysis deadline exceeded",
      },
    ]);
    expect(slow.analyzed).toStrictEqual([
      { path: "src/a.ts", content: "", language: "typescript", timeoutMs: 18 },
    ]);
  });

  test("clamps the host deadline and clears its timer", async () => {
    const budget = async (analysisTimeoutMs: unknown) => {
      const builtin = v2("builtin.v2");
      await v2Service(resolution(binding("builtin", builtin.capability)), {
        analysisTimeoutMs,
      }).analyzeTextV2("src/a.ts", "");
      return (builtin.analyzed[0] as { timeoutMs: number }).timeoutMs;
    };
    expect(await budget(undefined)).toBe(9000);
    expect(await budget(0)).toBe(9000);
    expect(await budget(-5)).toBe(9000);
    expect(await budget(Number.NaN)).toBe(9000);
    expect(await budget(Number.POSITIVE_INFINITY)).toBe(9000);
    expect(await budget(70000)).toBe(59000);
    expect(await budget(60000)).toBe(59000);
    expect(await budget(500)).toBe(450);
    const set = spyOn(globalThis, "setTimeout");
    const clear = spyOn(globalThis, "clearTimeout");
    await budget(500);
    const timer = set.mock.results.at(-1)?.value;
    expect(set.mock.calls.at(-1)?.[1]).toBe(500);
    expect(clear.mock.calls.map((call): unknown => call[0])).toContain(timer);
  });

  test("reports a waived language pack as a file-level review", async () => {
    const missing = v2("ts.v2", {
      analyze: (input) =>
        v2Result(input, {
          status: "unsupported",
          diagnostics: [
            {
              code: "TREESITTER_LANGUAGE_PACK_MISSING",
              message: "Install kibi-lang-typescript to read this file.",
            },
          ],
        }),
    });
    const result = await v2Service(
      resolution(binding("ts", missing.capability)),
      { languagePackWaiver: () => "The project declined kibi-lang-typescript" },
    ).analyzeTextV2("src/a.ts", "");
    expect(result).toStrictEqual(
      fallbackV2(
        "src/a.ts",
        "typescript",
        "unsupported",
        "language_pack_not_required",
        "The project declined kibi-lang-typescript; file-level review remains required.",
        fingerprintOf("src/a.ts", "", "language", "typescript", ""),
      ),
    );
  });

  test("records shadow providers without changing the canonical result", async () => {
    const builtin = v2("builtin.v2");
    const ok = v2("ok.v2", {
      analyze: (input) =>
        v2Result(input, {
          symbols: [
            {
              name: "a",
              kind: "function",
              startLine: 1,
              startColumn: 0,
              endLine: 1,
              endColumn: 1,
            },
          ],
        }),
    });
    const partial = v2("partial.v2", {
      analyze: (input) =>
        v2Result(input, {
          status: "unsupported",
          diagnostics: [
            { code: "A", message: "first" },
            { code: "B", message: "second" },
          ],
        }),
    });
    const silent = v2("silent.v2", { supports: () => false });
    const result = await v2Service(
      resolution(binding("builtin", builtin.capability), {
        shadow: [
          binding("ok", ok.capability),
          binding("silent", silent.capability),
          binding("partial", partial.capability),
        ],
      }),
    ).analyzeTextV2("src/a.ts", "ab\n");
    expect(result.providerId).toBe("builtin.v2");
    expect(result.symbols).toStrictEqual([]);
    expect(result.shadowComparisons).toStrictEqual([
      {
        pluginId: "ok",
        stamp: stamp("ok"),
        symbolCount: 1,
        language: "typescript",
        ok: true,
      },
      {
        pluginId: "partial",
        stamp: stamp("partial"),
        symbolCount: 0,
        language: "typescript",
        ok: false,
        error: "first; second",
      },
    ]);
  });
});

type V1Symbol = {
  name: string;
  kind: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
};

function v1Result(filePath: string, symbols: V1Symbol[] = []) {
  return <SourceAnalysisResult>{
    sourceFile: filePath,
    language: "typescript",
    module: { title: "a", language: "typescript", analysisMode: "parser" },
    symbols,
  };
}

function v1(
  id: string,
  options: {
    supports?: boolean;
    analyze?: (input: { path: string; content: string }) => unknown;
  } = {},
): SymbolExtractorV1 {
  return {
    id,
    supports: () => options.supports ?? true,
    analyze: (input: { path: string; content: string }) =>
      options.analyze ? options.analyze(input) : v1Result(input.path),
  } as unknown as SymbolExtractorV1;
}

const thrower = (id: string, error: unknown) =>
  v1(id, {
    analyze: () => {
      throw error;
    },
  });

describe("analyzeText", () => {
  const sym = (name: string, extra: Partial<V1Symbol> = {}): V1Symbol => ({
    name,
    kind: "function",
    startLine: 1,
    startColumn: 0,
    endLine: 2,
    endColumn: 1,
    ...extra,
  });

  test("returns the builtin result without duplicate symbols", async () => {
    const symbols = [
      sym("a"),
      sym("a"),
      sym("b"),
      sym("a", { kind: "class" }),
      sym("a", { startLine: 2, endLine: 3 }),
      sym("a", { startColumn: 1 }),
      sym("a", { endLine: 3 }),
      sym("a", { endColumn: 2 }),
      sym("a", { startLine: 1, startColumn: 10, endLine: 12 }),
      sym("a", { startLine: 11, startColumn: 0, endLine: 12 }),
    ];
    const result = await analyzeWithResolution(
      resolution(
        binding(
          "builtin",
          v1("builtin.v1", {
            analyze: (input) => v1Result(input.path, symbols),
          }),
        ),
      ),
      "src/a.ts",
      "code",
    );
    expect(result).toStrictEqual({
      ...v1Result("src/a.ts", [symbols[0], ...symbols.slice(2)] as V1Symbol[]),
      providerId: "builtin.v1",
      stamp: stamp("builtin"),
      fallbackUsed: false,
      diagnostics: [],
      shadowComparisons: [],
    });
  });

  test("passes the path and content to the extractor", async () => {
    const seen: unknown[] = [];
    await analyzeWithResolution(
      resolution(
        binding(
          "builtin",
          v1("builtin.v1", {
            analyze: (input) => {
              seen.push(input);
              return v1Result(input.path);
            },
          }),
        ),
      ),
      "src/a.ts",
      "code",
    );
    expect(seen).toStrictEqual([{ path: "src/a.ts", content: "code" }]);
  });

  test("tries augment extractors in order when the builtin does not claim", async () => {
    const result = await analyzeWithResolution(
      resolution(binding("builtin", v1("builtin.v1", { supports: false })), {
        augment: [
          binding("skip", v1("skip.v1", { supports: false })),
          binding("bad", thrower("bad.v1", new Error("bad input"))),
          binding("good", v1("good.v1")),
          binding("late", thrower("late.v1", new Error("never"))),
        ],
      }),
      "src/a.ts",
      "",
    );
    expect([result.providerId, result.diagnostics]).toStrictEqual([
      "good.v1",
      ["extractor 'bad.v1' failed: bad input"],
    ]);
  });

  test("falls back conservatively when no extractor answers", async () => {
    const unsupported = await analyzeWithResolution(
      resolution(binding("builtin", v1("builtin.v1", { supports: false }))),
      "src/a.ts",
      "",
    );
    // The service reports its own diagnostics in place of the fallback's.
    expect(unsupported).toStrictEqual({
      ...createConservativeFallbackAnalysis("src/a.ts", "unsupported_language"),
      diagnostics: [],
    });
    const failed = await analyzeWithResolution(
      resolution(binding("builtin", thrower("builtin.v1", "text failure"))),
      "src/a.ts",
      "",
    );
    expect(failed).toStrictEqual({
      ...createConservativeFallbackAnalysis("src/a.ts", "provider_error"),
      diagnostics: ["extractor 'builtin.v1' failed: text failure"],
    });
  });

  test("falls back to the builtin when a replace extractor does not answer", async () => {
    const replaced = await analyzeWithResolution(
      resolution(binding("builtin", v1("builtin.v1")), {
        replace: binding("replace", v1("replace.v1")),
      }),
      "src/a.ts",
      "",
    );
    expect([
      replaced.providerId,
      replaced.fallbackUsed,
      replaced.stamp,
    ]).toStrictEqual(["replace.v1", false, stamp("replace")]);
    const fallback = await analyzeWithResolution(
      resolution(binding("builtin", v1("builtin.v1")), {
        replace: binding("replace", v1("replace.v1", { supports: false })),
      }),
      "src/a.ts",
      "",
    );
    expect(fallback).toStrictEqual({
      ...v1Result("src/a.ts"),
      providerId: "builtin.v1",
      stamp: { ...stamp("builtin"), fallbackUsed: true },
      fallbackUsed: true,
      diagnostics: [
        "replace extractor 'replace' did not claim or failed; trying builtin",
      ],
      shadowComparisons: [],
    });
    const failed = await analyzeWithResolution(
      resolution(binding("builtin", thrower("builtin.v1", new Error("b"))), {
        replace: binding("replace", thrower("replace.v1", new Error("r"))),
        augment: [binding("aug", v1("aug.v1"))],
      }),
      "src/a.ts",
      "",
    );
    expect(failed).toStrictEqual({
      ...createConservativeFallbackAnalysis("src/a.ts", "provider_error"),
      diagnostics: [
        "extractor 'replace.v1' failed: r",
        "replace extractor 'replace' did not claim or failed; trying builtin",
        "extractor 'builtin.v1' failed: b",
      ],
    });
  });

  test("compares shadow extractors without changing the canonical symbols", async () => {
    const result = await analyzeWithResolution(
      resolution(binding("builtin", v1("builtin.v1")), {
        shadow: [
          binding(
            "two",
            v1("two.v1", {
              analyze: (input) => v1Result(input.path, [sym("a"), sym("b")]),
            }),
          ),
          binding("skip", v1("skip.v1", { supports: false })),
          binding("bad", thrower("bad.v1", new Error("shadow broke"))),
          binding("text", thrower("text.v1", "plain")),
        ],
      }),
      "src/a.py",
      "",
    );
    expect(result.symbols).toStrictEqual([]);
    expect(result.shadowComparisons).toStrictEqual([
      {
        pluginId: "two",
        stamp: stamp("two"),
        symbolCount: 2,
        language: "typescript",
        ok: true,
      },
      {
        pluginId: "bad",
        stamp: stamp("bad"),
        symbolCount: 0,
        language: "python",
        ok: false,
        error: "shadow broke",
      },
      {
        pluginId: "text",
        stamp: stamp("text"),
        symbolCount: 0,
        language: "python",
        ok: false,
        error: "plain",
      },
    ]);
    expect(result.diagnostics).toStrictEqual([
      "shadow extractor 'two' produced 2 non-canonical symbol(s)",
      "shadow extractor 'bad' failed: shadow broke",
      "shadow extractor 'text' failed: plain",
    ]);
  });

  test("resolves v1 extractors from the registry by default", async () => {
    const service = createSourceAnalysisService({
      registry: {
        resolveSymbolExtractors: async () =>
          resolution(binding("builtin", v1("builtin.v1"))),
      } as unknown as CapabilityRegistry,
    });
    expect(service).toBeInstanceOf(SourceAnalysisService);
    expect((await service.analyzeText("src/a.ts", "")).providerId).toBe(
      "builtin.v1",
    );
  });
});

describe("createConservativeFallbackAnalysis", () => {
  test("names the module after the file stem", () => {
    expect(
      createConservativeFallbackAnalysis("src/main.rs", "why"),
    ).toStrictEqual({
      sourceFile: "src/main.rs",
      language: "rust",
      providerId: null,
      stamp: null,
      fallbackUsed: true,
      diagnostics: ["conservative fallback: why"],
      shadowComparisons: [],
      module: {
        title: "main",
        language: "rust",
        analysisMode: "fallback",
        fallbackReason: "why",
      },
      symbols: [],
    });
    expect(
      createConservativeFallbackAnalysis(".bashrc", "x").module.title,
    ).toBe(".bashrc");
    expect(
      createConservativeFallbackAnalysis("a/b.tar.gz", "x").module.title,
    ).toBe("b.tar");
  });
});

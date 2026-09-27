// executable_for TEST-source-analysis-v2-contract
import { describe, expect, test } from "bun:test";
import {
  createBuiltinTsMorphSymbolExtractor,
  createBuiltinTsMorphSymbolExtractorV2,
} from "kibi-plugin-builtin";
import type {
  SourceAnalysisResultV2,
  SymbolExtractorV2,
  SymbolExtractorV2AnalyzeInput,
  SymbolExtractorV2SupportsInput,
} from "kibi-plugin-sdk";
import type {
  CapabilityModeResolution,
  CapabilityProviderBinding,
} from "../../src/plugins/registry.js";
import { CapabilityRegistry } from "../../src/plugins/registry.js";
import { SourceAnalysisService } from "../../src/plugins/source-analysis-service.js";
import { classifySource } from "../../src/plugins/source-classification.js";

function result(input: SymbolExtractorV2AnalyzeInput): SourceAnalysisResultV2 {
  const language = input.language ?? "unknown";
  return {
    contractVersion: "kibi.symbol-extractor.v2",
    status: "ok",
    sourceFile: input.path,
    language,
    module: {
      title: input.path.split(/[\\/]/).at(-1) ?? input.path,
      language,
      analysisMode: "parser",
    },
    symbols: [],
    diagnostics: [],
    uncoveredRanges: [],
  };
}

function binding(
  capability: SymbolExtractorV2,
): CapabilityProviderBinding<SymbolExtractorV2> {
  return {
    pluginId: "test-language-provider",
    pluginVersion: "1.0.0",
    packageName: null,
    mode: "builtin",
    external: false,
    permissions: { network: false, secrets: [], metered: false },
    capability,
    stamp: {
      pluginId: "test-language-provider",
      pluginVersion: "1.0.0",
      capability: "kibi.symbol-extractor.v2",
      mode: "augment",
      external: false,
      network: false,
      metered: false,
    },
  };
}

function serviceFor(capability: SymbolExtractorV2): SourceAnalysisService {
  const builtin = binding(capability);
  const resolution: CapabilityModeResolution<SymbolExtractorV2> = {
    builtin,
    replace: null,
    augment: [],
    shadow: [],
  };
  return new SourceAnalysisService({
    registry: new CapabilityRegistry({ workspaceRoot: "/unused" }),
    resolveExtractorsV2: async () => resolution,
  });
}

describe("deterministic source classification", () => {
  test("keeps ambiguous headers and Prolog/Perl paths explicit until selected", () => {
    expect(
      classifySource("include/shared.h", "int shared(void);"),
    ).toMatchObject({
      kind: "ambiguous",
      language: "c-or-cpp",
      candidates: ["c", "cpp"],
    });
    expect(
      classifySource("include/shared.h", "int shared(void);", "c++"),
    ).toMatchObject({ kind: "language", language: "cpp", source: "explicit" });
    expect(
      classifySource("rules/shared.pl", "member(alice, bob)."),
    ).toMatchObject({
      kind: "ambiguous",
      language: "perl-or-prolog",
      candidates: ["perl", "prolog"],
    });
    expect(
      classifySource("rules/shared.pl", "member(alice, bob).", "perl"),
    ).toMatchObject({
      kind: "file-level",
      language: "perl",
      source: "explicit",
    });
    expect(
      classifySource("rules/shared.pl", "#!/usr/bin/env prolog\nmember(a,b)."),
    ).toMatchObject({
      kind: "file-level",
      language: "prolog",
      source: "shebang",
    });
  });

  test("labels SQL, HTML, CSS, JSON, and YAML as file-level documents", () => {
    for (const [filePath, language] of [
      ["query.sql", "sql"],
      ["page.html", "html"],
      ["theme.css", "css"],
      ["package.json", "json"],
      ["settings.yaml", "yaml"],
    ] as const) {
      expect(classifySource(filePath, "content")).toMatchObject({
        kind: "file-level",
        language,
      });
    }
  });

  test("reads bounded direct and env shebangs with BOM, CRLF, options, and -S", () => {
    const cases = [
      ["run", "#!/opt/python/bin/python3.12 -I\r\nprint('ok')\r\n", "python"],
      ["run", "\uFEFF#!/usr/bin/env -S 'ruby3.2 -w'\r\nputs :ok\r\n", "ruby"],
      [
        "run",
        "#!/usr/bin/env PYTHONUNBUFFERED=1 -u TRACE -S python3 -I\npass\n",
        "python",
      ],
      [
        "run.py",
        "#!/usr/bin/env -S -u TRACE python3 -I\r\ndef task():\r\n    return 1\r\n",
        "python",
      ],
      [
        "run",
        "#!/usr/bin/env -S -i python3\ndef task():\n    return 1\n",
        "python",
      ],
      [
        "run",
        "#!/usr/bin/env --split-string=\"node --no-warnings\"\r\nconsole.log('ok')\r\n",
        "javascript",
      ],
      [
        "run",
        "#!/usr/bin/env -S 'NODE_OPTIONS=--trace-warnings node --no-warnings'\nconsole.log('ok')\n",
        "javascript",
      ],
      ["run", "#!/bin/bash -e\ntrue\n", "bash"],
    ] as const;
    for (const [filePath, content, language] of cases) {
      expect(classifySource(filePath, content)).toMatchObject({
        kind: "language",
        language,
        source: "shebang",
      });
    }
    expect(classifySource("run", `#!${"x".repeat(600)}\n`)).toMatchObject({
      kind: "unknown",
      language: "unknown",
    });
  });

  test("keeps unsupported shell dialects file-level and reports signal conflicts", () => {
    expect(
      classifySource("run", "#!/usr/bin/env -S zsh -f\nprint ok\n"),
    ).toMatchObject({
      kind: "file-level",
      language: "shell",
    });
    expect(
      classifySource("run.sh", "#!/usr/bin/env fish\necho ok\n"),
    ).toMatchObject({
      kind: "file-level",
      language: "shell",
    });
    expect(
      classifySource("run", "#!/usr/bin/env -S groovy -e\nprint 'ok'\n"),
    ).toMatchObject({
      kind: "unknown",
      language: "unknown",
    });
    expect(
      classifySource("script.py", "#!/usr/bin/env bash\ntrue\n"),
    ).toMatchObject({
      kind: "conflict",
      language: "unknown",
      extensionLanguage: "python",
      shebangLanguage: "bash",
    });
    expect(
      classifySource("script.js", "#!/usr/bin/env python3\npass\n"),
    ).toMatchObject({
      kind: "conflict",
      language: "unknown",
      extensionLanguage: "javascript",
      shebangLanguage: "python",
    });
    expect(classifySource("run", "#!/usr/bin/env -S\n")).toMatchObject({
      kind: "unknown",
      language: "unknown",
    });
  });

  test("passes recognized language hints to v2 supports and analyze for extensionless files", async () => {
    const supportsInputs: SymbolExtractorV2SupportsInput[] = [];
    const analyzeInputs: SymbolExtractorV2AnalyzeInput[] = [];
    const extractor: SymbolExtractorV2 = {
      id: "test-language-extractor",
      supports(input) {
        supportsInputs.push(input);
        return input.language === "python" || input.language === "cpp";
      },
      async analyze(input) {
        analyzeInputs.push(input);
        return result(input);
      },
    };
    const service = serviceFor(extractor);

    const pythonContent =
      "#!/usr/bin/env -S python3 -I\r\nprint('unchanged')\r\n";
    const python = await service.analyzeTextV2("scripts/run", pythonContent);
    expect(python.status).toBe("ok");
    expect(python.providerId).toBe("test-language-extractor");
    expect(supportsInputs[0]).toEqual({
      path: "scripts/run",
      language: "python",
    });
    expect(analyzeInputs[0]).toEqual({
      path: "scripts/run",
      content: pythonContent,
      language: "python",
    });

    const header = await service.analyzeTextV2(
      "include/shared.h",
      "int f();",
      "c++",
    );
    expect(header.status).toBe("ok");
    expect(supportsInputs[1]).toEqual({
      path: "include/shared.h",
      language: "cpp",
    });
    expect(analyzeInputs[1]?.language).toBe("cpp");
    const sameHeaderAsC = await service.analyzeTextV2(
      "include/shared.h",
      "int f();",
      "c",
    );
    expect(sameHeaderAsC.inputFingerprint).not.toBe(header.inputFingerprint);
    expect(supportsInputs[2]).toEqual({
      path: "include/shared.h",
      language: "c",
    });

    const before = supportsInputs.length;
    const conflict = await service.analyzeTextV2(
      "scripts/conflict.py",
      "#!/usr/bin/env bash\ntrue\n",
    );
    expect(conflict.status).toBe("unsupported");
    expect(conflict.diagnostics[0]?.code).toBe(
      "source_classification_conflict",
    );
    expect(supportsInputs).toHaveLength(before);

    const fileLevel = await service.analyzeTextV2(
      "database/query.sql",
      "select 1;",
    );
    expect(fileLevel.status).toBe("unsupported");
    expect(fileLevel.language).toBe("sql");
    expect(supportsInputs).toHaveLength(before);

    const unknownSupports: SymbolExtractorV2SupportsInput[] = [];
    const unknownAnalyzes: SymbolExtractorV2AnalyzeInput[] = [];
    const generic = serviceFor({
      id: "generic-custom-file-extractor",
      supports(input) {
        unknownSupports.push(input);
        return input.path.endsWith(".custom");
      },
      async analyze(input) {
        unknownAnalyzes.push(input);
        return result(input);
      },
    });
    const custom = await generic.analyzeTextV2("data/sample.custom", "opaque");
    expect(custom.status).toBe("ok");
    expect(custom.providerId).toBe("generic-custom-file-extractor");
    expect(unknownSupports).toEqual([{ path: "data/sample.custom" }]);
    expect(unknownAnalyzes).toEqual([
      { path: "data/sample.custom", content: "opaque" },
    ]);
  });

  test("retains required provider resolution failures for unknown files", async () => {
    const service = new SourceAnalysisService({
      registry: new CapabilityRegistry({ workspaceRoot: "/unused" }),
      resolveExtractorsV2: async () => {
        throw new Error("required provider cannot be loaded");
      },
    });
    const result = await service.analyzeTextV2("data/sample.custom", "opaque");
    expect(result.status).toBe("failed");
    expect(result.diagnostics[0]?.code).toBe("provider_resolution_failed");
    expect(result.diagnostics[0]?.message).toContain(
      "required provider cannot be loaded",
    );
  });

  test("dispatches extensionless Node source to the real builtin without executing it", async () => {
    const content =
      "#!/usr/bin/env node\nthrow new Error('source must not execute');\nexport function runCliTask() { return 1; }\n";
    const v1 = createBuiltinTsMorphSymbolExtractor();
    const v2 = createBuiltinTsMorphSymbolExtractorV2();
    expect(v1.supports({ path: "scripts/tool" })).toBe(false);
    expect(v2.supports({ path: "scripts/tool", language: "javascript" })).toBe(
      true,
    );
    expect(
      v2.supports({ path: "scripts/tool.js", language: "typescript" }),
    ).toBe(false);

    const analysis = await serviceFor(v2).analyzeTextV2(
      "scripts/tool",
      content,
    );
    expect(analysis.status).toBe("ok");
    expect(analysis.language).toBe("javascript");
    expect(analysis.symbols.some((item) => item.name === "runCliTask")).toBe(
      true,
    );
    expect(analysis.providerId).toBe(v2.id);
  });
});

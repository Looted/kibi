// executable_for TEST-source-analysis-v2-contract
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { validateSourceAnalysisResultV2 } from "kibi-plugin-sdk";
import { createBoundedSourceAnalysisTimingEmitter } from "../dist/performance-timing.js";

// Make any accidental network use fail before either package is evaluated.
globalThis.fetch = async () => {
  throw new Error("network access is disabled in this test");
};

const { createTreeSitterSymbolExtractor, default: plugin } = await import(
  "../dist/index.js"
);
const extractor = createTreeSitterSymbolExtractor();
const fixture = (relativePath) =>
  readFile(new URL(`./fixtures/${relativePath}`, import.meta.url), "utf8");

function findSymbol(result, qualifiedName) {
  return result.symbols.find(
    (symbol) => symbol.qualifiedName === qualifiedName,
  );
}

function assertValidV2(result, input) {
  assert.deepEqual(validateSourceAnalysisResultV2(result, input), result);
}

describe("offline Tree-sitter symbol extractor", () => {
  it("marks bounded parser timing output as truncated instead of dropping it silently", () => {
    const event = {
      kind: "source-analysis",
      language: "python",
      parserInitializationWallMs: 1,
      parseWallMs: 2,
      analysisWallMs: 3,
      totalAnalysisWallMs: 6,
    };
    const eventLimitedLines = [];
    const emitEventLimited = createBoundedSourceAnalysisTimingEmitter(
      (line) => eventLimitedLines.push(line),
      { maxEvents: 2, maxBytes: 4096 },
    );
    emitEventLimited(event);
    emitEventLimited(event);
    emitEventLimited(event);
    assert.equal(eventLimitedLines.length, 2);
    assert.equal(
      JSON.parse(eventLimitedLines[0].slice("[kibi-performance] ".length)).kind,
      "source-analysis",
    );
    assert.deepEqual(
      JSON.parse(eventLimitedLines[1].slice("[kibi-performance] ".length)),
      { kind: "source-analysis-truncated", reason: "event_limit" },
    );

    const byteLimitedLines = [];
    const byteLimitMarker = `[kibi-performance] ${JSON.stringify({
      kind: "source-analysis-truncated",
      reason: "byte_limit",
    })}\n`;
    const emitByteLimited = createBoundedSourceAnalysisTimingEmitter(
      (line) => byteLimitedLines.push(line),
      {
        maxEvents: 10,
        maxBytes: Buffer.byteLength(byteLimitMarker, "utf8") + 1,
      },
    );
    emitByteLimited(event);
    emitByteLimited(event);
    assert.deepEqual(byteLimitedLines, [byteLimitMarker]);
  });

  it("exports package metadata version and the v2 plugin capability", async () => {
    const packageJson = JSON.parse(
      await readFile(new URL("../package.json", import.meta.url), "utf8"),
    );
    assert.equal(plugin.id, "kibi-plugin-treesitter");
    assert.equal(plugin.version, packageJson.version);
    assert.equal(
      plugin.capabilities.symbolExtractorV2.id,
      "kibi-plugin-treesitter.tree-sitter.v2",
    );
    assert.equal(plugin.permissions.network, false);
  });

  it("supports only catalog paths and normalizes explicit language aliases", () => {
    assert.equal(extractor.supports({ path: "src/a.py" }), true);
    assert.equal(extractor.supports({ path: "src/a.pyi" }), true);
    assert.equal(extractor.supports({ path: "src/a.go" }), true);
    assert.equal(extractor.supports({ path: "src/a.rs" }), true);
    assert.equal(extractor.supports({ path: "src/a.js" }), false);
    assert.equal(
      extractor.supports({ path: "src/a.unknown", language: " Python " }),
      true,
    );
  });

  it("starts its parser worker from Node --input-type entrypoints", () => {
    const input = {
      path: "entrypoint.py",
      content: "def entrypoint():\n    return 1\n",
    };
    const moduleUrl = new URL("../dist/index.js", import.meta.url).href;
    const childProgram = [
      `import { createTreeSitterSymbolExtractor } from ${JSON.stringify(moduleUrl)};`,
      `const result = await createTreeSitterSymbolExtractor().analyze(${JSON.stringify(input)});`,
      "process.stdout.write(JSON.stringify(result));",
    ].join("\n");
    const stdout = execFileSync(
      "node",
      ["--input-type=module", "-e", childProgram],
      { encoding: "utf8", timeout: 15_000 },
    );
    const result = JSON.parse(stdout);
    assert.equal(result.status, "ok");
    assertValidV2(result, input);
    assert(findSymbol(result, "entrypoint"));
  });

  it("keeps opt-in parser timings off the result and out of source metadata", async () => {
    const content = await fixture("python/nested-duplicate.py");
    const input = { path: "timing-fixture.py", content };
    const moduleUrl = new URL("../dist/index.js", import.meta.url).href;
    const childProgram = [
      `import { createTreeSitterSymbolExtractor } from ${JSON.stringify(moduleUrl)};`,
      `const result = await createTreeSitterSymbolExtractor().analyze(${JSON.stringify(input)});`,
      "process.stdout.write(JSON.stringify(result));",
    ].join("\n");
    const run = (enabled) => {
      const child = spawnSync(
        "node",
        ["--input-type=module", "-e", childProgram],
        {
          encoding: "utf8",
          timeout: 15_000,
          env: {
            ...process.env,
            KIBI_PERF_TIMINGS: enabled ? "1" : "0",
          },
        },
      );
      assert.equal(child.status, 0, child.stderr);
      return {
        result: JSON.parse(child.stdout),
        stderr: child.stderr,
      };
    };

    const defaultRun = run(false);
    const timedRun = run(true);
    assert.deepEqual(timedRun.result, defaultRun.result);
    assert.equal("performanceTimings" in timedRun.result, false);
    assert.equal(defaultRun.stderr.includes("[kibi-performance]"), false);
    const eventLines = timedRun.stderr
      .split("\n")
      .filter((line) => line.startsWith("[kibi-performance] "));
    assert.equal(eventLines.length, 1);
    const event = JSON.parse(eventLines[0].slice("[kibi-performance] ".length));
    assert.deepEqual(Object.keys(event).sort(), [
      "analysisWallMs",
      "kind",
      "language",
      "parseWallMs",
      "parserInitializationWallMs",
      "totalAnalysisWallMs",
    ]);
    assert.equal(event.kind, "source-analysis");
    assert.equal(event.language, "python");
    for (const key of [
      "parserInitializationWallMs",
      "parseWallMs",
      "analysisWallMs",
      "totalAnalysisWallMs",
    ]) {
      assert(Number.isFinite(event[key]) && event[key] >= 0);
    }
    assert.equal(eventLines[0].includes(input.path), false);
    assert.equal(eventLines[0].includes(input.content), false);
  });

  it("preserves same-named declarations in nested Python scopes", async () => {
    const content = await fixture("python/nested-duplicate.py");
    const input = { path: "nested-duplicate.py", content };
    const result = await extractor.analyze(input);
    assert.equal(result.status, "ok");
    assertValidV2(result, input);

    assert.deepEqual(
      result.symbols.map((symbol) => symbol.qualifiedName),
      ["Box", "Box.same", "Box.same.inner", "Crate", "Crate.same", "same"],
    );
    assert.equal(
      result.symbols.filter((symbol) => symbol.name === "same").length,
      3,
    );
    assert.equal(findSymbol(result, "Box.same").containerName, "Box");
    assert.equal(findSymbol(result, "Box.same.inner").kind, "function");
    assert.equal(findSymbol(result, "Box.same.inner").containerName, "same");
  });

  it("classifies Go structs, interfaces, aliases, functions and receiver methods", async () => {
    const content = await fixture("go/declarations.go");
    const input = { path: "declarations.go", content };
    const result = await extractor.analyze(input);
    assert.equal(result.status, "ok");
    assertValidV2(result, input);
    assert.deepEqual(
      result.symbols.map(({ qualifiedName, kind }) => [qualifiedName, kind]),
      [
        ["Box", "class"],
        ["Reader", "interface"],
        ["Count", "type"],
        ["same", "function"],
        ["Box.same", "method"],
      ],
    );
  });

  it("keeps Rust trait/impl context and UTF-16 columns after an emoji", async () => {
    const content = await fixture("rust/declarations.rs");
    const input = { path: "declarations.rs", content };
    const result = await extractor.analyze(input);
    assert.equal(result.status, "ok");
    assertValidV2(result, input);
    assert.equal(findSymbol(result, "Reader").kind, "interface");
    assert.equal(findSymbol(result, "Reader.read").kind, "method");
    assert.equal(findSymbol(result, "Reader for Box.read").kind, "method");
    assert.equal(findSymbol(result, "Box.same").kind, "method");
    const afterEmoji = findSymbol(result, "after_emoji");
    assert.equal(
      afterEmoji.startColumn,
      content.split("\n").at(-2).indexOf("fn after_emoji"),
    );
    assert.equal(
      afterEmoji.nameRange.startColumn,
      content.split("\n").at(-2).indexOf("after_emoji"),
    );
  });

  it("uses CRLF rows and reports syntax damage as partial with uncovered ranges", async () => {
    const crlf = await fixture("go/crlf.go");
    const parsed = await extractor.analyze({ path: "crlf.go", content: crlf });
    assert.equal(parsed.status, "ok");
    assert.equal(findSymbol(parsed, "keep").startLine, 3);

    const content = await fixture("python/incomplete.py");
    const input = { path: "incomplete.py", content };
    const result = await extractor.analyze(input);
    assert.equal(result.status, "partial");
    assertValidV2(result, input);
    assert(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === "TREESITTER_SYNTAX_ERROR",
      ),
    );
    assert(
      result.uncoveredRanges.some(
        (range) => range.reason === "syntax-error-may-hide-declarations",
      ),
    );
    assert(
      result.symbols.some((symbol) => symbol.name === "visible_after_error"),
    );
  });

  it("marks macro and exec-generated declarations as uncovered", async () => {
    const rustContent = await fixture("rust/macro-generated.rs");
    const rustInput = { path: "macro-generated.rs", content: rustContent };
    const rust = await extractor.analyze(rustInput);
    assert.equal(rust.status, "partial");
    assertValidV2(rust, rustInput);
    assert(rust.symbols.some((symbol) => symbol.name === "declared_in_source"));
    assert(
      !rust.symbols.some((symbol) => symbol.name === "generated_from_macro"),
    );
    assert(
      rust.diagnostics.some(
        (entry) => entry.code === "TREESITTER_MACRO_EXPANSION_UNAVAILABLE",
      ),
    );
    assert(
      rust.uncoveredRanges.some(
        (entry) => entry.reason === "unexpanded-macro-may-declare-symbols",
      ),
    );

    const pythonContent = await fixture("python/exec-generated.py");
    const pythonInput = { path: "exec-generated.py", content: pythonContent };
    const python = await extractor.analyze(pythonInput);
    assert.equal(python.status, "partial");
    assertValidV2(python, pythonInput);
    assert(
      python.symbols.some((symbol) => symbol.name === "declared_in_source"),
    );
    assert(
      !python.symbols.some((symbol) => symbol.name === "generated_from_exec"),
    );
    assert(
      python.diagnostics.some(
        (entry) => entry.code === "TREESITTER_DYNAMIC_DECLARATIONS_UNAVAILABLE",
      ),
    );

    const decoratedContent = await fixture("python/decorator-generated.py");
    const decoratedInput = {
      path: "decorator-generated.py",
      content: decoratedContent,
    };
    const decorated = await extractor.analyze(decoratedInput);
    assert.equal(decorated.status, "partial");
    assertValidV2(decorated, decoratedInput);
    assert(
      decorated.symbols.some((symbol) => symbol.name === "decorated_in_source"),
    );
    assert(
      decorated.diagnostics.some(
        (entry) => entry.code === "TREESITTER_DECORATOR_EXPANSION_UNAVAILABLE",
      ),
    );
  });

  it("returns explicit unsupported and input-limit results", async () => {
    const unsupported = await extractor.analyze({
      path: "notes.txt",
      content: "hello",
    });
    assert.equal(unsupported.status, "unsupported");
    assert.equal(
      unsupported.diagnostics[0].code,
      "TREESITTER_UNSUPPORTED_LANGUAGE",
    );
    assertValidV2(unsupported, { path: "notes.txt", content: "hello" });

    const content = "x".repeat(1_048_577);
    const oversized = await extractor.analyze({ path: "large.py", content });
    assert.equal(oversized.status, "failed");
    assert.equal(oversized.diagnostics[0].code, "TREESITTER_INPUT_LIMIT");
    assertValidV2(oversized, { path: "large.py", content });
  });
  it("serves many files concurrently from persistent workers without mixing results", async () => {
    const pooled = createTreeSitterSymbolExtractor();
    const inputs = Array.from({ length: 24 }, (_, index) =>
      index % 3 === 0
        ? {
            path: `pool/m${index}.py`,
            content: `def f${index}():\n    return ${index}\n`,
          }
        : index % 3 === 1
          ? {
              path: `pool/m${index}.go`,
              content: `package p\n\nfunc F${index}() {}\n`,
            }
          : { path: `pool/m${index}.rs`, content: `pub fn f${index}() {}\n` },
    );
    const results = await Promise.all(
      inputs.map((input) => pooled.analyze(input)),
    );
    results.forEach((result, index) => {
      const input = inputs[index];
      assert.equal(result.status, "ok", JSON.stringify(result.diagnostics));
      assertValidV2(result, input);
      assert.equal(result.sourceFile, input.path);
      assert.deepEqual(
        result.symbols.map((symbol) => symbol.name.toLowerCase()),
        [`f${index}`],
      );
    });
  });

  it("reports its own timeout within a host-granted budget and recovers afterwards", async () => {
    const pooled = createTreeSitterSymbolExtractor();
    const content = Array.from(
      { length: 20_000 },
      (_, index) => `def f${index}(a, b):\n    return a + b\n`,
    ).join("");
    const input = { path: "budget.py", content, timeoutMs: 1 };
    const startedAt = Date.now();
    const timedOut = await pooled.analyze(input);
    assert(Date.now() - startedAt < 5_000);
    assert.equal(timedOut.status, "failed");
    assert.equal(timedOut.diagnostics[0].code, "TREESITTER_ANALYSIS_TIMEOUT");
    assertValidV2(timedOut, input);

    const next = { path: "after-timeout.py", content: "def ok():\n    pass\n" };
    const recovered = await pooled.analyze(next);
    assert.equal(recovered.status, "ok");
    assert(findSymbol(recovered, "ok"));
  });
});

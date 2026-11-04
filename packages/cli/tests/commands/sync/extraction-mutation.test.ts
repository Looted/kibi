import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import path from "node:path";
import {
  normalizeExtractionSources,
  processExtractions,
} from "../../../src/commands/sync/extraction.js";
import {
  ManifestError,
  extractFromManifest,
} from "../../../src/extractors/manifest.js";
import {
  type ExtractionResult,
  extractFromMarkdown,
} from "../../../src/extractors/markdown.js";

const restores: Array<() => void> = [];
let warnings: string[] = [];

beforeEach(() => {
  warnings = [];
  const spy = spyOn(console, "warn").mockImplementation((...args) => {
    warnings.push(args.map(String).join(" "));
  });
  restores.push(() => spy.mockRestore());
});

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
});

function result(source: string, sourceFile?: string): ExtractionResult {
  return {
    entity: { id: "E", type: "req", source },
    relationships: [],
    ...(sourceFile === undefined ? {} : { sourceFile }),
  } as unknown as ExtractionResult;
}

const root = path.resolve("/work/space");

describe("normalizeExtractionSources", () => {
  test("makes workspace paths relative and keeps URIs and outside paths", () => {
    const normalized = normalizeExtractionSources(
      [
        result(path.join(root, "docs", "a.md"), path.join(root, "src", "a.ts")),
        result("https://example.com/x"),
        result("a1+b.-c://host\\y"),
        result("1http://host\\z"),
        result("x:/a\\b"),
        result("dir\\file.md"),
        result(path.join(root, "..", "other", "b.md")),
        result(`${root}-sibling/c.md`),
        result(root),
        result(`prefix${root}/d.md`),
      ],
      "/work/space/",
    );
    expect(
      normalized.map((item) => [item.entity.source, item.sourceFile]),
    ).toStrictEqual([
      ["docs/a.md", "src/a.ts"],
      ["https://example.com/x", undefined],
      ["a1+b.-c://host\\y", undefined],
      ["1http://host/z", undefined],
      ["x:/a/b", undefined],
      ["dir/file.md", undefined],
      [path.resolve(root, "..", "other", "b.md"), undefined],
      [`${root}-sibling/c.md`, undefined],
      [root, undefined],
      [`prefix${root}/d.md`, undefined],
    ]);
    expect(normalized[1]).toStrictEqual(result("https://example.com/x"));
    expect(normalized[0]).toStrictEqual(result("docs/a.md", "src/a.ts"));
  });

  test("keeps a URI with backslashes as written", () => {
    expect(
      normalizeExtractionSources([result("s3://bucket\\key")], root)[0]?.entity
        .source,
    ).toBe("s3://bucket\\key");
  });
});

describe("processExtractions", () => {
  const ok = (file: string) => result(`md:${file}`);

  test("collects results from both kinds of source", async () => {
    const output = await processExtractions(["a.md"], ["m.yaml"], false, root, {
      extractFromMarkdown: ok,
      extractFromManifest: (file) => [result(`m1:${file}`), result("m2")],
    });
    expect(output).toStrictEqual({
      results: [ok("a.md"), result("m1:m.yaml"), result("m2")],
      failedCacheKeys: new Set(),
      errors: [],
      failures: [],
    });
    expect(warnings).toStrictEqual([]);
  });

  const failing = {
    extractFromMarkdown: (file: string) => {
      if (file.endsWith("bad.md")) throw new Error("bad front matter");
      if (file.endsWith("odd.md")) throw "odd";
      return ok(file);
    },
    extractFromManifest: (file: string): ExtractionResult[] => {
      if (file === "plain.yaml") throw new ManifestError("plain", file);
      if (file === "fake.yaml")
        throw Object.assign(new Error("lookalike"), {
          classification: "coordinate-artifact",
        });
      if (file === "coord.yaml")
        throw new ManifestError("coordinates", file, "coordinate-artifact");
      throw "manifest odd";
    },
  };

  test("warns about each failure outside validate-only mode", async () => {
    const output = await processExtractions(
      ["docs/bad.md", "good.md", path.join(root, "odd.md")],
      ["plain.yaml", "fake.yaml", "other.yaml"],
      false,
      root,
      failing,
    );
    expect(output).toStrictEqual({
      results: [ok("good.md")],
      failedCacheKeys: new Set([
        "docs/bad.md",
        "odd.md",
        "plain.yaml",
        "fake.yaml",
        "other.yaml",
      ]),
      errors: [],
      failures: [
        { file: "docs/bad.md", message: "bad front matter" },
        { file: path.join(root, "odd.md"), message: "odd" },
        { file: "plain.yaml", message: "plain" },
        { file: "fake.yaml", message: "lookalike" },
        { file: "other.yaml", message: "manifest odd" },
      ],
    });
    expect(warnings).toStrictEqual([
      "Warning: Failed to extract from docs/bad.md: bad front matter",
      `Warning: Failed to extract from ${path.join(root, "odd.md")}: odd`,
      "Warning: Failed to extract from plain.yaml: plain",
      "Warning: Failed to extract from fake.yaml: lookalike",
      "Warning: Failed to extract from other.yaml: manifest odd",
    ]);
  });

  test("collects errors silently in validate-only mode, coordinates included", async () => {
    const output = await processExtractions(
      ["bad.md"],
      ["coord.yaml"],
      true,
      root,
      failing,
    );
    expect(output).toStrictEqual({
      results: [],
      failedCacheKeys: new Set(["bad.md", "coord.yaml"]),
      errors: [
        { file: "bad.md", message: "bad front matter" },
        { file: "coord.yaml", message: "coordinates" },
      ],
      failures: [
        { file: "bad.md", message: "bad front matter" },
        { file: "coord.yaml", message: "coordinates" },
      ],
    });
    expect(warnings).toStrictEqual([]);
  });

  test("rethrows a coordinate artifact failure when syncing", async () => {
    await expect(
      processExtractions([], ["coord.yaml"], false, root, failing),
    ).rejects.toThrow("coordinates");
  });

  test("defaults to the real extractors and the working directory", async () => {
    const missingMd = path.join(root, "missing.md");
    const missingManifest = path.join(root, "missing.yaml");
    const message = (run: () => unknown) => {
      try {
        run();
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
      throw new Error("expected a failure");
    };
    const output = await processExtractions(
      [missingMd],
      [missingManifest],
      true,
    );
    expect(output.failures).toStrictEqual([
      {
        file: missingMd,
        message: message(() => extractFromMarkdown(missingMd)),
      },
      {
        file: missingManifest,
        message: message(() => extractFromManifest(missingManifest)),
      },
    ]);
    expect([...output.failedCacheKeys]).toStrictEqual([
      path.relative(process.cwd(), missingMd).split(path.sep).join("/"),
      path.relative(process.cwd(), missingManifest).split(path.sep).join("/"),
    ]);
  });
});

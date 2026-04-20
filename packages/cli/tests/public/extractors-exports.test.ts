import { describe, expect, test } from "bun:test";
import * as manifestExports from "kibi-cli/extractors/manifest";
import * as markdownExports from "kibi-cli/extractors/markdown";

describe("public extractor exports", () => {
  test("manifest exports are callable", () => {
    expect(typeof manifestExports.extractFromManifest).toBe("function");
    expect(typeof manifestExports.extractFromManifestString).toBe("function");
  });

  test("markdown exports are callable", () => {
    expect(typeof markdownExports.extractFromMarkdown).toBe("function");
    expect(typeof markdownExports.extractFromMarkdownString).toBe("function");
    expect(typeof markdownExports.inferTypeFromPath).toBe("function");
  });
});

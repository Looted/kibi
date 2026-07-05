import { describe, expect, test } from "bun:test";

import {
  extractExplicitPathFields,
  isDirectKbPath,
  isDocumentationTrackedPath,
  isKbFreshnessRelevantPath,
  isMeaningfulTrackedPath,
  isSourceImpactRelevantPath,
  toRepoRelativePath,
} from "../src/path-policy";

describe("Cursor hook path policy", () => {
  test("Given nested explicit path fields When extracting Then strings are normalized and deduplicated", () => {
    expect(
      extractExplicitPathFields({
        command: "cat .kb/config.json",
        file_path: " .kb\\config.json ",
        paths: ["src/a.ts", ["src/b.ts", ""]],
        nested: [{ target_path: "docs/guide.md" }, { note: 1 }],
      }),
    ).toEqual([".kb/config.json", "src/a.ts", "src/b.ts", "docs/guide.md"]);
  });

  test("Given non-path values When extracting Then they are ignored", () => {
    expect(extractExplicitPathFields(undefined)).toEqual([]);
    expect(
      extractExplicitPathFields({ path: 42, nested: { paths: 7 } }),
    ).toEqual([]);
  });

  test("Given path candidates When classifying Then only exact KB path segments match", () => {
    expect(isDirectKbPath(".kb/config.json")).toBe(true);
    expect(isDirectKbPath("src/.kb-helper.ts")).toBe(false);
  });

  test("Given tracked path candidates When classifying Then source docs and README are meaningful", () => {
    expect(isMeaningfulTrackedPath("src/hook-runner.ts")).toBe(true);
    expect(isMeaningfulTrackedPath("packages/cursor/tests/hook.test.ts")).toBe(
      true,
    );
    expect(isMeaningfulTrackedPath("docs/guide.md")).toBe(true);
    expect(isMeaningfulTrackedPath("README.md")).toBe(true);

    expect(isMeaningfulTrackedPath(".kb/config.json")).toBe(false);
    expect(isMeaningfulTrackedPath("dist/hook-runner.js")).toBe(false);
    expect(isMeaningfulTrackedPath("docs/generated.json")).toBe(false);
    expect(isMeaningfulTrackedPath("package.json")).toBe(false);
  });

  test("Given freshness and source candidates When classifying Then only eligible paths match", () => {
    expect(isKbFreshnessRelevantPath("documentation/symbols.yaml")).toBe(true);
    expect(isKbFreshnessRelevantPath("packages/core/src/kb.pl")).toBe(true);
    expect(isKbFreshnessRelevantPath("packages/cursor/src/hook.ts")).toBe(
      false,
    );

    expect(isSourceImpactRelevantPath("packages/cursor/src/hook.ts")).toBe(
      true,
    );
    expect(
      isSourceImpactRelevantPath("packages/cursor/tests/hook.test.ts"),
    ).toBe(false);
    expect(isSourceImpactRelevantPath("documentation/symbols.yaml")).toBe(
      false,
    );
  });

  test("Given documentation paths When classifying Then docs folders and extensions match", () => {
    expect(isDocumentationTrackedPath("packages/cursor/docs/guide.json")).toBe(
      true,
    );
    expect(isDocumentationTrackedPath("notes.txt")).toBe(true);
    expect(isDocumentationTrackedPath("src/index.ts")).toBe(false);
  });

  test("Given workspace cwd When relativizing Then matching absolute paths become repo relative", () => {
    expect(toRepoRelativePath("/repo/src/a.ts", "/repo")).toBe("src/a.ts");
    expect(toRepoRelativePath(" src\\a.ts ", undefined)).toBe("src/a.ts");
    expect(toRepoRelativePath("/other/src/a.ts", "/repo")).toBe(
      "/other/src/a.ts",
    );
  });
});

import { describe, expect, test } from "bun:test";

import { readGuidance, writeGuidance } from "../src/guidance";

describe("Cursor guidance", () => {
  test("Given Kibi disabled When reading or writing Then guidance is omitted", () => {
    expect(readGuidance("src/a.ts", undefined, false)).toBeUndefined();
    expect(writeGuidance("src/a.ts", undefined, false)).toBeUndefined();
  });

  test("Given untracked paths When reading or writing Then guidance is omitted", () => {
    expect(readGuidance("package.json", undefined, true)).toBeUndefined();
    expect(writeGuidance("dist/index.js", undefined, true)).toBeUndefined();
  });

  test("Given tracked paths When reading or writing Then path-specific guidance is returned", () => {
    expect(readGuidance("/repo/src/a.ts", "/repo", true)).toContain(
      'sourceFile="src/a.ts"',
    );
    expect(
      writeGuidance("documentation/requirements/REQ.md", undefined, true),
    ).toContain("keep REQ, SCEN, and TEST artifacts separate");
    expect(writeGuidance("src/a.ts", undefined, true)).toContain(
      'sourceFiles:["src/a.ts"]',
    );
  });
});

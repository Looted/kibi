import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { buildIndex } from "../src/symbolIndex";

describe("symbolIndex", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-symbol-index-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("buildIndex parses symbols and links from symbols.yaml", () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(
      manifestPath,
      [
        "symbols:",
        "  - id: SYM-001",
        "    title: PrologProcess",
        "    sourceFile: packages/cli/src/prolog.ts",
        "    sourceLine: 16",
        "    links:",
        "      - REQ-001",
        "      - REQ-009",
      ].join("\n"),
      "utf8",
    );

    const index = buildIndex(manifestPath, tmpDir);

    expect(index.byId.size).toBe(1);
    expect(index.byFile.size).toBe(1);
    expect(index.byTitle.get("prologprocess")?.length).toBe(1);

    const sym = index.byId.get("SYM-001");
    expect(sym).toBeDefined();
    expect(sym?.sourceLine).toBe(16);
    expect(sym?.links).toEqual(["REQ-001", "REQ-009"]);
  });

  test("buildIndex tolerates malformed manifest content", () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(manifestPath, "symbols: [\n  - id: SYM-001", "utf8");

    const index = buildIndex(manifestPath, tmpDir);

    expect(index.byId.size).toBe(0);
    expect(index.byFile.size).toBe(0);
    expect(index.byTitle.size).toBe(0);
  });
});

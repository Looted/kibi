// executable_for TEST-source-analysis-v2-contract
import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBuiltinTsMorphSymbolExtractorV2 } from "kibi-plugin-builtin";
import { readSnapshotSourceConfig } from "../../src/plugins/maintenance-source-analysis.js";
import { captureStagedSnapshot } from "../../src/traceability/git-change-snapshot.js";
import {
  createManifestLookupSentinelKey,
  extractSymbolsFromStagedFileAsync,
} from "../../src/traceability/symbol-extract.js";

async function extract(content: string) {
  const path = "example.ts";
  const analysis = await createBuiltinTsMorphSymbolExtractorV2().analyze({
    path,
    content,
  });
  expect(analysis.status).toBe("ok");
  const lookup = new Map([
    [createManifestLookupSentinelKey(".kb/symbols.yaml"), { id: "captured" }],
    [
      "example.ts:Box.value",
      {
        id: "SYM-box-value",
        relationships: [{ type: "implements", to: "REQ-box" }],
      },
    ],
  ]);
  return extractSymbolsFromStagedFileAsync(
    {
      path,
      status: "A",
      content,
      hunkRanges: [{ start: 1, end: content.split("\n").length }],
    },
    lookup,
    { analyzeText: () => analysis },
  );
}

test("a complementary getter/setter pair has one authored identity and covers both bodies", async () => {
  const symbols = await extract(
    "export class Box {\n  get value() { return 1; }\n  set value(v: number) { void v; }\n}\n",
  );
  const accessors = symbols.filter((symbol) => symbol.name === "Box.value");
  expect(accessors).toHaveLength(1);
  expect(accessors[0]?.id).toBe("SYM-box-value");
  expect(accessors[0]?.reqLinks).toEqual(["REQ-box"]);
  expect(accessors[0]?.location).toMatchObject({ startLine: 2, endLine: 3 });
});

test("two getters cannot share one authored locator", async () => {
  await expect(
    extract(
      "export class Box { get value() { return 1; } get value() { return 2; } }\n",
    ),
  ).rejects.toThrow("Ambiguous declaration locator 'Box.value'");
});

test("a static getter and instance setter cannot share one authored locator", async () => {
  await expect(
    extract(
      "export class Box { static get value() { return 1; } set value(v: number) { void v; } }\n",
    ),
  ).rejects.toThrow("Ambiguous declaration locator 'Box.value'");
});

function withStagedSourceConfig(
  baselineMode: "shadow" | "replace",
  stagedMode: "shadow" | "replace" | null,
  inspect: (readMode: () => string | undefined) => void,
): void {
  const root = mkdtempSync(join(tmpdir(), "kibi-source-config-review-"));
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, stdio: "pipe" });
  const packageJson = (mode: "shadow" | "replace" | null) =>
    JSON.stringify({
      name: "sample",
      version: "1.0.0",
      kibi: {
        plugins:
          mode === null
            ? []
            : [
                {
                  package: "kibi-plugin-treesitter",
                  capabilities: {
                    "kibi.symbol-extractor.v2": { mode },
                  },
                },
              ],
      },
    });
  try {
    git("init", "-q");
    git("config", "user.email", "review@example.test");
    git("config", "user.name", "Review");
    writeFileSync(join(root, "package.json"), packageJson(baselineMode));
    writeFileSync(join(root, "a.py"), "def old(): pass\n");
    git("add", ".");
    git("commit", "-qm", "base");
    writeFileSync(join(root, "package.json"), packageJson(stagedMode));
    writeFileSync(join(root, "a.py"), "def new(): pass\n");
    git("add", ".");

    inspect(() => {
      const config = readSnapshotSourceConfig(captureStagedSnapshot(root));
      return config.plugins?.[0]?.capabilities["kibi.symbol-extractor.v2"]
        ?.mode;
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("staged source activation takes precedence over the baseline mode", () => {
  withStagedSourceConfig("shadow", "replace", (readMode) => {
    expect(readMode()).toBe("replace");
  });
});

test("removed baseline source activation remains enforcing for a source change", () => {
  withStagedSourceConfig("replace", null, (readMode) => {
    expect(readMode()).toBe("replace");
  });
});

test("a mixed source change cannot downgrade its baseline analyzer to shadow", () => {
  withStagedSourceConfig("replace", "shadow", (readMode) => {
    expect(readMode).toThrow("shadow");
  });
});

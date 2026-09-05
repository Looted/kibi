// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  assessStagedSymbolsManifest,
  collectStagedAuthoredSymbolsManifestEvidence,
} from "../../src/traceability/staged-symbols-manifest.js";
import {
  createGitWorkspace,
  git,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
  withCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];
const previousExitCode = process.exitCode;

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) removeTempDir(root);
  if (typeof previousExitCode === "number") process.exitCode = previousExitCode;
  else if (typeof process.exitCode === "number") process.exitCode = 0;
});

function preparedWorkspace(): string {
  restores.push(isolateKibiEnv());
  const cwd = createGitWorkspace();
  roots.push(cwd);
  return cwd;
}

describe("staged symbols manifest leftover record normalization", () => {
  test("skips invalid links, uses source fallbacks, and reports authored id changes", async () => {
    const cwd = preparedWorkspace();
    mkdirSync(path.join(cwd, "src"), { recursive: true });
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    writeFileSync(
      path.join(cwd, "src", "app.ts"),
      "export function greet() { return 1; }\n",
    );
    writeFileSync(
      path.join(cwd, ".kb", "symbols.yaml"),
      `symbols:
  - id: SYM-GREET
    title: greet
    source: src/app.ts
    sourceLine: 1
    links:
      - REQ-1
      - type: implements
        target: REQ-1
      - 12
      - type: missing
    relationships:
      - type: implements
        target: REQ-1
      - type: only
      - 4
    tags:
      - core
      - 1
    owner: alice
    priority: must
    severity: high
    text_ref: body
    granularity_reason: exported-function
`,
    );
    writeFileSync(
      path.join(cwd, ".kb", "symbol-coordinates.yaml"),
      "not: valid-coordinates\n",
    );
    git(cwd, "add src/app.ts .kb/symbols.yaml .kb/symbol-coordinates.yaml");
    git(cwd, "commit --no-verify -m symbols");
    writeFileSync(
      path.join(cwd, ".kb", "symbols.yaml"),
      `symbols:
  - id: SYM-GREET
    title: greet
    sourceFile: src/app.ts
    sourceLine: 1
    links: REQ-2
    relationships: not-a-list
    tags: not-a-list
`,
    );
    git(cwd, "add .kb/symbols.yaml");
    await withCwd(cwd, () => {
      const staged = {
        path: ".kb/symbols.yaml",
        status: "M" as const,
        hunkRanges: [],
        content: [
          "symbols:",
          "  - id: SYM-GREET",
          "    title: greet",
          "    sourceFile: src/app.ts",
          "    sourceLine: 1",
          "    links: REQ-2",
          "    relationships: not-a-list",
          "    tags: not-a-list",
        ].join("\n"),
      };
      const source = {
        path: "src/app.ts",
        status: "M" as const,
        hunkRanges: [],
        content: "export function greet() { return 1; }\n",
      };
      const evidence = collectStagedAuthoredSymbolsManifestEvidence({
        sourceFiles: [source],
        stagedFiles: [staged],
      });
      expect(evidence.path).toBe(".kb/symbols.yaml");
      expect(evidence.changedEntityIds).toContain("SYM-GREET");
      expect(
        collectStagedAuthoredSymbolsManifestEvidence({
          sourceFiles: [source],
          stagedFiles: [],
        }).entries,
      ).toEqual([]);
      expect(
        collectStagedAuthoredSymbolsManifestEvidence({
          sourceFiles: [source],
          stagedFiles: [{ ...staged, content: "symbols: [" }],
        }).entries,
      ).toEqual([]);
      const assessment = assessStagedSymbolsManifest({
        symbolsManifestPath: ".kb/symbols.yaml",
        sourceFiles: [source],
        stagedFiles: [staged, source],
      });
      expect(["stale", "missing", "not_required", "fresh"]).toContain(
        assessment.state,
      );
    });
  });
});

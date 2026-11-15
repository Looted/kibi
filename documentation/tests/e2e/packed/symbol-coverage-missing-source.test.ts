import assert from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
  parseKibiResult,
  stageSourceFile,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

type SymbolRow = Readonly<{
  id: string;
  traceabilityRole?: string;
  coverageStatus?: string;
  gaps?: readonly string[];
}>;
type SymbolCoverage = Readonly<{
  rows?: readonly SymbolRow[];
  summary?: { fullyCovered?: number; uncovered?: number };
}>;

/**
 * E2E: symbol coverage reports a symbol whose source file is gone.
 *
 * SCEN-kibi-symbol-coverage-source-missing — after a synced production
 * symbol's source file is deleted from the workspace, `kibi coverage --by
 * symbol` reports that symbol as uncovered with the source_missing gap,
 * although its requirement and test links are unchanged, while a linked
 * symbol whose file remains stays fully covered.
 */
if (RUN_NODE_TEST_SUITE) {
  describe(
    "E2E: symbol coverage with a vanished source file",
    { timeout: 240000 },
    () => {
      let tarballs: Tarballs;
      let sandbox: TestSandbox;
      let hasProlog = false;

      const write = (relativePath: string, content: string): void => {
        const target = join(sandbox.repoDir, relativePath);
        mkdirSync(join(target, ".."), { recursive: true });
        writeFileSync(target, content);
        stageSourceFile(sandbox, relativePath);
      };

      const symbolCoverage = async (
        includePassing: boolean,
      ): Promise<SymbolCoverage> => {
        const result = await kibi(sandbox, [
          "coverage",
          "--by",
          "symbol",
          "--format",
          "json",
          ...(includePassing ? ["--include-passing"] : []),
        ]);
        assert.strictEqual(
          result.exitCode,
          0,
          `${result.stdout}${result.stderr}`,
        );
        return parseKibiResult<SymbolCoverage>(result.stdout);
      };

      const row = (coverage: SymbolCoverage, id: string): SymbolRow => {
        const found = (coverage.rows ?? []).find(
          (candidate) => candidate.id === id,
        );
        assert.ok(found, `no ${id} row: ${JSON.stringify(coverage)}`);
        return found;
      };

      before(
        async () => {
          hasProlog = checkPrologAvailable();
          if (!hasProlog) return;
          tarballs = await packAll();
          sandbox = createSandbox();
          await sandbox.install(tarballs);
          await sandbox.initGitRepo();
          await kibi(sandbox, ["init"]);

          write(
            ".kb/requirements/REQ-SOURCE-MISSING.md",
            `---
id: REQ-SOURCE-MISSING
title: Source missing fixture
status: open
links:
  - type: specified_by
    target: SCEN-SOURCE-MISSING
---

Source missing fixture requirement.
`,
          );
          write(
            ".kb/scenarios/SCEN-SOURCE-MISSING.md",
            `---
id: SCEN-SOURCE-MISSING
title: Source missing scenario
status: active
links:
  - type: verified_by
    target: TEST-SOURCE-MISSING
---

Given linked symbols, when one source file is deleted, then coverage reports it.
`,
          );
          write(
            ".kb/tests/TEST-SOURCE-MISSING.md",
            `---
id: TEST-SOURCE-MISSING
title: Source missing unit fixture
status: passing
verification_scope: unit
source: src/source-missing.test.ts
links:
  - type: validates
    target: SCEN-SOURCE-MISSING
---

Unit fixture that covers both symbols.
`,
          );
          write(
            "src/source-missing.test.ts",
            "export const sourceMissingFixture = 'v1';\n",
          );
          write(
            "src/kept.ts",
            "export function keptSymbol() {\n  return 1;\n}\n",
          );
          write(
            "src/vanishing.ts",
            "export function vanishingSymbol() {\n  return 2;\n}\n",
          );
          const symbols = ["symbols:"];
          for (const [id, title, sourceFile] of [
            ["SYM-KEPT", "keptSymbol", "src/kept.ts"],
            ["SYM-VANISHING", "vanishingSymbol", "src/vanishing.ts"],
          ]) {
            symbols.push(
              `  - id: ${id}`,
              `    title: ${title}`,
              `    sourceFile: ${sourceFile}`,
              "    status: active",
              "    relationships:",
              "      - type: implements",
              "        target: REQ-SOURCE-MISSING",
              "      - type: covered_by",
              "        target: TEST-SOURCE-MISSING",
            );
          }
          write(".kb/symbols.yaml", `${symbols.join("\n")}\n`);
          const sync = await kibi(sandbox, ["sync"]);
          assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);
        },
        { timeout: 180000 },
      );

      after(
        async () => {
          if (sandbox) await sandbox.cleanup();
        },
        { timeout: 60000 },
      );

      it(
        "reports a linked symbol as uncovered with source_missing once its file is deleted",
        { timeout: 120000 },
        async (t) => {
          if (!hasProlog) {
            t.skip("SWI-Prolog is not available");
            return;
          }
          const before = await symbolCoverage(true);
          for (const id of ["SYM-KEPT", "SYM-VANISHING"]) {
            const linked = row(before, id);
            assert.strictEqual(linked.traceabilityRole, "production");
            assert.strictEqual(linked.coverageStatus, "fully_covered");
            assert.deepStrictEqual(linked.gaps, []);
          }

          rmSync(join(sandbox.repoDir, "src", "vanishing.ts"));

          const afterDelete = await symbolCoverage(true);
          assert.strictEqual(
            row(afterDelete, "SYM-KEPT").coverageStatus,
            "fully_covered",
          );
          const vanished = row(afterDelete, "SYM-VANISHING");
          assert.strictEqual(vanished.coverageStatus, "uncovered");
          assert.deepStrictEqual(vanished.gaps, ["source_missing"]);

          const failing = await symbolCoverage(false);
          assert.deepStrictEqual(
            (failing.rows ?? []).map((candidate) => candidate.id),
            ["SYM-VANISHING"],
          );
        },
      );
    },
  );
}

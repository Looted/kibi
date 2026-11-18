import assert from "node:assert";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type RunResult,
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
  run,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

const TAGS = `export const tagIdSchema = "tag";

export function createTag() {
  return 1;
}
`;

const BASE_SYMBOLS = `symbols:
  - id: SYM-TAGS-CREATE
    title: createTag
    sourceFile: src/tags.ts
    status: active
    links:
      - REQ-TAGS-001
      - type: covered_by
        target: TEST-TAGS-001
`;

/**
 * E2E: the staged gate judges a commit only on the declarations it adds or
 * changes.
 *
 * A partially recorded file, as onboarding leaves it: only the deciding
 * function has a symbol record and the schema constant next to it has none.
 *
 * SCEN-staged-gate-judges-changed-declarations — an edit to the recorded
 * function passes; a new unrecorded function or a rename that orphans a
 * record blocks (SCEN-NEG-staged-gate-INHERITED-GAP-BLOCKS).
 * SCEN-staged-gate-changed-declaration-definition — a comment or whitespace
 * edit inside the unrecorded constant leaves it out of the change; a value
 * edit puts it in (SCEN-NEG-staged-gate-CHANGED-DECLARATION-IGNORED).
 * SCEN-staged-evidence-scoped-to-changed-declarations — no
 * kibi_impact_evidence_missing when every changed declaration is recorded
 * (SCEN-NEG-staged-evidence-UNRECORDED-CHANGE-ACCEPTED).
 * SCEN-staged-gate-reports-inherited-symbol-gaps — the untouched gap is a
 * non-blocking note and JSON inheritedSymbolGaps entry
 * (SCEN-NEG-staged-gate-INHERITED-GAP-SILENT).
 * SCEN-behavioral-kinds-keep-implements — a config record without a link
 * passes for a changed constant, while a function or a function-valued
 * constant with a non-behavioral role still needs one
 * (SCEN-NEG-behavioral-kinds-ROLE-EXCUSES-FUNCTION).
 */
if (RUN_NODE_TEST_SUITE) {
  describe(
    "E2E: staged gate on a partially recorded file",
    { timeout: 420000 },
    () => {
      let tarballs: Tarballs;
      let sandbox: TestSandbox;
      let hasProlog = false;

      const write = (files: Record<string, string>): void => {
        for (const [relativePath, content] of Object.entries(files)) {
          const target = join(sandbox.repoDir, relativePath);
          mkdirSync(join(target, ".."), { recursive: true });
          writeFileSync(target, content);
        }
      };

      const git = async (args: string[]): Promise<void> => {
        const result = await run("git", args, {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });
        assert.strictEqual(
          result.exitCode,
          0,
          `git ${args.join(" ")}: ${result.stdout}${result.stderr}`,
        );
      };

      const output = (result: RunResult): string =>
        `${result.stdout}${result.stderr}`;

      /** Commit a base with the given symbols manifest, then sync. */
      const commitBase = async (symbols: string): Promise<void> => {
        write({ ".kb/symbols.yaml": symbols, "src/tags.ts": TAGS });
        await git(["add", "-A"]);
        await git(["commit", "--allow-empty", "-m", "base", "--no-verify"]);
        const sync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(sync.exitCode, 0, output(sync));
      };

      /** Stage new content for src/tags.ts and run the staged check. */
      const stageAndCheck = async (
        content: string,
        format: string[] = [],
      ): Promise<RunResult> => {
        write({ "src/tags.ts": content });
        await git(["add", "src/tags.ts"]);
        return kibi(sandbox, ["check", "--staged", ...format]);
      };

      const resetToBase = async (): Promise<void> => {
        await git(["reset", "--hard", "HEAD"]);
      };

      before(
        async () => {
          hasProlog = checkPrologAvailable();
          if (!hasProlog) return;
          tarballs = await packAll();
          sandbox = createSandbox();
          await sandbox.install(tarballs);
          await sandbox.initGitRepo();
          const init = await kibi(sandbox, ["init"]);
          assert.strictEqual(init.exitCode, 0, output(init));
          write({
            ".kb/requirements/REQ-TAGS-001.md": `---
id: REQ-TAGS-001
title: Tag creation
status: open
firmness: default
---

# Tag creation
`,
            ".kb/tests/TEST-TAGS-001.md": `---
id: TEST-TAGS-001
title: Tag creation test
status: active
links:
  - type: validates
    target: REQ-TAGS-001
---

# Tag creation test
`,
          });
          await commitBase(BASE_SYMBOLS);
        },
        { timeout: 240000 },
      );

      after(
        async () => {
          if (sandbox) await sandbox.cleanup();
        },
        { timeout: 60000 },
      );

      it(
        "passes an edit to the recorded function and notes the untouched gap",
        { timeout: 120000 },
        async (t) => {
          if (!hasProlog) {
            t.skip("SWI-Prolog is not available");
            return;
          }
          const edited = TAGS.replace("return 1;", "return 2;");
          const text = await stageAndCheck(edited);
          assert.strictEqual(text.exitCode, 0, output(text));
          assert.doesNotMatch(output(text), /symbols_manifest_stale/);
          assert.doesNotMatch(output(text), /kibi_impact_evidence_missing/);
          assert.match(
            output(text),
            /Symbol records: src\/tags\.ts has 1 declaration\(s\) without a \.kb\/symbols\.yaml record that this commit did not add or change\. They are not judged by this commit and no action is required\./,
          );

          const json = await kibi(sandbox, [
            "check",
            "--staged",
            "--format",
            "json",
          ]);
          assert.strictEqual(json.exitCode, 0, output(json));
          const parsed = JSON.parse(json.stdout) as {
            structuredContent?: { inheritedSymbolGaps?: unknown };
          };
          assert.deepStrictEqual(
            parsed.structuredContent?.inheritedSymbolGaps,
            [
              {
                path: "src/tags.ts",
                unrecorded: [{ title: "tagIdSchema", line: 1 }],
                orphaned: [],
              },
            ],
          );
          await resetToBase();
        },
      );

      it(
        "leaves a comment edit inside the unrecorded constant out of the change",
        { timeout: 120000 },
        async (t) => {
          if (!hasProlog) {
            t.skip("SWI-Prolog is not available");
            return;
          }
          const result = await stageAndCheck(
            TAGS.replace(
              'export const tagIdSchema = "tag";',
              'export const   tagIdSchema = /* id */ "tag";',
            ).replace("return 1;", "return 2;"),
          );
          assert.strictEqual(result.exitCode, 0, output(result));
          assert.doesNotMatch(output(result), /Traceability failed/);
          await resetToBase();
        },
      );

      it(
        "blocks a value edit to the unrecorded constant, naming only it",
        { timeout: 120000 },
        async (t) => {
          if (!hasProlog) {
            t.skip("SWI-Prolog is not available");
            return;
          }
          const result = await stageAndCheck(TAGS.replace('"tag"', '"label"'));
          assert.strictEqual(result.exitCode, 1, output(result));
          assert.match(
            output(result),
            /\[BLOCKS COMMIT\] tagIdSchema \(src\/tags\.ts:\d+\)/,
          );
          assert.doesNotMatch(output(result), /\[BLOCKS COMMIT\] createTag/);
          await resetToBase();
        },
      );

      it(
        "blocks a new unrecorded function, naming only the new declaration",
        { timeout: 120000 },
        async (t) => {
          if (!hasProlog) {
            t.skip("SWI-Prolog is not available");
            return;
          }
          const result = await stageAndCheck(
            `${TAGS}\nexport function deleteTag() {\n  return 0;\n}\n`,
          );
          assert.strictEqual(result.exitCode, 1, output(result));
          assert.match(
            output(result),
            /\[BLOCKS COMMIT\] deleteTag \(src\/tags\.ts:\d+\)/,
          );
          assert.doesNotMatch(output(result), /\[BLOCKS COMMIT\] tagIdSchema/);
          await resetToBase();
        },
      );

      it(
        "blocks a rename that leaves the record without its declaration",
        { timeout: 120000 },
        async (t) => {
          if (!hasProlog) {
            t.skip("SWI-Prolog is not available");
            return;
          }
          const result = await stageAndCheck(
            TAGS.replace("createTag", "makeTag"),
          );
          assert.strictEqual(result.exitCode, 1, output(result));
          assert.match(output(result), /symbols_manifest_stale/);
          assert.match(
            output(result),
            /Evidence without a matching symbol: createTag/,
          );
          assert.doesNotMatch(output(result), /tagIdSchema \(line/);
          await resetToBase();
        },
      );

      it(
        "accepts a config record without a link for a changed constant",
        { timeout: 180000 },
        async (t) => {
          if (!hasProlog) {
            t.skip("SWI-Prolog is not available");
            return;
          }
          await commitBase(`${BASE_SYMBOLS}  - id: SYM-TAGS-ID-SCHEMA
    title: tagIdSchema
    sourceFile: src/tags.ts
    symbol_role: config
    status: active
`);
          const result = await stageAndCheck(TAGS.replace('"tag"', '"label"'));
          assert.strictEqual(result.exitCode, 0, output(result));
          assert.doesNotMatch(output(result), /Traceability failed/);
          assert.doesNotMatch(output(result), /symbol-coverage/);
          await resetToBase();
        },
      );

      it(
        "still needs a link for a function or a function-valued constant with a non-behavioral role",
        { timeout: 180000 },
        async (t) => {
          if (!hasProlog) {
            t.skip("SWI-Prolog is not available");
            return;
          }
          await commitBase(`${BASE_SYMBOLS}  - id: SYM-TAGS-DELETE
    title: deleteTag
    sourceFile: src/tags.ts
    symbol_role: structural
    status: active
  - id: SYM-TAGS-HANDLER
    title: tagHandler
    sourceFile: src/tags.ts
    symbol_role: config
    status: active
`);
          const result = await stageAndCheck(
            `${TAGS}\nexport function deleteTag() {\n  return 0;\n}\n\nexport const tagHandler = () => 0;\n`,
          );
          assert.strictEqual(result.exitCode, 1, output(result));
          assert.match(output(result), /\[BLOCKS COMMIT\] deleteTag/);
          assert.match(output(result), /\[BLOCKS COMMIT\] tagHandler/);
          await resetToBase();
        },
      );
    },
  );
}

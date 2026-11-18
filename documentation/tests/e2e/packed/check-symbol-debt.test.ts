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
  parseKibiResult,
  run,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

type CheckJson = {
  structuredContent?: {
    count?: number;
    violations?: ReadonlyArray<{ rule?: string; entityId?: string }>;
    symbolDebt?: unknown;
  };
};

const SYMBOLS = `symbols:
  - id: SYM-TAGS-CREATE
    title: createTag
    sourceFile: src/tags.ts
    symbol_role: behavioral
    status: active
    links:
      - REQ-TAGS-001
      - type: covered_by
        target: TEST-TAGS-001
  - id: SYM-TAGS-ID-SCHEMA
    title: tagIdSchema
    sourceFile: src/tags.ts
    symbol_role: config
    status: active
`;

/**
 * E2E: the full check reports symbol debt and exempts linkless
 * non-behavioral records; the bootstrap skill states the staged rule.
 *
 * SCEN-check-symbol-debt-count — an unscoped `kibi check` counts the
 * unrecorded declarations of a recorded file on its one-line verdict and
 * in JSON, lists them per file only with --symbol-debt (kb_check:
 * includeSymbolDebt), and still passes; a rule-scoped check carries no
 * debt (SCEN-NEG-check-symbol-debt-count-LISTED-BY-DEFAULT).
 * SCEN-check-pass-one-line — the passing verdict is one line with the rule
 * count, and kb_check gives evaluated.ruleCount without rule names
 * (SCEN-NEG-check-pass-one-line-RULES-LISTED).
 * SCEN-symbol-traceability-behavioral-only — a config record with no
 * implements link raises neither symbol-traceability nor symbol-coverage,
 * while a behavioral record without one is still flagged
 * (SCEN-NEG-symbol-traceability-BEHAVIORAL-EXEMPTED).
 * SCEN-bootstrap-states-staged-symbol-rule — the installed kibi-bootstrap
 * skill states the staged symbol rule and reports symbolDebt.total without
 * a bulk backfill (SCEN-NEG-bootstrap-SILENT-ON-SYMBOL-RULE).
 */
if (RUN_NODE_TEST_SUITE) {
  describe("E2E: symbol debt in the full check", { timeout: 360000 }, () => {
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

    const output = (result: RunResult): string =>
      `${result.stdout}${result.stderr}`;

    const sync = async (): Promise<void> => {
      await run("git", ["add", "-A"], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      });
      const result = await kibi(sandbox, ["sync"]);
      assert.strictEqual(result.exitCode, 0, output(result));
    };

    const checkJson = async (args: string[] = []): Promise<CheckJson> => {
      const result = await kibi(sandbox, [
        "check",
        ...args,
        "--format",
        "json",
      ]);
      return JSON.parse(result.stdout) as CheckJson;
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
required_evidence: asserted
---

Tags are created with a fixed identifier schema.

## Context

The fixture needs one linked requirement so its source file counts as recorded.
`,
          ".kb/tests/TEST-TAGS-001.md": `---
id: TEST-TAGS-001
title: Tag creation test
status: active
links:
  - type: validates
    target: REQ-TAGS-001
---

Covers tag creation so the recorded function in this fixture has qualifying test coverage and the check passes.
`,
          ".kb/symbols.yaml": SYMBOLS,
          "src/tags.ts": `export const tagIdSchema = "tag";

export function createTag() {
  return 1;
}

export interface Tag {
  id: string;
}

export function renameTag() {
  return 2;
}
`,
          "src/unrecorded.ts": "export function nobody() {}\n",
        });
        await sync();
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
      "reports unrecorded declarations of recorded files without failing",
      { timeout: 180000 },
      async (t) => {
        if (!hasProlog) {
          t.skip("SWI-Prolog is not available");
          return;
        }
        const full = await checkJson();
        assert.deepStrictEqual(full.structuredContent?.symbolDebt, {
          total: 2,
          fileCount: 1,
        });
        const listed = await checkJson(["--symbol-debt"]);
        assert.deepStrictEqual(listed.structuredContent?.symbolDebt, {
          total: 2,
          fileCount: 1,
          files: [{ path: "src/tags.ts", unrecorded: ["renameTag", "Tag"] }],
        });
        const flagged = (full.structuredContent?.violations ?? []).filter(
          (violation) =>
            violation.rule === "symbol-traceability" ||
            violation.rule === "symbol-coverage",
        );
        assert.deepStrictEqual(flagged, []);

        const text = await kibi(sandbox, ["check"]);
        assert.strictEqual(text.exitCode, 0, output(text));
        const verdict = text.stdout.split("\n")[0] ?? "";
        assert.match(
          verdict,
          /^✓ No violations\. \d+ rules\. 2 unrecorded declarations in 1 file do not block \(kibi check --symbol-debt lists them\)\.$/,
        );
        assert.doesNotMatch(output(text), /renameTag/);
        const textList = await kibi(sandbox, ["check", "--symbol-debt"]);
        assert.match(output(textList), /src\/tags\.ts \(2\): renameTag, Tag/);

        // kb_check (the CLI JSON route MCP shares) counts the debt and the
        // rules it ran; includeSymbolDebt lists the declarations.
        const inputPath = join(sandbox.baseDir, "check-debt.json");
        writeFileSync(inputPath, "{}");
        const counted = parseKibiResult<{
          symbolDebt?: unknown;
          evaluated?: { ruleCount?: number; rules?: unknown };
        }>((await kibi(sandbox, ["check", "--input", inputPath])).stdout);
        assert.deepStrictEqual(counted.symbolDebt, { total: 2, fileCount: 1 });
        assert.ok((counted.evaluated?.ruleCount ?? 0) > 1);
        assert.strictEqual(counted.evaluated?.rules, undefined);
        writeFileSync(inputPath, JSON.stringify({ includeSymbolDebt: true }));
        const asked = parseKibiResult<{ symbolDebt?: unknown }>(
          (await kibi(sandbox, ["check", "--input", inputPath])).stdout,
        );
        assert.deepStrictEqual(asked.symbolDebt, {
          total: 2,
          fileCount: 1,
          files: [{ path: "src/tags.ts", unrecorded: ["renameTag", "Tag"] }],
        });

        const scoped = await checkJson(["--rules", "symbol-traceability"]);
        assert.strictEqual(scoped.structuredContent?.count, 0);
        assert.strictEqual(scoped.structuredContent?.symbolDebt, undefined);
      },
    );

    it(
      "still flags a behavioral record that has no implements link",
      { timeout: 180000 },
      async (t) => {
        if (!hasProlog) {
          t.skip("SWI-Prolog is not available");
          return;
        }
        write({
          ".kb/symbols.yaml": `${SYMBOLS}  - id: SYM-TAGS-RENAME
    title: renameTag
    sourceFile: src/tags.ts
    symbol_role: behavioral
    status: active
`,
        });
        await sync();
        const scoped = await checkJson(["--rules", "symbol-traceability"]);
        assert.deepStrictEqual(
          (scoped.structuredContent?.violations ?? []).map((violation) => [
            violation.rule,
            violation.entityId,
          ]),
          [["symbol-traceability", "SYM-TAGS-RENAME"]],
        );
      },
    );

    it(
      "ships a bootstrap skill that states the staged symbol rule",
      { timeout: 60000 },
      async (t) => {
        if (!hasProlog) {
          t.skip("SWI-Prolog is not available");
          return;
        }
        const inputPath = join(sandbox.baseDir, "skill-load.json");
        writeFileSync(
          inputPath,
          JSON.stringify({ action: "load", id: "kibi-bootstrap" }),
        );
        const result = await kibi(sandbox, ["skill", "--input", inputPath]);
        assert.strictEqual(result.exitCode, 0, output(result));
        const { body } = parseKibiResult<{ body: string }>(result.stdout);
        assert.match(
          body,
          /Read `symbolDebt\.total` from the `kb_check` result/,
        );
        assert.match(
          body,
          /`kibi check --staged` judges a commit only on the declarations it adds or changes/,
        );
        assert.match(body, /never invent a requirement link to pass the gate/);
        assert.match(
          body,
          /Do not backfill records for the debt unless the human asks/,
        );
        assert.match(
          body,
          /the unrecorded-declaration total from step 10 \(labelled not blocking\)/,
        );
      },
    );
  });
}

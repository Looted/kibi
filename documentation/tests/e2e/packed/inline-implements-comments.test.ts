import assert from "node:assert";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
  stageSourceFile,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

/**
 * Installed packages no longer read `implements` comments: the staged gate
 * takes links only from the symbol manifest, and `kibi migrate` lists the
 * comments left in tracked source as one review action without editing them.
 */

// Built from parts so this fixture is not itself a comment in this file.
const COMMENT = ["//", "implements", "REQ-greet"].join(" ");
const SOURCE = `${COMMENT}\nexport function greet() {\n  return "hi";\n}\n`;
const REQUIREMENT = [
  "---",
  "id: REQ-greet",
  "title: Greet",
  "status: open",
  "---",
  "",
  "The greeter must greet the visitor.",
  "",
  "## Context",
  "",
  "Fixture requirement that the source comment names; only a manifest link would own the function.",
  "",
].join("\n");

function write(sandbox: TestSandbox, file: string, content: string): void {
  const target = join(sandbox.repoDir, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

/** The staged gate counts only manifest links, so the comment-only function fails. */
async function assertStagedGateRejectsCommentOnlyLink(
  sandbox: TestSandbox,
): Promise<void> {
  const check = await kibi(sandbox, ["check", "--staged"], {
    timeoutMs: 120000,
  });
  const output = `${check.stdout}\n${check.stderr}`;
  assert.strictEqual(check.exitCode, 1, output);
  assert.match(output, /src\/greet\.js:\d+\s+greet\s+\(0 of 1 link\(s\)\)/);
  assert.match(output, /A code comment is never a link/);
}

/** kibi migrate names the comment in one review action and edits no source. */
async function assertMigrateListsCommentWithoutEditing(
  sandbox: TestSandbox,
): Promise<void> {
  const migrate = await kibi(sandbox, ["migrate", "--format", "json"], {
    timeoutMs: 120000,
  });
  assert.strictEqual(migrate.exitCode, 0, migrate.stderr);
  const plan = JSON.parse(migrate.stdout) as {
    actions: Array<{
      code: string;
      safety: string;
      affectedFiles: string[];
      evidence: { total: number; comments: unknown[] };
    }>;
  };
  const reviews = plan.actions.filter(
    (action) => action.code === "review_inline_implements_comment",
  );
  assert.strictEqual(reviews.length, 1);
  assert.strictEqual(reviews[0]?.safety, "review");
  assert.deepStrictEqual(reviews[0]?.affectedFiles, ["src/greet.js"]);
  assert.deepStrictEqual(reviews[0]?.evidence, {
    total: 1,
    comments: [
      {
        file: "src/greet.js",
        line: 1,
        requirements: ["REQ-greet"],
        manifestLinked: [],
      },
    ],
  });
  assert.strictEqual(
    readFileSync(join(sandbox.repoDir, "src/greet.js"), "utf8"),
    SOURCE,
  );
}

if (RUN_NODE_TEST_SUITE) {
  describe(
    "Inline implements comments are not traceability links",
    {
      timeout: 300000,
    },
    () => {
      let tarballs: Tarballs;
      let sandbox: TestSandbox;
      let hasProlog = false;

      before(
        async () => {
          hasProlog = checkPrologAvailable();
          if (!hasProlog) return;
          tarballs = await packAll();
          sandbox = createSandbox();
          await sandbox.install(tarballs);
          await sandbox.initGitRepo();
          const init = await kibi(sandbox, ["init"]);
          assert.strictEqual(init.exitCode, 0, init.stderr);
          write(sandbox, ".kb/requirements/REQ-greet.md", REQUIREMENT);
          write(sandbox, "src/greet.js", SOURCE);
          stageSourceFile(sandbox, ".kb/requirements/REQ-greet.md");
          stageSourceFile(sandbox, "src/greet.js");
        },
        { timeout: 240000 },
      );

      after(
        async () => {
          if (sandbox) await sandbox.cleanup();
        },
        { timeout: 60000 },
      );

      it("the staged gate rejects a function whose only link is a comment", async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }
        await assertStagedGateRejectsCommentOnlyLink(sandbox);
      });

      it("kibi migrate lists the comment as one review action and leaves the source alone", async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }
        await assertMigrateListsCommentWithoutEditing(sandbox);
      });
    },
  );
}

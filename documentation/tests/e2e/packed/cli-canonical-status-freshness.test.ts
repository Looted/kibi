import assert from "node:assert";
import { mkdirSync, writeFileSync } from "node:fs";
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

/**
 * E2E: canonical knowledge lanes drive status freshness.
 *
 * SCEN-cli-canonical-status — status freshness tracks canonical .kb lanes:
 * editing a canonical knowledge-lane markdown file without syncing reports
 * dirty and stale, while leftover documentation files that hold no entity
 * frontmatter never dirty the canonical knowledge state.
 */
if (RUN_NODE_TEST_SUITE) {
  describe("E2E: canonical status freshness", { timeout: 240000 }, () => {
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
        await kibi(sandbox, ["init"]);

        mkdirSync(join(sandbox.repoDir, ".kb", "requirements"), {
          recursive: true,
        });
        writeFileSync(
          join(sandbox.repoDir, ".kb", "requirements", "REQ-STATUS-FRESH.md"),
          `---
id: REQ-STATUS-FRESH
title: Status freshness fixture
status: open
---

Status freshness fixture requirement.
`,
        );
        stageSourceFile(sandbox, ".kb/requirements/REQ-STATUS-FRESH.md");
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

    async function readStatus() {
      const status = await kibi(sandbox, ["status", "--format", "json"]);
      assert.strictEqual(status.exitCode, 0, `${status.stdout}${status.stderr}`);
      return parseKibiResult<{
        dirty: boolean;
        syncState: string;
      }>(status.stdout);
    }

    it(
      "stays fresh when only non-entity documentation leftovers are added",
      { timeout: 90000 },
      async () => {
        mkdirSync(join(sandbox.repoDir, "documentation", "notes"), {
          recursive: true,
        });
        writeFileSync(
          join(sandbox.repoDir, "documentation", "notes", "readme.md"),
          "# scratch notes\n\nNo entity frontmatter here.\n",
          "utf8",
        );
        stageSourceFile(sandbox, "documentation/notes/readme.md");

        const status = await readStatus();
        assert.strictEqual(
          status.syncState,
          "fresh",
          `documentation leftovers must not dirty canonical knowledge: ${JSON.stringify(status)}`,
        );
        assert.strictEqual(status.dirty, false);
      },
    );

    it(
      "reports dirty and stale after a canonical lane addition without sync",
      { timeout: 90000 },
      async () => {
        mkdirSync(join(sandbox.repoDir, ".kb", "scenarios"), {
          recursive: true,
        });
        writeFileSync(
          join(sandbox.repoDir, ".kb", "scenarios", "SCEN-STATUS-FRESH-2.md"),
          `---
id: SCEN-STATUS-FRESH-2
title: Second status freshness scenario
status: active
---

Second canonical lane fixture.
`,
          "utf8",
        );
        stageSourceFile(sandbox, ".kb/scenarios/SCEN-STATUS-FRESH-2.md");

        const status = await readStatus();
        assert.strictEqual(
          status.dirty,
          true,
          "canonical addition must dirty the KB before sync",
        );
        assert.strictEqual(status.syncState, "stale");
      },
    );

    it(
      "returns to fresh after syncing the canonical addition",
      { timeout: 90000 },
      async () => {
        const sync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);
        const status = await readStatus();
        assert.strictEqual(status.syncState, "fresh");
        assert.strictEqual(status.dirty, false);
      },
    );
  });
}

import assert from "node:assert";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  createMarkdownFile,
  createSandbox,
  kibi,
  packAll,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

if (RUN_NODE_TEST_SUITE) {
  describe(
    "Packed E2E: Markdown string link regression (issue #93)",
    { timeout: 120000 },
    () => {
      let tarballs: Tarballs;
      let sandbox: TestSandbox;

      before(
        async () => {
          tarballs = await packAll();
          sandbox = createSandbox();
          await sandbox.install(tarballs);
          await sandbox.initGitRepo();
        },
        { timeout: 120000 },
      );

      after(
        async () => {
          if (sandbox) {
            await sandbox.cleanup();
          }
        },
        { timeout: 60000 },
      );

      it(
        "sync imports plain markdown links as relates_to relationships",
        { timeout: 60000 },
        async () => {
          const { exitCode: initCode, stderr: initError } = await kibi(
            sandbox,
            ["init"],
          );
          assert.strictEqual(
            initCode,
            0,
            `kibi init should succeed: ${initError}`,
          );

          createMarkdownFile(
            sandbox,
            "documentation/requirements/REQ-ISSUE93-001.md",
            {
              id: "REQ-ISSUE93-001",
              title: "Issue 93 regression requirement",
              status: "open",
              created_at: "2026-03-20T16:20:00Z",
              updated_at: "2026-03-20T16:20:00Z",
              source: "documentation/requirements/REQ-ISSUE93-001.md",
              links: ["SCEN-ISSUE93-001"],
            },
            "Regression test requirement for plain markdown links.",
          );

          createMarkdownFile(
            sandbox,
            "documentation/scenarios/SCEN-ISSUE93-001.md",
            {
              id: "SCEN-ISSUE93-001",
              title: "Issue 93 regression scenario",
              status: "active",
              created_at: "2026-03-20T16:20:00Z",
              updated_at: "2026-03-20T16:20:00Z",
              source: "documentation/scenarios/SCEN-ISSUE93-001.md",
            },
            "Regression test scenario for plain markdown links.",
          );

          const {
            exitCode: syncCode,
            stdout: syncOut,
            stderr: syncError,
          } = await kibi(sandbox, ["sync"]);
          assert.strictEqual(
            syncCode,
            0,
            `kibi sync should succeed: ${syncError || syncOut}`,
          );
          assert.match(
            syncOut,
            /Imported \d+ entities, \d+ relationships/,
            `sync output should include relationship counts: ${syncOut}`,
          );

          const {
            exitCode: queryCode,
            stdout: queryOut,
            stderr: queryError,
          } = await kibi(sandbox, [
            "query",
            "req",
            "--id",
            "REQ-ISSUE93-001",
            "--format",
            "json",
          ]);
          assert.strictEqual(
            queryCode,
            0,
            `kibi query should succeed: ${queryError}`,
          );

          const results = JSON.parse(queryOut) as Array<{
            relates_to?: string;
          }>;
          assert.ok(Array.isArray(results), queryOut);
          assert.strictEqual(results.length, 1, queryOut);
          assert.strictEqual(
            results[0]?.relates_to,
            "kb:entity/SCEN-ISSUE93-001",
            queryOut,
          );

          const {
            exitCode: relCode,
            stdout: relOut,
            stderr: relError,
          } = await kibi(sandbox, [
            "query",
            "--relationships",
            "REQ-ISSUE93-001",
            "--format",
            "json",
          ]);
          assert.strictEqual(
            relCode,
            0,
            `relationship query should succeed: ${relError}`,
          );

          const relationships = JSON.parse(relOut) as Array<{
            type?: string;
            from?: string;
            to?: string;
          }>;
          assert.ok(Array.isArray(relationships), relOut);
          assert.deepStrictEqual(relationships, [
            {
              type: "relates_to",
              from: "REQ-ISSUE93-001",
              to: "SCEN-ISSUE93-001",
            },
          ]);
        },
      );
    },
  );
}

import assert from "node:assert";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  createMarkdownFile,
  createSandbox,
  kibi,
  packAll,
  run,
} from "./helpers.js";

async function relationshipsOf(sandbox: TestSandbox, id: string) {
  const result = await kibi(sandbox, [
    "query",
    "--relationships",
    id,
    "--format",
    "json",
  ]);
  assert.strictEqual(result.exitCode, 0, result.stderr);
  return JSON.parse(result.stdout) as Array<{
    type?: string;
    from?: string;
    to?: string;
  }>;
}

async function stage(
  sandbox: TestSandbox,
  relativePath: string,
  content: string,
) {
  writeFileSync(join(sandbox.repoDir, relativePath), content, "utf8");
  const added = await run("git", ["add", "--", relativePath], {
    cwd: sandbox.repoDir,
    env: sandbox.env,
  });
  assert.strictEqual(added.exitCode, 0, added.stderr);
}

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
            ".kb/requirements/REQ-ISSUE93-001.md",
            {
              id: "REQ-ISSUE93-001",
              title: "Issue 93 regression requirement",
              status: "open",
              created_at: "2026-03-20T16:20:00Z",
              updated_at: "2026-03-20T16:20:00Z",
              source: ".kb/requirements/REQ-ISSUE93-001.md",
              links: ["SCEN-ISSUE93-001"],
            },
            "Regression test requirement for plain markdown links.",
          );

          createMarkdownFile(
            sandbox,
            ".kb/scenarios/SCEN-ISSUE93-001.md",
            {
              id: "SCEN-ISSUE93-001",
              title: "Issue 93 regression scenario",
              status: "active",
              created_at: "2026-03-20T16:20:00Z",
              updated_at: "2026-03-20T16:20:00Z",
              source: ".kb/scenarios/SCEN-ISSUE93-001.md",
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

      it(
        "sync imports a typed front matter relationship with its type and refuses an unknown type",
        { timeout: 60000 },
        async () => {
          createMarkdownFile(
            sandbox,
            ".kb/tests/TEST-ISSUE93-TYPED.md",
            {
              id: "TEST-ISSUE93-TYPED",
              title: "Typed link test",
              type: "test",
              status: "active",
            },
            "Reference material.",
          );
          const typed = `---
id: TEST-ISSUE93-TYPED
title: Typed link test
type: test
status: active
links:
  - type: validates
    target: SCEN-ISSUE93-001
---

Reference material.
`;
          await stage(sandbox, ".kb/tests/TEST-ISSUE93-TYPED.md", typed);
          const synced = await kibi(sandbox, ["sync"]);
          assert.strictEqual(synced.exitCode, 0, synced.stderr);
          assert.deepStrictEqual(
            await relationshipsOf(sandbox, "TEST-ISSUE93-TYPED"),
            [
              {
                type: "validates",
                from: "TEST-ISSUE93-TYPED",
                to: "SCEN-ISSUE93-001",
              },
            ],
          );

          await stage(
            sandbox,
            ".kb/tests/TEST-ISSUE93-TYPED.md",
            typed.replace("type: validates", "type: blesses"),
          );
          const refused = await kibi(sandbox, ["sync"]);
          assert.match(
            `${refused.stdout}${refused.stderr}`,
            /TEST-ISSUE93-TYPED\.md: Invalid relationship type "blesses"/,
          );
          const kept = await relationshipsOf(sandbox, "TEST-ISSUE93-TYPED");
          assert.ok(
            kept.every((relationship) => relationship.type !== "blesses"),
            JSON.stringify(kept),
          );
        },
      );

      it(
        "sync imports symbols.yaml entries and retracts a symbol removed from it",
        { timeout: 60000 },
        async () => {
          const manifest = (ids: string[]) =>
            `symbols:\n${ids
              .map(
                (id) =>
                  `  - id: ${id}\n    title: ${id}\n    sourceFile: README.md\n    symbol_role: behavioral\n    granularity_reason: config-artifact\n`,
              )
              .join("")}`;
          await stage(
            sandbox,
            ".kb/symbols.yaml",
            manifest(["SYM-ISSUE93-KEEP", "SYM-ISSUE93-GONE"]),
          );
          const synced = await kibi(sandbox, ["sync"]);
          assert.strictEqual(synced.exitCode, 0, synced.stderr);
          const ids = async () => {
            const listed = await kibi(sandbox, [
              "query",
              "symbol",
              "--format",
              "json",
            ]);
            assert.strictEqual(listed.exitCode, 0, listed.stderr);
            return (JSON.parse(listed.stdout) as Array<{ id: string }>)
              .map((symbol) => symbol.id)
              .filter((id) => id.startsWith("SYM-ISSUE93-"))
              .sort();
          };
          assert.deepStrictEqual(await ids(), [
            "SYM-ISSUE93-GONE",
            "SYM-ISSUE93-KEEP",
          ]);

          await stage(
            sandbox,
            ".kb/symbols.yaml",
            manifest(["SYM-ISSUE93-KEEP"]),
          );
          const resynced = await kibi(sandbox, ["sync"]);
          assert.strictEqual(resynced.exitCode, 0, resynced.stderr);
          assert.deepStrictEqual(await ids(), ["SYM-ISSUE93-KEEP"]);
        },
      );
    },
  );
}

// implements REQ-kibi-operation-interface-parity
import assert from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import { join, resolve } from "node:path";

// Packed tests run with the repo root as cwd, but sandbox helpers may
// chdir the process; anchor repo-root reads explicitly.
const repoRoot = process.env.KIBI_PROOF_REPO_ROOT ?? process.cwd();
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createMarkdownFile,
  createSandbox,
  kibi,
  packAll,
  run,
} from "./helpers.js";
import {
  EXPECTED_BUNDLE_PATHS,
  OPERATIONS,
} from "./mcp-cli-operation-parity-fixtures.js";
import {
  canonicalSchema,
  runStdinRoute,
  sendMcpRequest,
  stable,
  startMcpServer,
  startSparqlServer,
} from "./mcp-cli-operation-parity-support.js";

describe("packed MCP and CLI operation parity", { concurrency: false }, () => {
  let tarballs: Tarballs;
  let sandbox: TestSandbox;
  let sparqlServer: Server;
  let sparqlEndpoint = "";
  let hasProlog = false;

  before(
    async () => {
      hasProlog = checkPrologAvailable();
      if (!hasProlog) return;
      ({ server: sparqlServer, endpoint: sparqlEndpoint } =
        await startSparqlServer());
      tarballs = await packAll();
      sandbox = createSandbox();
      // This fixture verifies the base wire contract. A developer's host
      // telemetry opt-in must not turn the packed server into diagnostic mode.
      sandbox.env.KIBI_DIAGNOSTIC_MODE = "0";
      await sandbox.install(tarballs);
      await sandbox.initGitRepo();
      await kibi(sandbox, ["init"]);
      createMarkdownFile(
        sandbox,
        ".kb/requirements/REQ-PACKED-PARITY.md",
        {
          id: "REQ-PACKED-PARITY",
          title: "Packed parity",
          status: "open",
          tags: ["packed", "parity"],
          links: ["SCEN-PACKED-PARITY"],
        },
        "Packed parity fixture.",
      );
      createMarkdownFile(
        sandbox,
        ".kb/scenarios/SCEN-PACKED-PARITY.md",
        {
          id: "SCEN-PACKED-PARITY",
          title: "Packed parity scenario",
          status: "active",
        },
        "Given packed packages\nWhen routes execute\nThen their contracts remain equivalent.",
      );
      await kibi(sandbox, ["sync"]);
    },
    { timeout: 300_000 },
  );

  after(async () => {
    if (sparqlServer) {
      await new Promise<void>((resolveClose) =>
        sparqlServer.close(() => resolveClose()),
      );
    }
    if (sandbox) await sandbox.cleanup();
  });

  it(
    "drives the packed CLI JSON routes through file and stdin input",
    { timeout: 300_000 },
    async (testContext) => {
      if (!hasProlog) {
        testContext.skip("SWI-Prolog is unavailable");
        return;
      }
      assert.strictEqual(OPERATIONS.length, 21);
      for (const [index, operation] of OPERATIONS.entries()) {
        const input =
          operation.tool === "kb_sparql_remote"
            ? { ...operation.input, endpoint: sparqlEndpoint }
            : operation.input;
        const inputPath = join(sandbox.repoDir, `operation-${index}.json`);
        writeFileSync(inputPath, JSON.stringify(input), "utf8");
        const fromFile = await kibi(
          sandbox,
          [operation.route, "--input", inputPath],
          { timeoutMs: 120_000 },
        );
        assert.strictEqual(
          fromFile.exitCode,
          0,
          `${operation.tool} file input failed: ${fromFile.stderr}`,
        );
        assert.doesNotThrow(() => JSON.parse(fromFile.stdout));
        const fromStdin = await runStdinRoute(sandbox, operation.route, input);
        assert.strictEqual(
          fromStdin.exitCode,
          0,
          `${operation.tool} stdin input failed: ${fromStdin.stderr}`,
        );
        assert.doesNotThrow(() => JSON.parse(fromStdin.stdout));
      }
    },
  );

  it(
    "matches the frozen MCP schema fixture without briefing generation",
    { timeout: 120_000 },
    async (testContext) => {
      if (!hasProlog) {
        testContext.skip("SWI-Prolog is unavailable");
        return;
      }
      const process = startMcpServer(sandbox);
      try {
        await sendMcpRequest(process, 1, "initialize", {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "packed-parity", version: "1.0.0" },
        });
        process.stdin?.write(
          `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
        );
        const response = await sendMcpRequest(process, 2, "tools/list");
        assert.ifError(response.error);
        const expected = JSON.parse(
          readFileSync(
            resolve(
              repoRoot,
              "packages/mcp/tests/fixtures/contracts/tools-list.base.json",
            ),
            "utf8",
          ),
        );
        assert.deepStrictEqual(
          stable(canonicalSchema(response.result)),
          stable(canonicalSchema(expected)),
        );
        const tools = response.result?.tools as
          | readonly Record<string, unknown>[]
          | undefined;
        // 16 default tools; kb_sparql_remote and kb_job_status are opt-in.
        assert.strictEqual(tools?.length, 16);
        assert.ok(!tools?.some((tool) => tool.name === "kb_briefing_generate"));
      } finally {
        process.kill();
      }
    },
  );

  it(
    "refuses an invalid input with the same coded error on MCP and the CLI JSON route",
    { timeout: 120_000 },
    async (testContext) => {
      if (!hasProlog) {
        testContext.skip("SWI-Prolog is unavailable");
        return;
      }
      // The clause is not a verbatim fragment of the intent, so both peers
      // must refuse it, and with one error contract.
      const input = {
        intent: "Refunds must not exceed the original charge.",
        mode: "create",
        context: "Reason not stated.",
        clauses: ["Refunds are capped at the charge."],
      };
      const process = startMcpServer(sandbox);
      let mcpError: Record<string, unknown> | undefined;
      try {
        await sendMcpRequest(process, 1, "initialize", {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "packed-parity", version: "1.0.0" },
        });
        process.stdin?.write(
          `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
        );
        const response = await sendMcpRequest(process, 2, "tools/call", {
          name: "kb_compile_intent",
          arguments: input,
        });
        assert.ifError(response.error);
        assert.strictEqual(response.result?.isError, true);
        const envelope = response.result?.structuredContent as
          | { status?: string; error?: Record<string, unknown> }
          | undefined;
        assert.strictEqual(envelope?.status, "error");
        mcpError = envelope?.error;
      } finally {
        process.kill();
      }
      assert.strictEqual(mcpError?.code, "VALIDATION_FAILED");

      const cli = await runStdinRoute(sandbox, "compile-intent", input);
      assert.notStrictEqual(cli.exitCode, 0);
      const cliEnvelope = JSON.parse(cli.stdout) as {
        status: string;
        error: Record<string, unknown>;
      };
      assert.strictEqual(cliEnvelope.status, "error");
      assert.deepStrictEqual(cliEnvelope.error, mcpError);
    },
  );

  it(
    "excludes an entity that carries none of the requested tags from a tag-filtered kb_query",
    { timeout: 180_000 },
    async (testContext) => {
      if (!hasProlog) {
        testContext.skip("SWI-Prolog is unavailable");
        return;
      }
      const body =
        "Given a tagged fixture\nWhen kb_query filters by tag\nThen only matching fixtures are listed.";
      for (const [id, tags] of [
        ["SCEN-PACKED-TAG-ALT", ["alt"]],
        ["SCEN-PACKED-TAG-PARITY", ["parity"]],
        ["SCEN-PACKED-TAG-OTHER", ["unrelated"]],
      ] as const) {
        createMarkdownFile(
          sandbox,
          `.kb/scenarios/${id}.md`,
          {
            id,
            title: `Tag filter fixture ${id}`,
            status: "active",
            tags: [...tags],
          },
          body,
        );
      }
      const sync = await kibi(sandbox, ["sync"], { timeoutMs: 120_000 });
      assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);

      const process = startMcpServer(sandbox);
      let ids: string[] = [];
      try {
        await sendMcpRequest(process, 1, "initialize", {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "packed-parity", version: "1.0.0" },
        });
        process.stdin?.write(
          `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
        );
        const response = await sendMcpRequest(process, 2, "tools/call", {
          name: "kb_query",
          arguments: { type: "scenario", tags: ["parity", "alt"] },
        });
        assert.ifError(response.error);
        assert.notStrictEqual(response.result?.isError, true);
        const envelope = response.result?.structuredContent as
          | { status?: string; data?: { entities?: Array<{ id: string }> } }
          | undefined;
        assert.strictEqual(envelope?.status, "success");
        ids = (envelope?.data?.entities ?? []).map((entity) => entity.id);
      } finally {
        process.kill();
      }
      // Any-of: an entity tagged with either requested tag is returned, and
      // the untagged and differently tagged scenarios are excluded.
      assert.deepStrictEqual([...ids].sort(), [
        "SCEN-PACKED-TAG-ALT",
        "SCEN-PACKED-TAG-PARITY",
      ]);
      assert.ok(!ids.includes("SCEN-PACKED-TAG-OTHER"));
      assert.ok(!ids.includes("SCEN-PACKED-PARITY"));
    },
  );

  it(
    "ships all generated skills and resources in Cursor and Codex tarballs",
    { timeout: 120_000 },
    async (testContext) => {
      if (!hasProlog) {
        testContext.skip("SWI-Prolog is unavailable");
        return;
      }
      for (const tarball of [tarballs.cursor, tarballs.codex]) {
        const listing = await run("tar", ["-tzf", tarball], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });
        assert.strictEqual(listing.exitCode, 0, listing.stderr);
        const paths = new Set(listing.stdout.trim().split("\n"));
        for (const expectedPath of EXPECTED_BUNDLE_PATHS) {
          assert.ok(
            paths.has(expectedPath),
            `${tarball} is missing ${expectedPath}`,
          );
        }
      }
    },
  );
});

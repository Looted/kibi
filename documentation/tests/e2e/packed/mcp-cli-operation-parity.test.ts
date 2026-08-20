// implements REQ-kibi-operation-interface-parity
import assert from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import { join, resolve } from "node:path";
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
    async () => {
      if (!hasProlog) return;
      assert.strictEqual(OPERATIONS.length, 18);
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
    async () => {
      if (!hasProlog) return;
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
        assert.strictEqual(tools?.length, 21);
        assert.ok(!tools?.some((tool) => tool.name === "kb_briefing_generate"));
      } finally {
        process.kill();
      }
    },
  );

  it(
    "ships all generated skills and resources in Cursor and Codex tarballs",
    { timeout: 120_000 },
    async () => {
      if (!hasProlog) return;
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

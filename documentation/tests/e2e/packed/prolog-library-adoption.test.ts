import assert from "node:assert";
import { createServer, type Server } from "node:http";
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
 * E2E: Prolog library adoption keeps local KB behavior and exposes bounded
 * remote SPARQL.
 *
 * SCEN-prolog-library-adoption — a packed workspace syncs and answers local
 * queries, while `sparql-remote` returns remote endpoint rows through the
 * CLI and fails fast against an unreachable endpoint.
 */
if (RUN_NODE_TEST_SUITE) {
  describe("E2E: Prolog library adoption", { timeout: 300000 }, () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;
    let endpoint: Server;
    let endpointUrl = "";

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        if (!hasProlog) return;
        tarballs = await packAll();
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
        await kibi(sandbox, ["init"]);

        mkdirSync(join(sandbox.repoDir, ".kb", "scenarios"), {
          recursive: true,
        });
        writeFileSync(
          join(sandbox.repoDir, ".kb", "scenarios", "SCEN-ADOPT-LOCAL.md"),
          `---
id: SCEN-ADOPT-LOCAL
title: Local adoption fixture
status: active
---

Local fixture.
`,
        );
        stageSourceFile(sandbox, ".kb/scenarios/SCEN-ADOPT-LOCAL.md");
        const sync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);

        endpoint = createServer((request, response) => {
          let body = "";
          request.on("data", (chunk: Buffer) => {
            body += chunk.toString("utf8");
          });
          request.on("end", () => {
            response.writeHead(200, { "content-type": "application/sparql-results+json" });
            response.end(
              JSON.stringify({
                head: { vars: ["s", "p", "o"] },
                results: {
                  bindings: [
                    { s: { type: "uri", value: "https://example.org/a" } },
                  ],
                },
              }),
            );
          });
        });
        await new Promise<void>((resolve) => {
          endpoint.listen(0, "127.0.0.1", () => resolve());
        });
        const address = endpoint.address();
        if (address === null || typeof address === "string") {
          throw new Error("endpoint did not bind to a port");
        }
        endpointUrl = `http://127.0.0.1:${address.port}/sparql`;
      },
      { timeout: 240000 },
    );

    after(
      async () => {
        if (endpoint) await new Promise<void>((resolve) => endpoint.close(() => resolve()));
        if (sandbox) await sandbox.cleanup();
      },
      { timeout: 60000 },
    );

    it(
      "keeps local KB behavior working through the packed runtime",
      { timeout: 120000 },
      async () => {
        if (!hasProlog) return;
        const query = await kibi(sandbox, [
          "query",
          "scenario",
          "--format",
          "json",
        ]);
        assert.strictEqual(query.exitCode, 0, `${query.stdout}${query.stderr}`);
        const rows = parseKibiResult<Array<{ id: string }>>(query.stdout);
        assert.ok(
          rows.some((row) => row.id === "SCEN-ADOPT-LOCAL"),
          "local queries must keep returning synced entities",
        );
      },
    );

    it(
      "returns bounded remote SPARQL rows through the CLI",
      { timeout: 120000 },
      async () => {
        if (!hasProlog) return;
        const inputPath = join(sandbox.repoDir, "sparql-input.json");
        writeFileSync(
          inputPath,
          `${JSON.stringify({
            endpoint: endpointUrl,
            query: "SELECT ?s WHERE { ?s ?p ?o } LIMIT 1",
            timeoutMs: 10000,
          })}\n`,
          "utf8",
        );
        const result = await kibi(sandbox, [
          "sparql-remote",
          "--input",
          inputPath,
        ]);
        assert.strictEqual(result.exitCode, 0, `${result.stdout}${result.stderr}`);
        const envelope = JSON.parse(result.stdout) as {
          data?: { rows?: unknown[] };
        };
        assert.ok(
          Array.isArray(envelope.data?.rows) && (envelope.data?.rows ?? []).length > 0,
          `remote SPARQL must return endpoint rows: ${result.stdout.slice(0, 300)}`,
        );
      },
    );

    it(
      "fails fast against an unreachable remote endpoint",
      { timeout: 120000 },
      async () => {
        if (!hasProlog) return;
        const inputPath = join(sandbox.repoDir, "sparql-dead.json");
        writeFileSync(
          inputPath,
          `${JSON.stringify({
            endpoint: "http://127.0.0.1:9/sparql",
            query: "SELECT * WHERE { ?s ?p ?o }",
            timeoutMs: 5000,
          })}\n`,
          "utf8",
        );
        const result = await kibi(sandbox, [
          "sparql-remote",
          "--input",
          inputPath,
        ]);
        assert.notStrictEqual(
          result.exitCode,
          0,
          "an unreachable endpoint must produce an error result",
        );
      },
    );
  });
}

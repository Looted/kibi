import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Ajv from "ajv";

import { listSpecs } from "../../src/public/operations/index.js";
import { PARITY_CASES } from "./cases.js";
import { createParityWorkspace, normalizeParityValue } from "./helpers.js";
import { compareResults, runCliJsonRoute, runMCPAdapter } from "./runner.js";

const REPOSITORY_ROOT = path.resolve(import.meta.dir, "../../../..");

async function buildCli(): Promise<void> {
  const process = Bun.spawn(["bun", "run", "build:cli"], {
    cwd: REPOSITORY_ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await process.exited;
  expect(exitCode, await new Response(process.stderr).text()).toBe(0);
}

async function assertPackageCompatibility(): Promise<void> {
  const cliPackage = JSON.parse(
    await readFile(
      path.join(REPOSITORY_ROOT, "packages/cli/package.json"),
      "utf8",
    ),
  );
  const mcpPackage = JSON.parse(
    await readFile(
      path.join(REPOSITORY_ROOT, "packages/mcp/package.json"),
      "utf8",
    ),
  );
  expect(cliPackage.name).toBe("kibi-cli");
  expect(mcpPackage.name).toBe("kibi-mcp");
  expect(
    Bun.semver.satisfies(
      cliPackage.version,
      mcpPackage.dependencies["kibi-cli"],
    ),
  ).toBe(true);
}

function assertNormalizerContract(): void {
  const root = "/tmp/parity-contract";
  expect(
    normalizeParityValue(
      {
        id: "REQ-001",
        title: "Keep business data",
        created_at: "volatile",
        branch: "volatile",
        requestId: "volatile",
        _diagnostic_telemetry: { reasoning: "volatile" },
        source: `${root}/requirements/REQ-001.md`,
        message: "Prolog pid=4321",
      },
      [root],
    ),
  ).toEqual({
    id: "REQ-001",
    title: "Keep business data",
    source: "<workspace>/requirements/REQ-001.md",
    message: "pid=<pid>",
  });
}

describe("semantic MCP/CLI operation parity", () => {
  beforeAll(async () => {
    await buildCli();
    await assertPackageCompatibility();
    assertNormalizerContract();
  }, 30_000);

  afterAll(() => {
    expect(PARITY_CASES).toHaveLength(21);
  });

  for (const parityCase of PARITY_CASES) {
    test(`parity:${parityCase.operation}`, async () => {
      // Given: equivalent isolated seeded workspaces and schema-valid business input.
      const [cliWorkspace, mcpWorkspace] = await Promise.all([
        createParityWorkspace(),
        createParityWorkspace(),
      ]);
      let localSparqlServer: ReturnType<typeof Bun.serve> | undefined;
      try {
        const spec = listSpecs().find(
          ({ name }) => name === parityCase.operation,
        );
        if (spec === undefined) {
          throw new Error(`Missing catalog spec: ${parityCase.operation}`);
        }
        const input =
          parityCase.operation === "kb_sparql_remote"
            ? (() => {
                localSparqlServer = Bun.serve({
                  hostname: "127.0.0.1",
                  port: 0,
                  fetch: () =>
                    Response.json({
                      head: { vars: [] },
                      results: { bindings: [] },
                    }),
                });
                return {
                  ...parityCase.input,
                  endpoint: `${localSparqlServer.url}sparql`,
                };
              })()
            : parityCase.input;
        const validate = new Ajv({ allErrors: true, strict: false }).compile(
          spec.businessInputSchema,
        );
        expect(validate(input), JSON.stringify(validate.errors)).toBe(true);

        // When: both public transports execute the same validated input.
        const [cli, mcp] = await Promise.all([
          runCliJsonRoute(cliWorkspace.root, spec.cliName, input),
          runMCPAdapter(mcpWorkspace.root, parityCase.operation, input),
        ]);

        // Then: transport-only volatility is removed before semantic comparison.
        const comparison = compareResults(cli, mcp, (value) =>
          normalizeParityValue(value, [cliWorkspace.root, mcpWorkspace.root]),
        );
        expect(comparison.parity, comparison.diff).toBe(true);

        if (["kb_upsert", "kb_delete"].includes(parityCase.operation)) {
          const postInput = {
            type: "req",
            id:
              parityCase.operation === "kb_delete"
                ? "REQ-CONTRACT-001"
                : "REQ-CONTRACT-002",
          };
          const [cliPost, mcpPost] = await Promise.all([
            runCliJsonRoute(cliWorkspace.root, "query", postInput),
            runMCPAdapter(mcpWorkspace.root, "kb_query", postInput),
          ]);
          const postComparison = compareResults(cliPost, mcpPost, (value) =>
            normalizeParityValue(value, [cliWorkspace.root, mcpWorkspace.root]),
          );
          expect(postComparison.parity, postComparison.diff).toBe(true);

          const failedEntityQuery = { type: "req", id: "REQ-CONTRACT-FAILED" };
          const [beforeFailedCli, beforeFailedMcp] = await Promise.all([
            runCliJsonRoute(cliWorkspace.root, "query", failedEntityQuery),
            runMCPAdapter(mcpWorkspace.root, "kb_query", failedEntityQuery),
          ]);
          const invalidInput =
            parityCase.operation === "kb_delete"
              ? { ids: "REQ-CONTRACT-001" }
              : { type: "req", id: "REQ-CONTRACT-FAILED", properties: {} };
          const [failedCli, failedMcp] = await Promise.all([
            runCliJsonRoute(cliWorkspace.root, spec.cliName, invalidInput),
            runMCPAdapter(
              mcpWorkspace.root,
              parityCase.operation,
              invalidInput,
            ),
          ]);
          expect(failedCli.exitCode).toBe(2);
          expect(failedMcp.error).toBeDefined();
          const failedComparison = compareResults(
            failedCli,
            failedMcp,
            (value) =>
              normalizeParityValue(value, [
                cliWorkspace.root,
                mcpWorkspace.root,
              ]),
          );
          expect(failedComparison.parity, failedComparison.diff).toBe(true);
          const [afterFailedCli, afterFailedMcp] = await Promise.all([
            runCliJsonRoute(cliWorkspace.root, "query", failedEntityQuery),
            runMCPAdapter(mcpWorkspace.root, "kb_query", failedEntityQuery),
          ]);
          expect(afterFailedCli.stdout).toBe(beforeFailedCli.stdout);
          expect(afterFailedMcp.structuredContent).toEqual(
            beforeFailedMcp.structuredContent,
          );
        }
      } finally {
        localSparqlServer?.stop(true);
        await Promise.all([cliWorkspace.cleanup(), mcpWorkspace.cleanup()]);
      }
    }, 30_000);
  }
});

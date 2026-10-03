import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Ajv from "ajv";
import Ajv2020 from "ajv/dist/2020.js";

import { listSpecs } from "../../src/public/operations/index.js";
import { PARITY_CASES } from "./cases.js";
import {
  createImpactReviewPreparationWorkspace,
  createParityWorkspace,
  normalizeParityValue,
} from "./helpers.js";
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

  const packedOperations = await import(
    "../../dist/public/operations/index.js"
  );
  expect(typeof packedOperations.executeApplyPlan).toBe("function");
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
        attachedIno: 1499331,
        attachedDev: 2128,
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
    expect(PARITY_CASES).toHaveLength(24);
  });

  for (const parityCase of PARITY_CASES) {
    test(`parity:${parityCase.operation}`, async () => {
      if (parityCase.operation === "kb_prepare_impact_review") {
        const workspace = await createImpactReviewPreparationWorkspace();
        try {
          const headBefore = await Bun.file(
            path.join(workspace.root, ".git/HEAD"),
          ).text();
          const commitBeforeProcess = Bun.spawn(["git", "rev-parse", "HEAD"], {
            cwd: workspace.root,
            stdout: "pipe",
            stderr: "pipe",
          });
          const baseCommit = (
            await new Response(commitBeforeProcess.stdout).text()
          ).trim();
          expect(await commitBeforeProcess.exited).toBe(0);
          const child = Bun.spawn(["git", "write-tree"], {
            cwd: workspace.root,
            stdout: "pipe",
            stderr: "pipe",
          });
          const indexTreeBefore = (
            await new Response(child.stdout).text()
          ).trim();
          expect(await child.exited).toBe(0);
          const sourceBefore = await Bun.file(
            path.join(workspace.root, "notes/review.txt"),
          ).text();
          const spec = listSpecs().find(
            ({ name }) => name === parityCase.operation,
          );
          if (spec === undefined)
            throw new Error("Missing prepare operation spec");
          const validate = new Ajv({ allErrors: true, strict: false }).compile(
            spec.businessInputSchema,
          );
          expect(
            validate(parityCase.input),
            JSON.stringify(validate.errors),
          ).toBe(true);
          const validateOutput = new Ajv2020({
            allErrors: true,
            strict: false,
          }).compile(spec.outputSchema);

          const [cli, mcp] = await Promise.all([
            runCliJsonRoute(workspace.root, spec.cliName, parityCase.input),
            runMCPAdapter(
              workspace.root,
              parityCase.operation,
              parityCase.input,
            ),
          ]);
          const comparison = compareResults(cli, mcp, (value) =>
            normalizeParityValue(value, [workspace.root]),
          );
          expect(comparison.parity, comparison.diff).toBe(true);
          expect(cli.exitCode).toBe(0);

          const output = JSON.parse(cli.stdout) as {
            data?: {
              preparationVersion?: string;
              files?: readonly { path: string }[];
              residualReviewObligations?: readonly { pending?: boolean }[];
              authorship?: {
                recordTemplate?: {
                  record?: {
                    reviewer?: { id?: unknown };
                    reviewedAt?: unknown;
                    files?: readonly {
                      decision?: unknown;
                      analysisReviews?: unknown;
                    }[];
                  };
                };
              };
            };
          };
          expect(output.data?.preparationVersion).toBe(
            "kibi.impact-review-preparation.v1",
          );
          expect(
            validateOutput(JSON.parse(cli.stdout)),
            JSON.stringify(validateOutput.errors),
          ).toBe(true);
          expect(output.data?.files?.map(({ path: file }) => file)).toEqual([
            "notes/review.txt",
          ]);
          expect(
            output.data?.residualReviewObligations?.every(
              ({ pending }) => pending,
            ),
          ).toBe(true);
          const template = output.data?.authorship?.recordTemplate?.record;
          expect(template?.reviewer?.id).toBeNull();
          expect(template?.reviewedAt).toBeNull();
          expect(
            template?.files?.every(
              ({ decision, analysisReviews }) =>
                decision === null && analysisReviews === null,
            ),
          ).toBe(true);
          const authorshipData = output.data?.authorship as
            | {
                recordSchema?: object;
                templateSchema?: object;
                recordTemplate?: { record?: unknown };
              }
            | undefined;
          const templateValidator = new Ajv2020({
            allErrors: true,
            strict: false,
          }).compile(authorshipData?.templateSchema ?? {});
          expect(
            templateValidator(authorshipData?.recordTemplate),
            JSON.stringify(templateValidator.errors),
          ).toBe(true);
          const recordValidator = new Ajv2020({
            allErrors: true,
            strict: false,
          }).compile(authorshipData?.recordSchema ?? {});
          expect(recordValidator(authorshipData?.recordTemplate?.record)).toBe(
            false,
          );

          const afterTreeProcess = Bun.spawn(["git", "write-tree"], {
            cwd: workspace.root,
            stdout: "pipe",
            stderr: "pipe",
          });
          const indexTreeAfter = (
            await new Response(afterTreeProcess.stdout).text()
          ).trim();
          expect(await afterTreeProcess.exited).toBe(0);
          expect(indexTreeAfter).toBe(indexTreeBefore);
          expect(
            await Bun.file(path.join(workspace.root, ".git/HEAD")).text(),
          ).toBe(headBefore);
          expect(
            await Bun.file(
              path.join(workspace.root, "notes/review.txt"),
            ).text(),
          ).toBe(sourceBefore);

          const commitCandidate = Bun.spawn(
            [
              "git",
              "-c",
              "user.name=Parity Fixture",
              "-c",
              "user.email=parity@example.invalid",
              "commit",
              "-m",
              "Capture candidate review scope",
            ],
            { cwd: workspace.root, stdout: "pipe", stderr: "pipe" },
          );
          const [commitExit, commitError] = await Promise.all([
            commitCandidate.exited,
            new Response(commitCandidate.stderr).text(),
          ]);
          expect(commitExit, commitError).toBe(0);
          const headCommitProcess = Bun.spawn(["git", "rev-parse", "HEAD"], {
            cwd: workspace.root,
            stdout: "pipe",
            stderr: "pipe",
          });
          const headCommit = (
            await new Response(headCommitProcess.stdout).text()
          ).trim();
          expect(await headCommitProcess.exited).toBe(0);
          const diffInput = {
            scope: { kind: "diff", baseCommit, headCommit },
          };
          const [diffCli, diffMcp] = await Promise.all([
            runCliJsonRoute(workspace.root, spec.cliName, diffInput),
            runMCPAdapter(workspace.root, parityCase.operation, diffInput),
          ]);
          const diffComparison = compareResults(diffCli, diffMcp, (value) =>
            normalizeParityValue(value, [workspace.root]),
          );
          expect(diffComparison.parity, diffComparison.diff).toBe(true);
          expect(diffCli.exitCode).toBe(0);
          const diffOutput = JSON.parse(diffCli.stdout) as {
            data?: {
              snapshot?: {
                kind?: string;
                baseCommit?: string;
                headCommit?: string;
              };
              files?: readonly { path: string }[];
            };
          };
          expect(diffOutput.data?.snapshot).toMatchObject({
            kind: "diff",
            baseCommit,
            headCommit,
          });
          expect(diffOutput.data?.files?.map(({ path: file }) => file)).toEqual(
            ["notes/review.txt"],
          );
          const headAfterDiff = Bun.spawn(["git", "rev-parse", "HEAD"], {
            cwd: workspace.root,
            stdout: "pipe",
            stderr: "pipe",
          });
          expect((await new Response(headAfterDiff.stdout).text()).trim()).toBe(
            headCommit,
          );
          expect(await headAfterDiff.exited).toBe(0);

          for (const [label, options, expected] of [
            [
              "missing base policy",
              { policy: "missing" as const },
              /policy missing/i,
            ],
            [
              "malformed base policy",
              { policy: "malformed" as const },
              /policy|json/i,
            ],
            [
              "unapproved provider",
              { sourceProvider: "unapproved" as const },
              /not approved/i,
            ],
          ] as const) {
            const failingWorkspace =
              await createImpactReviewPreparationWorkspace(options);
            try {
              const failed = await runCliJsonRoute(
                failingWorkspace.root,
                spec.cliName,
                parityCase.input,
              );
              expect(
                failed.exitCode,
                `${label}: ${failed.stdout}\n${failed.stderr}`,
              ).toBe(1);
              expect(`${failed.stdout}\n${failed.stderr}`, label).toMatch(
                expected,
              );
            } finally {
              await failingWorkspace.cleanup();
            }
          }
        } finally {
          await workspace.cleanup();
        }
        return;
      }
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

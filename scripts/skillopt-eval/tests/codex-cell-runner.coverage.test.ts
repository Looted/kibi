// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { FixtureSetupError } from "../runtime/fixture-kb-setup";
import { CallerScoreInjectionError } from "../runtime/codex-cell-types";
import { FixtureIntegrityError, runCodexCell } from "../runtime/codex-cell-runner";
import { ProcessControlError } from "../runtime/process";
import {
  HAPPY_STDOUT,
  cleanupRoots,
  fakeBroker,
  fixture,
  predicateFinalState,
  request,
  roots,
  sealedEvidence,
} from "./fixtures/codex-cell-runner-fixtures";
import { evaluatorManifest } from "./fixtures/evaluator-authority-fixtures";

afterEach(cleanupRoots);

function cellOptions(
  publicFixture: Awaited<ReturnType<typeof fixture>>,
  artifactRoot: string,
  extras: Record<string, unknown> = {},
) {
  return {
    request: request(publicFixture.hash),
    fixtureRoot: publicFixture.root,
    sourceWorktree: process.cwd(),
    artifactRoot,
    targetSkill: "kibi-usage" as const,
    codexExecutable: process.execPath,
    bwrapExecutable: "/usr/bin/bwrap",
    env: process.env,
    finalStateRequests: [{ tool: "kb_status" as const, args: {} }],
    evaluatorManifest: evaluatorManifest("predicate"),
    hiddenMarkers: [],
    pricingHash: "e".repeat(64),
    priceAmount: 0,
    timeoutMs: 1_000,
    ...extras,
  };
}

function dependencies(
  extras: Partial<Parameters<typeof runCodexCell>[1]> = {},
) {
  return {
    prepareLogin: async ({ privateCodexHome }: { privateCodexHome: string }) => ({
      mode: "file" as const,
      env: { CODEX_HOME: privateCodexHome },
      realCodexHome: "/private/real-codex",
    }),
    stageBroker: async (workspace: Parameters<typeof fakeBroker>[0]) =>
      fakeBroker(workspace),
    probeMcp: async () => ({ toolNames: ["kb_status"] }),
    run: async () => ({
      argv: [],
      stdout: HAPPY_STDOUT,
      stderr: "",
      exitCode: 0,
      signal: null,
    }),
    finalState: async () => predicateFinalState(),
    diagnosticReceipt: async () => '{"tool":"kb_status"}\n',
    evaluateSealedEvidence: async ({
      finalState,
    }: {
      finalState: string;
    }) => sealedEvidence(finalState),
    clock: () => new Date("2026-07-23T11:00:00Z"),
    ...extras,
  };
}

describe("codex-cell-runner remaining rejection and assembly paths", () => {
  test("rejects caller-supplied receipts before execution", async () => {
    const publicFixture = await fixture();
    const artifactRoot = await mkdtemp(
      join(tmpdir(), "skillopt-cell-receipt-injection-"),
    );
    roots.push(artifactRoot);
    await expect(
      runCodexCell(
        cellOptions(publicFixture, artifactRoot, { receipt: { score: 100 } }),
        dependencies(),
      ),
    ).rejects.toBeInstanceOf(CallerScoreInjectionError);
  });

  test("rejects a fixture hash mismatch before login", async () => {
    const publicFixture = await fixture();
    const artifactRoot = await mkdtemp(
      join(tmpdir(), "skillopt-cell-integrity-"),
    );
    roots.push(artifactRoot);
    let logins = 0;
    await expect(
      runCodexCell(
        {
          ...cellOptions(publicFixture, artifactRoot),
          request: request("0".repeat(64)),
        },
        dependencies({
          prepareLogin: async ({ privateCodexHome }) => {
            logins += 1;
            return {
              mode: "file",
              env: { CODEX_HOME: privateCodexHome },
              realCodexHome: "/private/real-codex",
            };
          },
        }),
      ),
    ).rejects.toBeInstanceOf(FixtureIntegrityError);
    expect(logins).toBe(0);
  });

  test("replays interrupted process control and rethrows unexpected run errors", async () => {
    const publicFixture = await fixture();
    const artifactRoot = await mkdtemp(
      join(tmpdir(), "skillopt-cell-interrupt-"),
    );
    roots.push(artifactRoot);
    const interrupted = await runCodexCell(
      cellOptions(publicFixture, artifactRoot),
      dependencies({
        run: async (argv) => {
          throw new ProcessControlError("interrupted", {
            argv,
            stdout: JSON.stringify({ type: "thread.started" }),
            stderr: "ctrl-c",
            exitCode: -1,
            signal: "SIGINT",
          });
        },
      }),
    );
    expect(interrupted.receipt.result.status).toBe("interrupted");

    await expect(
      runCodexCell(
        cellOptions(publicFixture, artifactRoot, {
          request: {
            ...request(publicFixture.hash),
            episodeId: "00000000-0000-4000-8000-000000000013",
          },
        }),
        dependencies({
          run: async () => {
            throw new TypeError("host_pipe_broke");
          },
        }),
      ),
    ).rejects.toThrow("host_pipe_broke");
  });

  test("assembles a body-only candidate and bundle candidates", async () => {
    const publicFixture = await fixture();
    const artifactRoot = await mkdtemp(
      join(tmpdir(), "skillopt-cell-candidate-"),
    );
    roots.push(artifactRoot);
    const completed = await runCodexCell(
      cellOptions(publicFixture, artifactRoot, {
        candidate: { body: "Use Kibi through MCP only.\n" },
        bundleCandidates: {
          "kibi-freshness": { body: "Check freshness through MCP.\n" },
        },
      }),
      dependencies({
        stageBroker: async (workspace) => {
          const assembled = await Bun.file(
            join(workspace.target, ".agents/skills/kibi-usage/SKILL.md"),
          ).text();
          expect(assembled).toContain("Use Kibi through MCP only.");
          const broker = fakeBroker(workspace);
          await writeFile(broker.tracePath, '{"kind":"tools/call"}\n');
          return broker;
        },
      }),
    );
    expect(completed.receipt.result.status).toBe("completed");
  });

  test("dispatches each fixtureSetup mode through the staged CLI", async () => {
    const source = await mkdtemp(join(tmpdir(), "skillopt-cell-setup-src-"));
    roots.push(source);
    await mkdir(join(source, "packages/cli/dist"), { recursive: true });
    await mkdir(join(source, "packages/cli/src/public"), { recursive: true });
    await symlink(
      resolve(import.meta.dir, "../../../packages/cli/src/public/skills"),
      join(source, "packages/cli/src/public/skills"),
    );
    await writeFile(
      join(source, "packages/cli/dist/cli.js"),
      "console.error('staged cli disabled'); process.exit(1);\n",
    );
    for (const [index, fixtureSetup] of [
      "thin_root_kb",
      "seeded_fresh_kb",
      "seeded_stale_kb",
      "generated_coordinate_divergence",
    ].entries()) {
      const publicFixture = await fixture();
      const artifactRoot = await mkdtemp(
        join(tmpdir(), `skillopt-cell-setup-${index}-`),
      );
      roots.push(artifactRoot);
      await expect(
        runCodexCell(
          cellOptions(publicFixture, artifactRoot, {
            sourceWorktree: source,
            request: {
              ...request(publicFixture.hash),
              episodeId: `00000000-0000-4000-8000-00000000003${index}`,
            },
            evaluatorManifest: {
              ...evaluatorManifest("predicate"),
              fixtureSetup,
            },
          }),
          dependencies(),
        ),
      ).rejects.toBeInstanceOf(FixtureSetupError);
    }
  });
});

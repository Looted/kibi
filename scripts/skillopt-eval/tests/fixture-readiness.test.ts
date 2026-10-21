import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Client } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StdioClientTransport } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";
import { type CanonicalSkill, buildPublicCatalog } from "../catalog";
import { probeFixtureReadiness } from "../fixture-readiness";
import { parsePublicTaskSpec } from "../fixtures/contracts";
import { buildPrivateManifest } from "../fixtures/evaluator";
import { parsePrivateEvaluatorManifest } from "../fixtures/private";
import { writePublicWorkspace } from "../fixtures/workspace";
import {
  sealDefaultCellEvidence,
  verifierEnvironment,
} from "../runtime/codex-cell-defaults";
import { runIndependentFinalState } from "../runtime/final-state";
import { DEFAULT_FINAL_STATE_REQUESTS } from "../runtime/final-state-requests";
import {
  FIXTURE_BRANCH,
  setupSeededConsistencyKb,
  setupSeededDirtyKb,
  setupSeededFreshKb,
  setupSeededGovernedAreaKb,
  setupSeededPreconditionKb,
  setupSeededUncoveredKb,
  stopFixtureEngine,
} from "../runtime/fixture-kb-setup";
import { stageKibiMcpRuntime } from "../runtime/staged-mcp";

const roots: string[] = [];

async function runBounded(
  argv: readonly string[],
  cwd: string,
  timeoutMs: number,
): Promise<Readonly<{ exitCode: number; stdout: string; stderr: string }>> {
  const child = Bun.spawn([...argv], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, timeoutMs);
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  clearTimeout(timeout);
  return {
    exitCode: timedOut ? -1 : exitCode,
    stdout,
    stderr,
  };
}

async function ensureCliBuild(): Promise<string> {
  const repository = resolve(import.meta.dir, "../../../");
  const cliRoot = join(repository, "packages", "cli");
  const cliEntry = join(cliRoot, "dist", "cli.js");
  if (!(await Bun.file(cliEntry).exists())) {
    const result = await runBounded(
      [process.execPath, "run", "build:cli"],
      repository,
      120_000,
    );
    if (result.exitCode !== 0) {
      throw new Error(`CLI build failed: ${result.stderr || result.stdout}`);
    }
  }
  return cliRoot;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

test("seeded readiness probe stops and removes its workspace on success or setup failure", async () => {
  for (const fails of [false, true]) {
    const root = await mkdtemp(join(tmpdir(), "skillopt-readiness-test-"));
    roots.push(root);
    const workspace = join(root, "probe");
    const events: string[] = [];
    const promise = probeFixtureReadiness(workspace, "/trusted/cli", {
      setup: async (path, cli) => {
        expect(path).toBe(workspace);
        expect(cli).toBe("/trusted/cli");
        events.push("setup");
        await writeFile(join(path, "fixture.txt"), "synthetic fixture");
        if (fails) throw new Error("synthetic_prolog_crash");
      },
      stop: async (path) => {
        expect(path).toBe(workspace);
        events.push("stop");
      },
    });
    if (fails) await expect(promise).rejects.toThrow("synthetic_prolog_crash");
    else await promise;
    expect(events).toEqual(["setup", "stop"]);
    await expect(access(workspace)).rejects.toThrow();
  }
});

test("readiness refuses an existing workspace without executing setup or cleanup", async () => {
  const root = await mkdtemp(join(tmpdir(), "skillopt-readiness-existing-"));
  roots.push(root);
  const workspace = join(root, "probe");
  await mkdir(workspace);
  await expect(
    probeFixtureReadiness(workspace, "/trusted/cli", {
      setup: async () => {
        throw new Error("must_not_setup");
      },
      stop: async () => {
        throw new Error("must_not_stop");
      },
    }),
  ).rejects.toThrow("EEXIST");
  await access(workspace);
});

test("seeded readiness has zero kb_check violations through the CLI", async () => {
  const root = await mkdtemp(join(tmpdir(), "skillopt-readiness-cli-"));
  roots.push(root);
  const cliRoot = await ensureCliBuild();

  await probeFixtureReadiness(join(root, "probe"), cliRoot, {
    setup: async (workspace, cli) => {
      await setupSeededFreshKb(workspace, cli);
      const result = await runBounded(
        [
          process.execPath,
          join(cli, "dist", "cli.js"),
          "check",
          "--format",
          "json",
        ],
        workspace,
        30_000,
      );
      expect(result.exitCode).toBe(0);
      const check = JSON.parse(result.stdout) as {
        structuredContent?: { violations?: unknown[] };
      };
      expect(check.structuredContent?.violations).toEqual([]);
    },
    stop: stopFixtureEngine,
  });
});

// The reasoning-case seeds must pass the CLI's own blocking checks (entity
// context, supersede reasons) or every supplemental cell fails at setup.
test.each([
  ["governed-area", setupSeededGovernedAreaKb],
  ["precondition", setupSeededPreconditionKb],
  ["consistency", setupSeededConsistencyKb],
] as const)(
  "%s seed passes its own validation",
  async (name, setup) => {
    const root = await mkdtemp(join(tmpdir(), `skillopt-seed-${name}-`));
    roots.push(root);
    const cliRoot = await ensureCliBuild();
    const workspace = join(root, "workspace");
    await mkdir(workspace, { recursive: true });
    try {
      await setup(workspace, cliRoot);
    } finally {
      await stopFixtureEngine(workspace);
    }
  },
  120_000,
);

function developmentFixture(skill: CanonicalSkill, family: string) {
  const task = buildPublicCatalog().find(
    (candidate) =>
      candidate.skill === skill &&
      candidate.family === family &&
      candidate.split === "development",
  );
  if (task === undefined) throw new Error(`Missing task ${skill}/${family}`);
  const manifest = parsePrivateEvaluatorManifest(
    JSON.stringify(
      buildPrivateManifest({
        task: task as never,
        publicManifestHash: "a".repeat(64),
        workspaceHash: "b".repeat(64),
      }),
    ),
  );
  return { task, manifest };
}

async function stagedWorkspace(
  name: string,
  fixture: ReturnType<typeof developmentFixture>,
): Promise<Readonly<{ workspace: string; cliRoot: string }>> {
  const root = await mkdtemp(join(tmpdir(), `skillopt-verifier-${name}-`));
  roots.push(root);
  const cliRoot = await ensureCliBuild();
  const workspace = join(root, "workspace");
  writePublicWorkspace({
    root: workspace,
    task: parsePublicTaskSpec(fixture.task),
    canonicalSkillRoot: resolve(
      import.meta.dir,
      "../../../packages/cli/src/public/skills",
    ),
  });
  const setup = {
    seeded_fresh_kb: setupSeededFreshKb,
    seeded_dirty_kb: setupSeededDirtyKb,
    seeded_uncovered_kb: setupSeededUncoveredKb,
  }[
    fixture.manifest.fixtureSetup as
      | "seeded_fresh_kb"
      | "seeded_dirty_kb"
      | "seeded_uncovered_kb"
  ];
  if (setup === undefined) {
    throw new Error(`unexpected setup ${fixture.manifest.fixtureSetup}`);
  }
  try {
    await setup(workspace, cliRoot);
  } finally {
    await stopFixtureEngine(workspace);
  }
  return { workspace, cliRoot };
}

/** Runs one CLI route with the environment the final-state verifier uses. */
async function verifierCli(
  workspace: string,
  cliRoot: string,
  args: readonly string[],
  stdin?: string,
): Promise<Record<string, unknown>> {
  const env = verifierEnvironment(
    { ...process.env, KIBI_BRANCH: FIXTURE_BRANCH },
    workspace,
  );
  const child = Bun.spawn(
    [process.execPath, join(cliRoot, "dist", "cli.js"), ...args],
    {
      cwd: workspace,
      env,
      ...(stdin === undefined ? {} : { stdin: new Blob([stdin]) }),
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [stdout] = await Promise.all([
    new Response(child.stdout).text(),
    child.exited,
  ]);
  await stopFixtureEngine(workspace);
  try {
    return JSON.parse(stdout) as Record<string, unknown>;
  } catch {
    // Mutation routes print one JSON envelope, then a human error line.
    const line = stdout
      .split("\n")
      .find((candidate) => candidate.trim().startsWith("{"));
    return JSON.parse(line ?? stdout) as Record<string, unknown>;
  }
}

function resultHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/** Seal a verifier receipt built from the CLI's own status and check output. */
async function sealVerifierState(
  fixture: ReturnType<typeof developmentFixture>,
  workspace: string,
  cliRoot: string,
) {
  const status = {
    structuredContent: await verifierCli(workspace, cliRoot, [
      "status",
      "--format",
      "json",
    ]),
  };
  const check = await verifierCli(workspace, cliRoot, [
    "check",
    "--format",
    "json",
  ]);
  const requests = [
    { tool: "kb_check" as const, args: {}, result: check },
    { tool: "kb_status" as const, args: {}, result: status },
  ];
  const sealed = sealDefaultCellEvidence(
    {
      evaluatorManifest: fixture.manifest,
      finalStateRequests: requests.map(({ tool, args }) => ({ tool, args })),
    },
    {
      finalState: JSON.stringify({
        schemaVersion: "1.0.0",
        workspaceRoot: workspace,
        requests: requests.map((request) => ({
          ...request,
          resultHash: resultHash(request.result),
        })),
      }),
      brokerTrace: "",
      diagnosticReceipt: "",
    },
  );
  const claim = (key: string) =>
    sealed.finalState.claims.find((entry) => entry.key === key)?.value;
  return { status: status.structuredContent, sealed, claim };
}

// The verifier must observe the state each expectation names: an exact Git
// attachment, a dirty source edit, or a recoverable malformed mutation.
test("branch classification fixture shows the verifier an exact attachment", async () => {
  const fixture = developmentFixture(
    "kibi-freshness",
    "branch-status-classification",
  );
  const { workspace, cliRoot } = await stagedWorkspace("branch", fixture);
  const { status, sealed, claim } = await sealVerifierState(
    fixture,
    workspace,
    cliRoot,
  );
  expect(status.branchAttachment).toMatchObject({
    gitBranch: FIXTURE_BRANCH,
    kbBranch: FIXTURE_BRANCH,
    kind: "exact",
  });
  expect(sealed.finalState.closeout.kbState).toBe("clean_fresh");
  expect(sealed.finalState.closeout.verificationState).toBe("fresh");
  // Signal 1: exact Git branch equals KB branch.
  expect(claim("workflow-signal-1")).toBe(true);
}, 180_000);

test("verifier keeps a pinned branch the checkout is not on", async () => {
  const root = await mkdtemp(join(tmpdir(), "skillopt-verifier-env-"));
  roots.push(root);
  const env = { PATH: process.env.PATH, KIBI_BRANCH: FIXTURE_BRANCH };
  // Not a repository: the pin is the only branch identity.
  expect(verifierEnvironment(env, root).KIBI_BRANCH).toBe(FIXTURE_BRANCH);
  const git = (args: readonly string[]) =>
    Bun.spawnSync(["git", ...args], { cwd: root, stdout: "ignore" });
  git(["init", "-q", "-b", "another-branch"]);
  expect(verifierEnvironment(env, root).KIBI_BRANCH).toBe(FIXTURE_BRANCH);
  git(["checkout", "-q", "-b", FIXTURE_BRANCH]);
  expect(verifierEnvironment(env, root).KIBI_BRANCH).toBeUndefined();
});

test.each([
  ["kibi-freshness", "source-linked-impact"],
  ["kibi-freshness", "completion-outcome"],
  ["kibi-traceability", "symbol-impact-granularity"],
] as const)(
  "%s/%s fixture shows the verifier the expected dirty state",
  async (skill, family) => {
    const fixture = developmentFixture(skill, family);
    const expectation = fixture.manifest.workflowExpectation;
    if (expectation == null) throw new Error("missing expectation");
    const { workspace, cliRoot } = await stagedWorkspace(family, fixture);
    const { status, sealed } = await sealVerifierState(
      fixture,
      workspace,
      cliRoot,
    );
    expect(status.dirty).toBe(true);
    expect(sealed.finalState.closeout.kbState).toBe(
      expectation.expectedKbState,
    );
    expect(sealed.finalState.closeout.verificationState).toBe(
      expectation.expectedVerificationState,
    );
  },
  180_000,
);

test("validation recovery input names a target its diagnostics can repair", async () => {
  const fixture = developmentFixture("kibi-usage", "validation-recovery");
  const expectation = fixture.manifest.workflowExpectation;
  if (expectation == null) throw new Error("missing expectation");
  const { workspace, cliRoot } = await stagedWorkspace("recovery", fixture);
  const malformed = JSON.parse(
    await readFile(join(workspace, "inputs", "malformed.json"), "utf8"),
  ) as { id?: unknown; properties?: { title?: unknown } };
  const documented = await readFile(
    join(workspace, "documentation", "requirements", "fixture.md"),
    "utf8",
  );
  expect(typeof malformed.id).toBe("string");
  expect(documented).toContain(`id: ${String(malformed.id)}`);
  const dryRun = await verifierCli(
    workspace,
    cliRoot,
    ["upsert", "--input", "-"],
    JSON.stringify({ ...malformed, dryRun: true }),
  );
  expect(dryRun.status).toBe("error");
  expect(JSON.stringify(dryRun.error)).toContain("/type");
  const repaired = await verifierCli(
    workspace,
    cliRoot,
    ["upsert", "--input", "-"],
    JSON.stringify({
      type: "req",
      id: malformed.id,
      properties: { title: malformed.properties?.title, status: "open" },
      document: {
        body: "The fixture requirement is recorded.\n\n## Context\n\nRecovered from inputs/malformed.json. Reason not stated.\n\n## Source\n\nvalidation-recovery fixture requirement\n",
      },
    }),
  );
  expect(repaired.status).toBe("success");
  const { sealed } = await sealVerifierState(fixture, workspace, cliRoot);
  expect(sealed.finalState.closeout.kbState).toBe(expectation.expectedKbState);
  expect(sealed.finalState.closeout.verificationState).toBe(
    expectation.expectedVerificationState,
  );
}, 180_000);

// The executable-coverage objective must start without the coverage edge it
// asks for, so its signals and closeout reflect only the agent's write. This
// drives the verifier through the staged MCP runtime the cells use.
test("executable coverage fixture credits only an agent-applied coverage link", async () => {
  const fixture = developmentFixture(
    "kibi-traceability",
    "executable-coverage",
  );
  expect(fixture.manifest.fixtureSetup).toBe("seeded_uncovered_kb");
  const expectation = fixture.manifest.workflowExpectation;
  if (expectation == null) throw new Error("missing expectation");
  const repository = resolve(import.meta.dir, "../../..");
  const { workspace } = await stagedWorkspace("coverage", fixture);
  const privateEvidence = join(workspace, "..", "private");
  await mkdir(privateEvidence, { recursive: true });
  const launch = await stageKibiMcpRuntime(
    { target: workspace, privateEvidence },
    repository,
  );
  const env = verifierEnvironment(
    { ...process.env, KIBI_BRANCH: FIXTURE_BRANCH },
    workspace,
  );
  let round = 0;
  const finalState = async () => {
    round += 1;
    const receipt = await runIndependentFinalState({
      launch: {
        command: launch.command,
        args: [...launch.args],
        cwd: workspace,
        env,
      },
      receiptPath: join(privateEvidence, `final-state-${round}.json`),
      requests: DEFAULT_FINAL_STATE_REQUESTS.map((request) => ({
        tool: request.tool,
        args: { ...request.args },
      })),
      timeoutMs: 120_000,
    });
    await stopFixtureEngine(workspace);
    const sealed = sealDefaultCellEvidence(
      {
        evaluatorManifest: fixture.manifest,
        finalStateRequests: DEFAULT_FINAL_STATE_REQUESTS,
      },
      {
        finalState: JSON.stringify(receipt),
        brokerTrace: "",
        diagnosticReceipt: "",
      },
    );
    const claim = (key: string) =>
      sealed.finalState.claims.find((entry) => entry.key === key)?.value;
    return { sealed, claim };
  };

  // The seed alone credits neither signal.
  const before = await finalState();
  expect(before.claim("workflow-signal-1")).toBe(false);
  expect(before.claim("workflow-signal-2")).toBe(false);

  // The agent links the production symbol to the seeded executable test.
  const client = new Client({ name: "fixture-agent", version: "1.0.0" });
  await client.connect(
    new StdioClientTransport({
      command: launch.command,
      args: [...launch.args],
      cwd: workspace,
      env,
      stderr: "pipe",
    }),
  );
  try {
    const write = await client.callTool(
      {
        name: "kb_upsert",
        arguments: {
          type: "symbol",
          id: "SYM-SETUP-FIXTURE",
          properties: {
            title: "fixtureFamily",
            status: "active",
            sourceFile: "src/fixture.ts",
          },
          relationships: [
            {
              type: "implements",
              from: "SYM-SETUP-FIXTURE",
              to: "REQ-SETUP-BASE",
            },
            {
              type: "covered_by",
              from: "SYM-SETUP-FIXTURE",
              to: "TEST-SETUP-FIXTURE",
            },
          ],
        },
      },
      undefined,
      { timeout: 120_000 },
    );
    expect(write.isError).not.toBe(true);
  } finally {
    await client.close();
    await stopFixtureEngine(workspace);
  }

  const after = await finalState();
  expect(after.claim("workflow-signal-1")).toBe(true);
  expect(after.claim("workflow-signal-2")).toBe(true);
  expect(after.sealed.finalState.closeout).toMatchObject({
    taskOutcome: "complete",
    kbState: expectation.expectedKbState,
    verificationState: expectation.expectedVerificationState,
    proofState: expectation.expectedProofState,
  });
}, 300_000);

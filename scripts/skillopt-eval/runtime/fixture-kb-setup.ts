import { execFile } from "node:child_process";
import { writeFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { EngineClient } from "../../../packages/cli/src/engine";
import { buildUpsertCommitGoal } from "../../../packages/cli/src/operations/mutation/contradictions";
import { escapeAtom } from "../../../packages/cli/src/prolog/codec";

const execFileAsync = promisify(execFile);

export const FIXTURE_BRANCH = "skillopt-eval";

export class FixtureSetupError extends Error {
  override readonly name = "FixtureSetupError";
}

const COORDINATE_KEYS = [
  "sourceLine",
  "sourceColumn",
  "sourceEndLine",
  "sourceEndColumn",
] as const;

// implements REQ-generated-coordinate-persistence
export function assertSymbolCoordinatesPresent(
  entity: Record<string, unknown>,
  symbolId: string,
): void {
  if (
    entity.id !== symbolId ||
    COORDINATE_KEYS.some((key) => typeof entity[key] !== "number")
  ) {
    throw new FixtureSetupError(
      `fixture symbol ${symbolId} must have generated coordinates before strip`,
    );
  }
}

// implements REQ-generated-coordinate-persistence
export function assertSymbolCoordinatesAbsent(
  entity: Record<string, unknown>,
  symbolId: string,
): void {
  if (
    entity.id !== symbolId ||
    COORDINATE_KEYS.some((key) => Object.hasOwn(entity, key))
  ) {
    throw new FixtureSetupError(
      `fixture symbol ${symbolId} must not have generated coordinates after strip`,
    );
  }
}

interface CliResult {
  readonly ok: boolean;
  readonly stdout: string;
  readonly stderr: string;
}

interface CliRetryOptions {
  readonly retryOnInteractivePrologTimeout?: boolean;
  readonly retryDelayMs?: number;
}

const INTERACTIVE_PROLOG_ENTITY_TIMEOUT =
  /Query timeout after \d+(?:\.\d+)?s \(stage=[^,\s]+, pid=\d+, killed=(?:yes|no), exitCode=(?:null|\d+), goal=kb_assert_entity\)/;

function isInteractivePrologEntityTimeout(result: CliResult): boolean {
  return INTERACTIVE_PROLOG_ENTITY_TIMEOUT.test(result.stderr || result.stdout);
}

// Safe only for this sync failure because publication has not happened and the
// failed sync cleans its staging path before returning.
// runStagedCli also terminates the timed-out process and fixture engine first.
// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export async function runCliWithRetry(
  command: () => Promise<CliResult>,
  label: string,
  options: CliRetryOptions = {},
): Promise<string> {
  let result = await command();
  let attempts = 1;
  if (
    options.retryOnInteractivePrologTimeout === true &&
    !result.ok &&
    isInteractivePrologEntityTimeout(result)
  ) {
    await Bun.sleep(options.retryDelayMs ?? 100);
    result = await command();
    attempts = 2;
  }
  if (!result.ok) {
    const attemptSuffix = attempts === 2 ? " after 2 attempts" : "";
    throw new FixtureSetupError(
      `${label} failed${attemptSuffix}: ${result.stderr.slice(0, 500) || result.stdout.slice(0, 200)}`,
    );
  }
  return result.stdout;
}

async function runStagedCli(
  cliRoot: string,
  workspaceTarget: string,
  args: readonly string[],
  stdin?: string,
): Promise<CliResult> {
  const child = Bun.spawn(
    [process.execPath, join(cliRoot, "dist", "cli.js"), ...args],
    {
      cwd: workspaceTarget,
      env: { ...process.env, KIBI_BRANCH: FIXTURE_BRANCH },
      ...(stdin === undefined ? {} : { stdin: new Blob([stdin]) }),
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  try {
    return { ok: exitCode === 0, stdout, stderr };
  } finally {
    await stopFixtureEngine(workspaceTarget);
  }
}

/**
 * Evaluator-owned precondition builder for the generated-coordinate repair
 * objective. Runs entirely outside the model sandbox using the staged
 * production CLI: author requirement + symbol through source-first upserts,
 * refresh + sync so artifact/cache/RDF all carry coordinates, commit tracked
 * setup files, then strip exactly the four coordinate literals through the
 * production commit path. Only the fixed forced-reassertion flow can repair
 * this state; the target model never gains direct `.kb` access.
 */
// implements REQ-skillopt-codex-optimization
export async function setupGeneratedCoordinateDivergence(
  workspaceTarget: string,
  cliRoot: string,
  symbolId: string,
): Promise<void> {
  const expectOk = async (
    result: CliResult,
    label: string,
  ): Promise<string> => {
    if (!result.ok) {
      throw new FixtureSetupError(
        `${label} failed: ${result.stderr.slice(0, 500) || result.stdout.slice(0, 200)}`,
      );
    }
    return result.stdout;
  };

  // Git identity on the evaluation branch; exclude runtime outputs.
  await initFixtureRepository(workspaceTarget);

  await expectOk(
    await runStagedCli(cliRoot, workspaceTarget, ["init"]),
    "kibi init",
  );

  writeFileSync(
    join(workspaceTarget, "src", "fixture.ts"),
    "export function fixtureFamily() {\n  return true;\n}\n",
  );
  writeFileSync(
    join(workspaceTarget, ".kb", "symbols.yaml"),
    `symbols:
  - id: ${symbolId}
    title: fixtureFamily
    sourceFile: src/fixture.ts
    status: active
`,
  );

  const upsert = async (payload: unknown, label: string): Promise<void> => {
    await expectOk(
      await runStagedCli(
        cliRoot,
        workspaceTarget,
        ["upsert", "--input", "-"],
        JSON.stringify(payload),
      ),
      label,
    );
  };
  await upsert(
    {
      type: "req",
      id: "REQ-SETUP-COORD",
      properties: { title: "Coordinate fixture requirement", status: "open" },
      document: { path: ".kb/requirements/REQ-SETUP-COORD.md" },
    },
    "requirement upsert",
  );
  await upsert(
    {
      type: "symbol",
      id: symbolId,
      properties: {
        title: "fixtureFamily",
        status: "active",
        sourceFile: "src/fixture.ts",
      },
      relationships: [
        { type: "implements", from: symbolId, to: "REQ-SETUP-COORD" },
      ],
    },
    "symbol upsert",
  );

  await expectOk(
    await runStagedCli(cliRoot, workspaceTarget, [
      "sync",
      "--refresh-symbol-coordinates",
    ]),
    "refresh sync",
  );
  await expectOk(
    await runStagedCli(cliRoot, workspaceTarget, ["sync"]),
    "import sync",
  );

  // Strip RDF coordinates with the production commit path.
  const queryOutput = await expectOk(
    await runStagedCli(cliRoot, workspaceTarget, [
      "query",
      "symbol",
      "--format",
      "json",
    ]),
    "readback",
  );
  const parsed: unknown = JSON.parse(queryOutput);
  const entities = Array.isArray(parsed)
    ? parsed
    : ((parsed as { entities?: unknown[] }).entities ?? []);
  const entity = entities.find(
    (candidate): candidate is Record<string, unknown> =>
      typeof candidate === "object" &&
      candidate !== null &&
      (candidate as Record<string, unknown>).id === symbolId,
  );
  if (entity === undefined) {
    throw new FixtureSetupError("setup symbol missing after import sync");
  }
  assertSymbolCoordinatesPresent(entity, symbolId);

  await stripSymbolCoordinates(workspaceTarget, entity);

  const strippedOutput = await expectOk(
    await runStagedCli(cliRoot, workspaceTarget, [
      "query",
      "symbol",
      "--format",
      "json",
    ]),
    "stripped readback",
  );
  const strippedParsed: unknown = JSON.parse(strippedOutput);
  const strippedEntities = Array.isArray(strippedParsed)
    ? strippedParsed
    : ((strippedParsed as { entities?: unknown[] }).entities ?? []);
  const strippedEntity = strippedEntities.find(
    (candidate): candidate is Record<string, unknown> =>
      typeof candidate === "object" &&
      candidate !== null &&
      (candidate as Record<string, unknown>).id === symbolId,
  );
  if (strippedEntity === undefined) {
    throw new FixtureSetupError("setup symbol missing after coordinate strip");
  }
  assertSymbolCoordinatesAbsent(strippedEntity, symbolId);

  // Commit tracked setup content so the worktree is clean for the model.
  await execFileAsync("git", ["add", "-A"], { cwd: workspaceTarget });
  await execFileAsync(
    "git",
    ["commit", "-q", "--no-verify", "-m", "evaluator fixture state"],
    { cwd: workspaceTarget },
  );
}

/** Remove exactly the four coordinate literals via production core. */
// implements REQ-skillopt-codex-optimization
export async function stripSymbolCoordinates(
  workspaceTarget: string,
  fullEntity: Record<string, unknown>,
): Promise<void> {
  const stripped: Record<string, unknown> = { ...fullEntity };
  for (const key of COORDINATE_KEYS) {
    delete stripped[key];
  }
  const daemon = new EngineClient({
    workspaceRoot: workspaceTarget,
    branch: FIXTURE_BRANCH,
    timeout: 5_000,
  });
  try {
    await daemon.stop(false);
  } catch {
    // No daemon was running.
  }
  await daemon.terminate();
  const { PrologProcess } = await import("../../../packages/cli/src/prolog.js");
  const prolog = new PrologProcess({ timeout: 120_000 });
  try {
    await prolog.start();
    // Resolve the exact branch store path through the locator contract.
    const { branchStorePath } = await import(
      "../../../packages/cli/src/utils/branch-store-locator.js"
    );
    const activeStorePath = branchStorePath(workspaceTarget, FIXTURE_BRANCH);
    const attached = await prolog.query(
      `kb_attach('${escapeAtom(activeStorePath)}')`,
    );
    if (!attached.success) {
      throw new FixtureSetupError(attached.error ?? "attach failed");
    }
    const written = await prolog.query(
      buildUpsertCommitGoal({
        entity: stripped,
        relationships: [],
        skipContradictionCheck: true,
      }),
    );
    if (!written.success) {
      throw new FixtureSetupError(written.error ?? "strip commit failed");
    }
    const detached = await prolog.query("kb_detach");
    if (!detached.success) {
      throw new FixtureSetupError(detached.error ?? "detach failed");
    }
  } finally {
    await prolog.terminate();
  }
}

/** Shared fixture repository bootstrap: evaluation branch, identity, excludes. */
// implements REQ-skillopt-codex-optimization
export async function initFixtureRepository(
  workspaceTarget: string,
): Promise<void> {
  await execFileAsync("git", ["init", "-q", "-b", FIXTURE_BRANCH], {
    cwd: workspaceTarget,
  });
  for (const [key, value] of [
    ["user.email", "skillopt@eval"],
    ["user.name", "SkillOpt Evaluator"],
  ] as const) {
    await execFileAsync("git", ["config", key, value], {
      cwd: workspaceTarget,
    });
  }
  writeFileSync(
    join(workspaceTarget, ".git", "info", "exclude"),
    [
      ".runtime/",
      ".sandbox-home/",
      ".kb/branches/",
      ".kb/audit.log",
      ".kb/usage.log",
      ".kb/recovery/",
      "",
    ].join("\n"),
  );
  await execFileAsync(
    "git",
    ["commit", "-q", "--allow-empty", "-m", "fixture init"],
    { cwd: workspaceTarget },
  );
}

async function stageCommitAll(workspaceTarget: string): Promise<void> {
  await execFileAsync("git", ["add", "-A"], { cwd: workspaceTarget });
  // Fixture staging is evaluator-owned; `kibi init` installs the production
  // pre-commit gate into staged workspaces, and thin fixtures legitimately
  // carry source files without KB ownership yet, so bypass it deliberately.
  await execFileAsync(
    "git",
    ["commit", "-q", "--no-verify", "-m", "evaluator fixture state"],
    { cwd: workspaceTarget },
  );
}

/**
 * Evaluator-owned staging for tasks whose declared initial KB state is
 * "absent" (attached_thin_bootstrap). Infrastructure only: repository, root
 * init, empty sync, committed. No knowledge entities are fabricated, so
 * kb_plan_bootstrap stays eligible and apply gates remain meaningful.
 */
// implements REQ-skillopt-codex-optimization
export async function setupThinRootKb(
  workspaceTarget: string,
  cliRoot: string,
): Promise<void> {
  await initFixtureRepository(workspaceTarget);
  const expectOk = async (args: readonly string[], label: string) => {
    const result = await runStagedCli(cliRoot, workspaceTarget, args);
    if (!result.ok) {
      throw new FixtureSetupError(
        `${label} failed: ${result.stderr.slice(0, 500) || result.stdout.slice(0, 200)}`,
      );
    }
    return result.stdout;
  };
  await expectOk(["init"], "kibi init");
  await expectOk(["sync"], "thin sync");
  await stageCommitAll(workspaceTarget);
}

/**
 * Evaluator-owned staging for tasks declaring initialState.kb "fresh": a
 * committed, seeded, fully-synced KB (probe-verified: kb_status reports
 * dirty=false, syncState=fresh, verification snapshot available) plus one
 * source-linked symbol pair so discovery/query signals have real content.
 */
// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export async function setupSeededFreshKb(
  workspaceTarget: string,
  cliRoot: string,
): Promise<void> {
  await initFixtureRepository(workspaceTarget);
  const expectOk = async (args: readonly string[], label: string) => {
    return runCliWithRetry(
      () => runStagedCli(cliRoot, workspaceTarget, args),
      label,
    );
  };
  await expectOk(["init"], "kibi init");
  await mkdir(join(workspaceTarget, ".kb", "requirements"), {
    recursive: true,
    mode: 0o700,
  });
  await writeFile(
    join(workspaceTarget, ".kb", "requirements", "REQ-SETUP-BASE.md"),
    [
      "---",
      "title: seeded fixture requirement",
      "status: open",
      "id: REQ-SETUP-BASE",
      "type: req",
      "---",
      "",
    ].join("\n"),
    "utf8",
  );
  await writeFile(
    join(workspaceTarget, ".kb", "symbols.yaml"),
    [
      "symbols:",
      "  - id: SYM-SETUP-FIXTURE",
      "    title: fixtureFamily",
      "    status: active",
      "    sourceFile: src/fixture.ts",
      "    relationships:",
      "      - type: implements",
      "        target: REQ-SETUP-BASE",
      "",
    ].join("\n"),
    "utf8",
  );
  // Sync discovers tracked source files. Commit the evaluator-owned seed before
  // importing it so the branch snapshot contains the two authored entities.
  await stageCommitAll(workspaceTarget);
  await runCliWithRetry(
    () => runStagedCli(cliRoot, workspaceTarget, ["sync"]),
    "import sync",
    { retryOnInteractivePrologTimeout: true },
  );
}

/**
 * Evaluator-owned staging for tasks declaring initialState.kb "stale": the
 * seeded-fresh baseline plus a committed source drift that the compiled store
 * has not absorbed (probe-verified: kb_status reports syncState=stale with a
 * clean worktree), so staleness-classification signals have real content.
 */
// implements REQ-skillopt-codex-optimization
export async function setupSeededStaleKb(
  workspaceTarget: string,
  cliRoot: string,
): Promise<void> {
  await setupSeededFreshKb(workspaceTarget, cliRoot);
  const requirementPath = join(
    workspaceTarget,
    ".kb",
    "requirements",
    "REQ-SETUP-BASE.md",
  );
  const original = await readFile(requirementPath, "utf8");
  await writeFile(
    requirementPath,
    `${original}\nUnabsorbed evaluator drift: stale-state classification seed.\n`,
    "utf8",
  );
  await stageCommitAll(workspaceTarget);
}

/**
 * Shut down any lingering staging engine daemon so the brokered MCP server
 * attaches a clean branch store. Two live Prolog clients on one store corrupt
 * each other's foreign term handles (observed as `invalid term_t` during
 * staged upserts when the broker launched first).
 */
// implements REQ-skillopt-codex-optimization
export async function stopFixtureEngine(
  workspaceTarget: string,
): Promise<void> {
  const daemon = new EngineClient({
    workspaceRoot: workspaceTarget,
    branch: FIXTURE_BRANCH,
    timeout: 5_000,
  });
  try {
    await daemon.stop(false);
  } catch {
    // No daemon was running.
  }
  await daemon.terminate();
}

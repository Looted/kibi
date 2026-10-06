import { execFile } from "node:child_process";
import { writeFileSync } from "node:fs";
import { mkdir, readFile, rmdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { EngineClient } from "../../../packages/cli/src/engine";
import { buildUpsertCommitGoal } from "../../../packages/cli/src/operations/mutation/contradictions";
import { escapeAtom } from "../../../packages/cli/src/prolog/codec";
import {
  CONSISTENCY_E2E_TEST_DOCUMENT,
  CONSISTENCY_E2E_TEST_PATH,
  CONSISTENCY_E2E_TEST_SOURCE,
  CONSISTENCY_IDS,
  CONSISTENCY_PROSE,
  CONSISTENCY_SUBJECT_DOCUMENT,
  GOVERNED_AREA_DOCUMENTS,
  GOVERNED_FIXTURE_SOURCE,
  GOVERNED_FIXTURE_TEST,
  type LedgerProposition,
  PRECONDITION_DOCUMENTS,
  PRECONDITION_IDS,
  PRECONDITION_INTENT,
  PRECONDITION_ORIGIN,
  consistencyValueFact,
  ledgerRequirement,
} from "./fixture-seeds";

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
  readonly maxAttempts?: number;
}

const DEFAULT_IMPORT_RETRY_DELAY_MS = 2_000;
const DEFAULT_IMPORT_RETRY_ATTEMPTS = 3;
const FIXTURE_SOURCE_PATH = "src/fixture.ts";
const FIXTURE_TEST_PATH = "tests/fixture-family.test.ts";
const FIXTURE_TEST_TIMEOUT_MS = 10_000;

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export function fixtureCliEnv(workspaceTarget: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    KIBI_BRANCH: FIXTURE_BRANCH,
    KIBI_WORKSPACE: workspaceTarget,
    KIBI_PROJECT_ROOT: workspaceTarget,
    KIBI_ROOT: workspaceTarget,
  };
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
  const maxAttempts =
    options.retryOnInteractivePrologTimeout === true
      ? (options.maxAttempts ?? DEFAULT_IMPORT_RETRY_ATTEMPTS)
      : 1;
  let result = await command();
  let attempts = 1;
  while (
    !result.ok &&
    attempts < maxAttempts &&
    isInteractivePrologEntityTimeout(result)
  ) {
    await Bun.sleep(options.retryDelayMs ?? DEFAULT_IMPORT_RETRY_DELAY_MS);
    result = await command();
    attempts += 1;
  }
  if (!result.ok) {
    const attemptSuffix = attempts > 1 ? ` after ${attempts} attempts` : "";
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
  await stopFixtureEngine(workspaceTarget);
  const child = Bun.spawn(
    [process.execPath, join(cliRoot, "dist", "cli.js"), ...args],
    {
      cwd: workspaceTarget,
      env: fixtureCliEnv(workspaceTarget),
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

async function runSeededFixtureTest(
  workspaceTarget: string,
  testPath: string = FIXTURE_TEST_PATH,
): Promise<void> {
  const child = Bun.spawn(
    [
      process.execPath,
      "test",
      "--timeout",
      String(FIXTURE_TEST_TIMEOUT_MS),
      testPath,
    ],
    {
      cwd: workspaceTarget,
      env: process.env,
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, FIXTURE_TEST_TIMEOUT_MS);
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  clearTimeout(timeout);
  if (timedOut || exitCode !== 0) {
    const output = [stderr.trim(), stdout.trim()]
      .filter((value) => value.length > 0)
      .join("\n")
      .slice(0, 2_000);
    throw new FixtureSetupError(
      `seeded fixture test failed${timedOut ? " (timed out)" : ` (exit=${exitCode})`}: ${output || "no test output"}`,
    );
  }
}

/**
 * Evaluator-owned staging for tasks declaring initialState.kb "fresh": a
 * committed, seeded, fully-synced KB (probe-verified: kb_status reports
 * dirty=false, syncState=fresh, verification snapshot available) plus one
 * source-linked symbol pair and its executable coverage test so discovery/query
 * signals have real content without introducing a seeded validation failure.
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
  const fixtureSourcePath = join(workspaceTarget, FIXTURE_SOURCE_PATH);
  let fixtureSource: string;
  try {
    fixtureSource = await readFile(fixtureSourcePath, "utf8");
  } catch (error) {
    throw new FixtureSetupError(
      `seeded fresh fixture requires ${FIXTURE_SOURCE_PATH}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!/export\s+const\s+fixtureFamily\s*=/.test(fixtureSource)) {
    throw new FixtureSetupError(
      `seeded fresh fixture requires ${FIXTURE_SOURCE_PATH} to export fixtureFamily`,
    );
  }
  await mkdir(join(workspaceTarget, "tests"), {
    recursive: true,
    mode: 0o700,
  });
  await writeFile(
    join(workspaceTarget, FIXTURE_TEST_PATH),
    [
      'import { expect, test } from "bun:test";',
      'import { fixtureFamily } from "../src/fixture";',
      "",
      'test("public fixture exports its family string", () => {',
      '  expect(typeof fixtureFamily).toBe("string");',
      "  expect(fixtureFamily.length).toBeGreaterThan(0);",
      "});",
      "",
    ].join("\n"),
    "utf8",
  );
  await runSeededFixtureTest(workspaceTarget);
  await mkdir(join(workspaceTarget, ".kb", "requirements"), {
    recursive: true,
    mode: 0o700,
  });
  await mkdir(join(workspaceTarget, ".kb", "tests"), {
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
    join(workspaceTarget, ".kb", "tests", "TEST-SETUP-FIXTURE.md"),
    [
      "---",
      "id: TEST-SETUP-FIXTURE",
      "title: Seeded fixture symbol coverage",
      "status: passing",
      "text_ref: tests/fixture-family.test.ts",
      "links:",
      "  - type: validates",
      "    target: REQ-SETUP-BASE",
      "verification_scope: unit",
      "---",
      "",
      "# Seeded fixture symbol coverage",
      "",
      "This evaluator-owned test keeps the seeded production symbol covered.",
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
      "      - type: covered_by",
      "        target: TEST-SETUP-FIXTURE",
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
  await expectOk(["check"], "seeded fixture validation");
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

/** A deliberately incomplete layout for the read-only operator-repair task. */
// implements REQ-skillopt-codex-optimization
export async function setupSeededPartialKb(
  workspaceTarget: string,
  cliRoot: string,
): Promise<void> {
  await setupSeededStaleKb(workspaceTarget, cliRoot);
  // This lane is empty: remove infrastructure, never authored fixture knowledge.
  await rmdir(join(workspaceTarget, ".kb", "flags"));
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

async function writeDocuments(
  workspaceTarget: string,
  documents: Readonly<Record<string, string>>,
): Promise<void> {
  for (const [relativePath, content] of Object.entries(documents)) {
    const target = join(workspaceTarget, relativePath);
    await mkdir(join(target, ".."), { recursive: true, mode: 0o700 });
    await writeFile(target, content, "utf8");
  }
}

/** Commit everything, then import it; sync reads the Git source boundary. */
async function commitAndSync(
  workspaceTarget: string,
  cliRoot: string,
): Promise<void> {
  await stageCommitAll(workspaceTarget);
  await runCliWithRetry(
    () => runStagedCli(cliRoot, workspaceTarget, ["sync"]),
    "import sync",
    { retryOnInteractivePrologTimeout: true },
  );
}

async function initSeededRepository(
  workspaceTarget: string,
  cliRoot: string,
): Promise<void> {
  await initFixtureRepository(workspaceTarget);
  await runCliWithRetry(
    () => runStagedCli(cliRoot, workspaceTarget, ["init"]),
    "kibi init",
  );
}

async function validateSeed(
  workspaceTarget: string,
  cliRoot: string,
  label: string,
): Promise<void> {
  await runCliWithRetry(
    () => runStagedCli(cliRoot, workspaceTarget, ["check"]),
    `${label} validation`,
  );
}

function jsonRecord(text: string, label: string): Record<string, unknown> {
  // Routes print one JSON envelope; a trailing human error line may follow.
  const line = text
    .split("\n")
    .find((candidate) => candidate.trim().startsWith("{"));
  try {
    const parsed: unknown = JSON.parse(line ?? text);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed))
      return parsed as Record<string, unknown>;
  } catch {
    // Reported below.
  }
  throw new FixtureSetupError(`${label} returned no JSON envelope`);
}

function recordField(
  value: unknown,
  key: string,
  label: string,
): Record<string, unknown> {
  const field =
    value !== null && typeof value === "object"
      ? (value as Record<string, unknown>)[key]
      : undefined;
  if (field === null || typeof field !== "object" || Array.isArray(field))
    throw new FixtureSetupError(`${label} is missing ${key}`);
  return field as Record<string, unknown>;
}

async function jsonRoute(
  cliRoot: string,
  workspaceTarget: string,
  route: string,
  input: unknown,
): Promise<Record<string, unknown>> {
  const stdout = await runCliWithRetry(
    () =>
      runStagedCli(
        cliRoot,
        workspaceTarget,
        [route, "--input", "-"],
        `${JSON.stringify(input)}\n`,
      ),
    route,
  );
  return jsonRecord(stdout, route);
}

/** The semantic advisor's clause ledger for prose (computed live). */
// implements REQ-skillopt-codex-optimization
export async function semanticLedger(
  cliRoot: string,
  workspaceTarget: string,
  prose: string,
): Promise<{
  contract: { version: string; source_field: string; source_hash: string };
  propositions: readonly LedgerProposition[];
}> {
  const envelope = await jsonRoute(
    cliRoot,
    workspaceTarget,
    "semantic-advisor",
    { text: prose },
  );
  const receipt = recordField(
    recordField(envelope, "data", "semantic-advisor"),
    "receipt",
    "semantic-advisor",
  );
  const contract = recordField(
    receipt,
    "inventory_contract",
    "advisor receipt",
  );
  const propositions = receipt.propositions;
  if (
    typeof contract.version !== "string" ||
    typeof contract.source_field !== "string" ||
    typeof contract.source_hash !== "string" ||
    !Array.isArray(propositions)
  )
    throw new FixtureSetupError("semantic-advisor receipt is incomplete");
  return {
    contract: {
      version: contract.version,
      source_field: contract.source_field,
      source_hash: contract.source_hash,
    },
    propositions: propositions as LedgerProposition[],
  };
}

/**
 * Evaluator-owned staging for intent-consultation cases: a current
 * requirement that supersedes a closed v1, an ADR with the rationale, an
 * observation fact that contradicts the policy, a passing unit test, and the
 * production symbol in src/fixture.ts still implementing the superseded v1.
 * The KB is committed, synced and checked clean before the model starts.
 */
// implements REQ-skillopt-codex-optimization
export async function setupSeededGovernedAreaKb(
  workspaceTarget: string,
  cliRoot: string,
): Promise<void> {
  await initSeededRepository(workspaceTarget, cliRoot);
  await writeDocuments(workspaceTarget, {
    [FIXTURE_SOURCE_PATH]: GOVERNED_FIXTURE_SOURCE,
    [FIXTURE_TEST_PATH]: GOVERNED_FIXTURE_TEST,
    ...GOVERNED_AREA_DOCUMENTS,
  });
  await runSeededFixtureTest(workspaceTarget);
  await commitAndSync(workspaceTarget, cliRoot);
  await validateSeed(workspaceTarget, cliRoot, "governed-area fixture");
}

/**
 * Evaluator-owned staging for scenario-precondition cases. The base
 * requirement ("a client call may happen only when the call quota remaining
 * is positive") is compiled through compile-intent and applied with its
 * approved plan hash, so its forbid rule and clause ledger are production
 * output; its origin is then stamped as human-approved. A zero-quota
 * property fact and a scenario that expects rejection are seeded beside it.
 */
// implements REQ-skillopt-codex-optimization
export async function setupSeededPreconditionKb(
  workspaceTarget: string,
  cliRoot: string,
): Promise<void> {
  await initSeededRepository(workspaceTarget, cliRoot);
  await commitAndSync(workspaceTarget, cliRoot);
  const compiled = await jsonRoute(cliRoot, workspaceTarget, "compile-intent", {
    intent: PRECONDITION_INTENT,
    mode: "create",
    context:
      "Fixture base requirement for the precondition scenario; reason not stated.",
    requirementId: PRECONDITION_IDS.base,
  });
  const plan = recordField(compiled, "data", "compile-intent");
  if (plan.status !== "ready" || typeof plan.planHash !== "string")
    throw new FixtureSetupError(
      `precondition plan is not ready: ${String(plan.status)}`,
    );
  const applied = await jsonRoute(cliRoot, workspaceTarget, "apply-plan", {
    plan,
    approvedPlanHash: plan.planHash,
  });
  if (recordField(applied, "data", "apply-plan").outcome !== "applied")
    throw new FixtureSetupError("precondition plan was not applied");
  // Absorb the plan's pending-source receipts before editing its output.
  await commitAndSync(workspaceTarget, cliRoot);
  const requirementPath = join(
    workspaceTarget,
    ".kb",
    "requirements",
    `${PRECONDITION_IDS.base}.md`,
  );
  const requirement = await readFile(requirementPath, "utf8");
  if (!/^ {2}kind: agent$/m.test(requirement))
    throw new FixtureSetupError("compiled requirement has no agent origin");
  await writeFile(
    requirementPath,
    requirement.replace(/^ {2}kind: agent$/m, PRECONDITION_ORIGIN),
    "utf8",
  );
  await writeDocuments(workspaceTarget, PRECONDITION_DOCUMENTS);
  await commitAndSync(workspaceTarget, cliRoot);
  await validateSeed(workspaceTarget, cliRoot, "precondition fixture");
}

/**
 * Evaluator-owned staging for consistency-report cases: one requirement with
 * a modeled numeric clause and an ontology-gap review clause (contradiction
 * stage `analysis_incomplete`) validated by a passing e2e test entity without
 * a proof receipt, and two fully modeled, compatible requirements on the same
 * property (`>= 0` and `<= 1000`). Clause ledgers come from the live advisor.
 */
// implements REQ-skillopt-codex-optimization
export async function setupSeededConsistencyKb(
  workspaceTarget: string,
  cliRoot: string,
): Promise<void> {
  await initSeededRepository(workspaceTarget, cliRoot);
  const incomplete = await semanticLedger(
    cliRoot,
    workspaceTarget,
    CONSISTENCY_PROSE.incomplete,
  );
  const [numeric, review] = incomplete.propositions;
  if (
    incomplete.propositions.length !== 2 ||
    numeric === undefined ||
    review === undefined ||
    review.status !== "ontology_gap"
  )
    throw new FixtureSetupError(
      "consistency fixture expects one numeric clause and one ontology gap",
    );
  const documents: Record<string, string> = {
    [`.kb/facts/${CONSISTENCY_IDS.subject}.md`]: CONSISTENCY_SUBJECT_DOCUMENT,
    [`.kb/facts/${CONSISTENCY_IDS.positiveFact}.md`]: consistencyValueFact({
      id: CONSISTENCY_IDS.positiveFact,
      title: "Remaining call quota above zero",
      operator: "gt",
      value: 0,
      claimKey: numeric.claim_key,
      claimText: numeric.claim_text,
    }),
    [`.kb/requirements/${CONSISTENCY_IDS.incomplete}.md`]: ledgerRequirement({
      id: CONSISTENCY_IDS.incomplete,
      title: "Calls need remaining quota and quota resets need review",
      prose: CONSISTENCY_PROSE.incomplete,
      contract: incomplete.contract,
      propositions: [{ ...numeric, status: "modeled" }, review],
      links: [
        { type: "constrains", target: CONSISTENCY_IDS.subject },
        { type: "requires_property", target: CONSISTENCY_IDS.positiveFact },
      ],
    }),
    [CONSISTENCY_E2E_TEST_PATH]: CONSISTENCY_E2E_TEST_SOURCE,
    [`.kb/tests/${CONSISTENCY_IDS.e2eTest}.md`]: CONSISTENCY_E2E_TEST_DOCUMENT,
  };
  const modeled = [
    {
      id: CONSISTENCY_IDS.nonNegative,
      factId: CONSISTENCY_IDS.nonNegativeFact,
      title: "Remaining call quota is never negative",
      prose: CONSISTENCY_PROSE.nonNegative,
      operator: "gte",
      value: 0,
    },
    {
      id: CONSISTENCY_IDS.cap,
      factId: CONSISTENCY_IDS.capFact,
      title: "Remaining call quota is at most 1000",
      prose: CONSISTENCY_PROSE.cap,
      operator: "lte",
      value: 1000,
    },
  ] as const;
  for (const spec of modeled) {
    const ledger = await semanticLedger(cliRoot, workspaceTarget, spec.prose);
    const [claim] = ledger.propositions;
    if (ledger.propositions.length !== 1 || claim === undefined)
      throw new FixtureSetupError(`${spec.id} expects exactly one clause`);
    documents[`.kb/facts/${spec.factId}.md`] = consistencyValueFact({
      id: spec.factId,
      title: spec.title,
      operator: spec.operator,
      value: spec.value,
      claimKey: claim.claim_key,
      claimText: claim.claim_text,
    });
    documents[`.kb/requirements/${spec.id}.md`] = ledgerRequirement({
      id: spec.id,
      title: spec.title,
      prose: spec.prose,
      contract: ledger.contract,
      propositions: [{ ...claim, status: "modeled" }],
      links: [
        { type: "constrains", target: CONSISTENCY_IDS.subject },
        { type: "requires_property", target: spec.factId },
      ],
    });
  }
  await writeDocuments(workspaceTarget, documents);
  await runSeededFixtureTest(workspaceTarget, CONSISTENCY_E2E_TEST_PATH);
  await commitAndSync(workspaceTarget, cliRoot);
  await validateSeed(workspaceTarget, cliRoot, "consistency fixture");
}

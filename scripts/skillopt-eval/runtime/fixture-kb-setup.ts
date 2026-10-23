import { execFile } from "node:child_process";
import { writeFileSync } from "node:fs";
import { mkdir, readFile, rmdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { EngineClient } from "../../../packages/cli/src/engine";
import { buildUpsertCommitGoal } from "../../../packages/cli/src/operations/mutation/contradictions";
import { escapeAtom } from "../../../packages/cli/src/prolog/codec";
import { fixtureEntityIds } from "../fixtures/workspace";
import {
  CHARGEBACK_RULE_IR,
  CONSISTENCY_E2E_TEST_DOCUMENT,
  CONSISTENCY_E2E_TEST_PATH,
  CONSISTENCY_E2E_TEST_SOURCE,
  CONSISTENCY_IDS,
  CONSISTENCY_PROSE,
  CONSISTENCY_SUBJECT_DOCUMENT,
  GOVERNED_AREA_DOCUMENTS,
  GOVERNED_FIXTURE_SOURCE,
  GOVERNED_FIXTURE_TEST,
  JOINT_CONTRADICTION_CORE,
  JOINT_CONTRADICTION_IDS,
  JOINT_CONTRADICTION_PROSE,
  type LedgerProposition,
  PRECONDITION_DOCUMENTS,
  PRECONDITION_IDS,
  PRECONDITION_INTENT,
  PRECONDITION_ORIGIN,
  UNRESOLVED_RULE_CONTEXT,
  UNRESOLVED_RULE_IDS,
  UNRESOLVED_RULE_ORIGIN,
  UNRESOLVED_RULE_PROSE,
  consistencyValueFact,
  isSeededJointContradictionViolation,
  isSeededUnresolvedRuleViolation,
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

// implements REQ-skillopt-codex-optimization
export async function runStagedCli(
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

// implements REQ-skillopt-codex-optimization
export async function runSeededFixtureTest(
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
  options: Readonly<{
    /**
     * false seeds the production symbol without its covered_by link, so the
     * seed's only check violation is that symbol's missing coverage.
     */
    symbolCoverage?: boolean;
    /**
     * Further evaluator-owned authored documents (workspace-relative path to
     * content) committed and imported with the seed.
     */
    documents?: Readonly<Record<string, string>>;
  }> = {},
): Promise<void> {
  const symbolCoverage = options.symbolCoverage ?? true;
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
      "## Context",
      "",
      "This evaluator-owned requirement exists only so the seeded fixture knowledge base has one authored requirement that the fixture symbol and its test can link to.",
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
      "This evaluator-owned test keeps the seeded production symbol covered, so the fixture knowledge base starts with a requirement, a test and a symbol that agree with each other.",
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
      ...(symbolCoverage
        ? ["      - type: covered_by", "        target: TEST-SETUP-FIXTURE"]
        : []),
      "",
    ].join("\n"),
    "utf8",
  );
  await writeDeclaredPredicateSchemas(workspaceTarget);
  if (options.documents !== undefined)
    await writeDocuments(workspaceTarget, options.documents);
  // Sync discovers tracked source files. Commit the evaluator-owned seed before
  // importing it so the branch snapshot contains the two authored entities.
  await stageCommitAll(workspaceTarget);
  await runCliWithRetry(
    () => runStagedCli(cliRoot, workspaceTarget, ["sync"]),
    "import sync",
    { retryOnInteractivePrologTimeout: true },
  );
  if (symbolCoverage) {
    await expectOk(["check"], "seeded fixture validation");
    return;
  }
  await expectOnlyMissingSymbolCoverage(workspaceTarget, cliRoot);
}

const PREDICATE_CLAIM_PATH = "predicate-claim.json";
const SAFE_SCHEMA_ID = /^FACT-[A-Z0-9][A-Z0-9-]*$/;
const SAFE_SCHEMA_TOKEN = /^[a-z][a-z0-9_]*$/;

type DeclaredPredicateSchema = Readonly<{
  id: string;
  predicateName: string;
  argumentNames: readonly string[];
  argumentTypes: readonly string[];
}>;

function declaredPredicateSchemas(
  claim: unknown,
): readonly DeclaredPredicateSchema[] {
  const schemas =
    claim !== null && typeof claim === "object"
      ? (claim as { publicSchema?: { projectLocalSchemas?: unknown } })
          .publicSchema?.projectLocalSchemas
      : undefined;
  if (schemas === undefined) return [];
  if (!Array.isArray(schemas)) {
    throw new FixtureSetupError(
      `${PREDICATE_CLAIM_PATH} projectLocalSchemas must be a list`,
    );
  }
  return schemas.map((schema): DeclaredPredicateSchema => {
    const entry = schema as Partial<
      Record<keyof DeclaredPredicateSchema, unknown>
    >;
    const names = entry.argumentNames;
    const types = entry.argumentTypes;
    const tokens = (value: unknown): value is string[] =>
      Array.isArray(value) &&
      value.length > 0 &&
      value.every(
        (token) => typeof token === "string" && SAFE_SCHEMA_TOKEN.test(token),
      );
    if (
      typeof entry.id !== "string" ||
      !SAFE_SCHEMA_ID.test(entry.id) ||
      typeof entry.predicateName !== "string" ||
      !SAFE_SCHEMA_TOKEN.test(entry.predicateName) ||
      !tokens(names) ||
      !tokens(types) ||
      names.length !== types.length
    ) {
      throw new FixtureSetupError(
        `${PREDICATE_CLAIM_PATH} declares a malformed project-local schema`,
      );
    }
    return {
      id: entry.id,
      predicateName: entry.predicateName,
      argumentNames: names,
      argumentTypes: types,
    };
  });
}

/**
 * Predicate-modeling tasks publish their approved project-local schemas in
 * predicate-claim.json. The project those tasks describe already holds those
 * schemas, so the seed authors each one as a predicate_schema fact with the
 * declared name, arguments and types.
 */
// implements REQ-skillopt-predicate-first-requirements
export async function writeDeclaredPredicateSchemas(
  workspaceTarget: string,
): Promise<readonly string[]> {
  let claimText: string;
  try {
    claimText = await readFile(
      join(workspaceTarget, PREDICATE_CLAIM_PATH),
      "utf8",
    );
  } catch {
    return [];
  }
  const schemas = declaredPredicateSchemas(JSON.parse(claimText));
  if (schemas.length === 0) return [];
  await mkdir(join(workspaceTarget, ".kb", "facts"), {
    recursive: true,
    mode: 0o700,
  });
  for (const schema of schemas) {
    await writeFile(
      join(workspaceTarget, ".kb", "facts", `${schema.id}.md`),
      [
        "---",
        `id: ${schema.id}`,
        `title: ${schema.predicateName} predicate schema`,
        "status: active",
        "fact_kind: predicate_schema",
        `predicate_name: ${schema.predicateName}`,
        `predicate_arity: ${schema.argumentNames.length}`,
        `argument_names: [${schema.argumentNames.join(", ")}]`,
        `argument_types: [${schema.argumentTypes.join(", ")}]`,
        "---",
        "",
        `Approved project-local predicate schema declared by the task as ${schema.predicateName}(${schema.argumentNames.join(", ")}).`,
        "",
      ].join("\n"),
      "utf8",
    );
  }
  return schemas.map((schema) => schema.id);
}

const SEEDED_SYMBOL_ID = "SYM-SETUP-FIXTURE";

async function expectOnlyMissingSymbolCoverage(
  workspaceTarget: string,
  cliRoot: string,
): Promise<void> {
  const result = await runStagedCli(cliRoot, workspaceTarget, [
    "check",
    "--format",
    "json",
  ]);
  const violations = recordField(
    jsonRecord(result.stdout, "uncovered fixture validation"),
    "structuredContent",
    "uncovered fixture validation",
  ).violations;
  const only =
    Array.isArray(violations) && violations.length === 1
      ? (violations[0] as Record<string, unknown>)
      : undefined;
  if (only?.rule !== "symbol-coverage" || only.entityId !== SEEDED_SYMBOL_ID) {
    throw new FixtureSetupError(
      `uncovered fixture must report only symbol-coverage for ${SEEDED_SYMBOL_ID}: ${result.stdout.slice(0, 300)}`,
    );
  }
}

/**
 * Seeded fixture whose production symbol implements the requirement but has no
 * covered_by link to the seeded executable test, so linking coverage is work
 * the agent must do rather than a fact the seed already states.
 */
// implements REQ-skillopt-codex-optimization
export async function setupSeededUncoveredKb(
  workspaceTarget: string,
  cliRoot: string,
): Promise<void> {
  await setupSeededFreshKb(workspaceTarget, cliRoot, { symbolCoverage: false });
}

/**
 * The requirement and executable test a safe typed mutation task names as
 * existing endpoints in mutation-request.json, authored in the configured
 * Kibi lanes. The public workspace also describes them under documentation/,
 * but those legacy paths are outside the configured Kibi paths and only a CLI
 * migration (which the MCP-only task forbids) imports them: without this seed
 * every requested relationship is refused because its target does not exist.
 */
// implements REQ-skillopt-logical-evidence-fidelity
export function safeMutationEndpointDocuments(
  taskId: string,
): Readonly<Record<string, string>> {
  const ids = fixtureEntityIds(taskId);
  return {
    [`.kb/requirements/${ids.requirement}.md`]: [
      "---",
      `id: ${ids.requirement}`,
      "title: safe-mutation-direction fixture requirement",
      "status: open",
      "type: req",
      "---",
      "",
      "## Context",
      "",
      "This evaluator-owned requirement is the existing endpoint the safe mutation task asks the fixture production symbol to implement.",
      "",
    ].join("\n"),
    [`.kb/tests/${ids.test}.md`]: [
      "---",
      `id: ${ids.test}`,
      "title: Fixture production symbol coverage",
      "status: passing",
      `text_ref: ${FIXTURE_TEST_PATH}`,
      "links:",
      "  - type: validates",
      `    target: ${ids.requirement}`,
      "verification_scope: integration",
      "---",
      "",
      "# Fixture production symbol coverage",
      "",
      "This supplied test is the coverage evidence for the fixture production symbol.",
      "",
    ].join("\n"),
  };
}

/**
 * Seeded fixture for the safe typed mutation objective: the seeded-fresh
 * baseline plus the two endpoints mutation-request.json names, so the
 * requested links are writable through MCP. The fixture production symbol
 * itself is not seeded: creating it and linking it is the agent's work.
 */
// implements REQ-skillopt-logical-evidence-fidelity
export async function setupSeededSafeMutationKb(
  workspaceTarget: string,
  cliRoot: string,
  taskId: string,
): Promise<void> {
  await setupSeededFreshKb(workspaceTarget, cliRoot, {
    documents: safeMutationEndpointDocuments(taskId),
  });
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
 * Evaluator-owned staging for objectives whose declared dirty worktree must be
 * observable: the seeded-fresh baseline plus an uncommitted edit to the
 * tracked, KB-linked source (probe-verified: kb_status reports dirty=true,
 * syncState=stale naming the linked symbol, and a dirty verification
 * snapshot), matching the edit described by changes/uncommitted.patch.
 */
// implements REQ-skillopt-codex-optimization
export async function setupSeededDirtyKb(
  workspaceTarget: string,
  cliRoot: string,
): Promise<void> {
  await setupSeededFreshKb(workspaceTarget, cliRoot);
  const sourcePath = join(workspaceTarget, FIXTURE_SOURCE_PATH);
  const original = await readFile(sourcePath, "utf8");
  await writeFile(
    sourcePath,
    `${original}export const fixtureDirtyState = "dirty fixture state";\n`,
    "utf8",
  );
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

// implements REQ-skillopt-codex-optimization
export async function writeDocuments(
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
// implements REQ-skillopt-codex-optimization
export async function commitAndSync(
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

// implements REQ-skillopt-codex-optimization
export async function initSeededRepository(
  workspaceTarget: string,
  cliRoot: string,
): Promise<void> {
  await initFixtureRepository(workspaceTarget);
  await runCliWithRetry(
    () => runStagedCli(cliRoot, workspaceTarget, ["init"]),
    "kibi init",
  );
}

// implements REQ-skillopt-codex-optimization
export async function validateSeed(
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

// implements REQ-skillopt-codex-optimization
export async function jsonRoute(
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
      "Evaluator-owned base requirement for the precondition scenario cases: a success scenario that assumes zero remaining quota must be reported as infeasible.",
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

async function stampHumanOrigin(
  workspaceTarget: string,
  requirementId: string,
  origin: string,
): Promise<void> {
  const path = join(
    workspaceTarget,
    ".kb",
    "requirements",
    `${requirementId}.md`,
  );
  const requirement = await readFile(path, "utf8");
  if (!/^ {2}kind: agent$/m.test(requirement))
    throw new FixtureSetupError(`${requirementId} has no agent origin`);
  await writeFile(
    path,
    requirement.replace(/^ {2}kind: agent$/m, origin),
    "utf8",
  );
}

/**
 * Evaluator-owned staging for the unresolved consistency case: two current
 * refund requirements whose typed rules share the head `refund_issued(order)`
 * with opposing modalities. The forbid-unless rule is compiled from prose
 * through compile-intent and applied with its plan hash; the permit rule is
 * modeled through model-requirement from its typed IR and written with
 * upsert, as an agent would. The checker can neither prove nor exclude an
 * order that satisfies both bodies, so `kb_check` reports exactly one
 * `unresolved` rule conflict and nothing else.
 */
// implements REQ-skillopt-codex-optimization
export async function setupSeededUnresolvedRuleKb(
  workspaceTarget: string,
  cliRoot: string,
): Promise<void> {
  await initSeededRepository(workspaceTarget, cliRoot);
  await commitAndSync(workspaceTarget, cliRoot);
  const compiled = await jsonRoute(cliRoot, workspaceTarget, "compile-intent", {
    intent: UNRESOLVED_RULE_PROSE.settledAmount,
    mode: "create",
    context: UNRESOLVED_RULE_CONTEXT,
    requirementId: UNRESOLVED_RULE_IDS.settledAmount,
  });
  const plan = recordField(compiled, "data", "compile-intent");
  if (plan.status !== "ready" || typeof plan.planHash !== "string")
    throw new FixtureSetupError(
      `settled-amount plan is not ready: ${String(plan.status)}`,
    );
  const applied = await jsonRoute(cliRoot, workspaceTarget, "apply-plan", {
    plan,
    approvedPlanHash: plan.planHash,
  });
  if (recordField(applied, "data", "apply-plan").outcome !== "applied")
    throw new FixtureSetupError("settled-amount plan was not applied");
  await commitAndSync(workspaceTarget, cliRoot);
  await stampHumanOrigin(
    workspaceTarget,
    UNRESOLVED_RULE_IDS.settledAmount,
    UNRESOLVED_RULE_ORIGIN,
  );
  await commitAndSync(workspaceTarget, cliRoot);

  const [claim] = (
    await semanticLedger(
      cliRoot,
      workspaceTarget,
      UNRESOLVED_RULE_PROSE.chargeback,
    )
  ).propositions;
  if (claim === undefined)
    throw new FixtureSetupError("chargeback prose has no clause");
  const modeled = recordField(
    await jsonRoute(cliRoot, workspaceTarget, "model-requirement", {
      text: UNRESOLVED_RULE_PROSE.chargeback,
      logic: CHARGEBACK_RULE_IR,
      claimKey: claim.claim_key,
      claimText: claim.claim_text,
      requirementId: UNRESOLVED_RULE_IDS.chargeback,
    }),
    "data",
    "model-requirement",
  );
  const steps = Array.isArray(modeled.applyPlan) ? modeled.applyPlan : [];
  const ids = steps.map((step) =>
    step !== null && typeof step === "object"
      ? (step as Record<string, unknown>).id
      : undefined,
  );
  if (
    JSON.stringify(ids) !==
    JSON.stringify([
      UNRESOLVED_RULE_IDS.ruleSchema,
      UNRESOLVED_RULE_IDS.chargebackRule,
      UNRESOLVED_RULE_IDS.chargeback,
    ])
  )
    throw new FixtureSetupError(
      `chargeback plan has unexpected steps: ${JSON.stringify(ids)}`,
    );
  for (const step of steps as Record<string, unknown>[]) {
    const payload =
      step.type === "req"
        ? {
            ...step,
            properties: {
              ...(step.properties as Record<string, unknown>),
              origin: {
                kind: "human",
                ref: "documentation/requirements/fixture.md",
                approved_by: "Payments owner",
              },
            },
            document: {
              path: `.kb/requirements/${UNRESOLVED_RULE_IDS.chargeback}.md`,
              body: `${UNRESOLVED_RULE_PROSE.chargeback}\n\n## Context\n\n${UNRESOLVED_RULE_CONTEXT}\n`,
            },
          }
        : step;
    await runCliWithRetry(
      () =>
        runStagedCli(
          cliRoot,
          workspaceTarget,
          ["upsert", "--input", "-"],
          JSON.stringify(payload),
        ),
      `${String(step.id)} upsert`,
    );
  }
  await commitAndSync(workspaceTarget, cliRoot);
  const result = await runStagedCli(cliRoot, workspaceTarget, [
    "check",
    "--format",
    "json",
  ]);
  const violations = recordField(
    jsonRecord(result.stdout, "unresolved fixture validation"),
    "structuredContent",
    "unresolved fixture validation",
  ).violations;
  if (
    !Array.isArray(violations) ||
    violations.length !== 1 ||
    !isSeededUnresolvedRuleViolation(violations[0])
  )
    throw new FixtureSetupError(
      `unresolved fixture must report only the unresolved refund rule pair: ${result.stdout.slice(0, 400)}`,
    );
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

/**
 * Evaluator-owned staging for the joint-contradiction consistency cases:
 * four bounds on `client.call_quota.remaining` (`>= 0`, `<= 1`, `!= 0`,
 * `!= 1`) that every pair satisfies but all four do not, so only
 * `kb-consistency` reports them, and a reset-window pair stated in hours and
 * in billing cycles, which `kb-consistency-unresolved` reports as
 * undecidable.
 */
// implements REQ-skillopt-codex-optimization
export async function setupSeededJointContradictionKb(
  workspaceTarget: string,
  cliRoot: string,
): Promise<void> {
  await initSeededRepository(workspaceTarget, cliRoot);
  const ids = JOINT_CONTRADICTION_IDS;
  const prose = JOINT_CONTRADICTION_PROSE;
  const bounds = [
    {
      id: ids.floor,
      factId: ids.floorFact,
      prose: prose.floor,
      title: "Remaining call quota is at least 0",
      operator: "gte",
      value: 0,
    },
    {
      id: ids.ceiling,
      factId: ids.ceilingFact,
      prose: prose.ceiling,
      title: "Remaining call quota is at most 1",
      operator: "lte",
      value: 1,
    },
    {
      id: ids.notEmpty,
      factId: ids.notEmptyFact,
      prose: prose.notEmpty,
      title: "Remaining call quota is not 0",
      operator: "neq",
      value: 0,
    },
    {
      id: ids.notSingle,
      factId: ids.notSingleFact,
      prose: prose.notSingle,
      title: "Remaining call quota is not 1",
      operator: "neq",
      value: 1,
    },
    {
      id: ids.windowMax,
      factId: ids.windowMaxFact,
      prose: prose.windowMax,
      title: "Reset window is at most 24 hours",
      operator: "lte",
      value: 24,
      property: "reset_window",
      unit: "hours",
    },
    {
      id: ids.windowMin,
      factId: ids.windowMinFact,
      prose: prose.windowMin,
      title: "Reset window is at least 2 billing cycles",
      operator: "gte",
      value: 2,
      property: "reset_window",
      unit: "billing_cycles",
    },
  ] as const;
  const documents: Record<string, string> = {
    [`.kb/facts/${CONSISTENCY_IDS.subject}.md`]: CONSISTENCY_SUBJECT_DOCUMENT,
  };
  for (const spec of bounds) {
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
      ...("property" in spec
        ? { property: spec.property, unit: spec.unit }
        : {}),
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
  await commitAndSync(workspaceTarget, cliRoot);
  const result = await runStagedCli(cliRoot, workspaceTarget, [
    "check",
    "--format",
    "json",
  ]);
  const content = recordField(
    jsonRecord(result.stdout, "joint contradiction fixture validation"),
    "structuredContent",
    "joint contradiction fixture validation",
  );
  const violations = content.violations;
  const unresolved = Array.isArray(content.qualityDiagnostics)
    ? content.qualityDiagnostics.filter(
        (entry) =>
          entry !== null &&
          typeof entry === "object" &&
          (entry as Record<string, unknown>).id ===
            "rule.kb-consistency-unresolved",
      )
    : [];
  if (
    !Array.isArray(violations) ||
    violations.length !== 1 ||
    !isSeededJointContradictionViolation(violations[0]) ||
    unresolved.length !== 1
  )
    throw new FixtureSetupError(
      `joint contradiction fixture must report only the ${JOINT_CONTRADICTION_CORE.join("/")} core and one unresolved reset-window pair: ${result.stdout.slice(0, 600)}`,
    );
}

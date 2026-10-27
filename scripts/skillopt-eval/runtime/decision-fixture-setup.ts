import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { FixtureSetupMode } from "../fixtures/case-contracts";
import {
  COMMENTED_FIXTURE_SOURCE,
  DECISION_DOCUMENTS,
  DECISION_FIXTURE_SOURCE,
  DECISION_FIXTURE_TEST,
  DECISION_SYMBOLS,
  IMPACT_POLICY,
  IMPACT_POLICY_PATH,
  INHERITED_SOURCE,
  INHERITED_SOURCE_PATH,
  LABEL_DOCUMENTS,
  LABEL_FIXTURE_SOURCE,
  LABEL_FIXTURE_TEST,
  LABEL_FIXTURE_TEST_PATH,
  MESSAGE_FIXTURE_SOURCE,
  RAISED_LIMIT_FIXTURE_SOURCE,
  RAISED_LIMIT_FIXTURE_TEST,
  RENAMED_FIXTURE_SOURCE,
  WHITESPACE_FIXTURE_SOURCE,
  WHITESPACE_FIXTURE_TEST,
} from "./decision-seeds";
import {
  FIXTURE_BRANCH,
  commitAndSync,
  initSeededRepository,
  runCliWithRetry,
  runSeededFixtureTest,
  runStagedCli,
  validateSeed,
  writeDocuments,
} from "./fixture-kb-setup";

const execFileAsync = promisify(execFile);

const FIXTURE_SOURCE_PATH = "src/fixture.ts";
const FIXTURE_TEST_PATH = "tests/fixture-family.test.ts";
const SIDE_BRANCH = "fixture-side";
const COORDINATE_CACHE_PATH = ".kb/symbol-coordinates.yaml";

/** Setup modes owned by the kibi-decisions and kibi-commit-review cases. */
// implements REQ-skillopt-codex-optimization
export const DECISION_SETUP_MODES = [
  "seeded_decision_kb",
  "seeded_unrecorded_change_kb",
  "seeded_staged_symbol_kb",
  "seeded_staged_coordinates_kb",
  "seeded_staged_refactor_kb",
  "seeded_impact_review_kb",
  "seeded_staged_conflict_kb",
  "seeded_merge_commit_kb",
] as const satisfies readonly FixtureSetupMode[];

// implements REQ-skillopt-codex-optimization
export type DecisionSetupMode = (typeof DECISION_SETUP_MODES)[number];

// implements REQ-skillopt-codex-optimization
export function isDecisionSetupMode(
  mode: string | undefined,
): mode is DecisionSetupMode {
  return (DECISION_SETUP_MODES as readonly string[]).includes(mode ?? "");
}

/** Evaluator-owned Git call; installed Kibi hooks never run during setup. */
async function git(
  workspaceTarget: string,
  args: readonly string[],
): Promise<void> {
  await execFileAsync("git", ["-c", "core.hooksPath=/dev/null", ...args], {
    cwd: workspaceTarget,
  });
}

async function refreshCoordinates(
  workspaceTarget: string,
  cliRoot: string,
): Promise<void> {
  await runCliWithRetry(
    () =>
      runStagedCli(cliRoot, workspaceTarget, [
        "sync",
        "--refresh-symbol-coordinates",
      ]),
    "coordinate refresh",
  );
}

const LABEL_MODES: ReadonlySet<DecisionSetupMode> = new Set([
  "seeded_staged_symbol_kb",
  "seeded_merge_commit_kb",
]);

/**
 * The committed base every mode starts from: the firm length rule, its
 * scenario, passing test and enforcing symbol, with the symbols manifest in
 * its canonical layout so the staged gate judges only the staged change. The
 * refreshed coordinates stay a gitignored local cache.
 */
async function setupDecisionBase(
  workspaceTarget: string,
  cliRoot: string,
  mode: DecisionSetupMode,
): Promise<void> {
  await initSeededRepository(workspaceTarget, cliRoot);
  await writeDocuments(workspaceTarget, {
    [FIXTURE_SOURCE_PATH]: DECISION_FIXTURE_SOURCE,
    [FIXTURE_TEST_PATH]: DECISION_FIXTURE_TEST,
    ...DECISION_DOCUMENTS,
    ".kb/symbols.yaml": DECISION_SYMBOLS,
    ...(LABEL_MODES.has(mode)
      ? { ...LABEL_DOCUMENTS, [LABEL_FIXTURE_TEST_PATH]: LABEL_FIXTURE_TEST }
      : {}),
    ...(mode === "seeded_impact_review_kb"
      ? { [IMPACT_POLICY_PATH]: IMPACT_POLICY }
      : {}),
  });
  await runSeededFixtureTest(workspaceTarget, FIXTURE_TEST_PATH);
  await commitAndSync(workspaceTarget, cliRoot);
  await refreshCoordinates(workspaceTarget, cliRoot);
  await commitAndSync(workspaceTarget, cliRoot);
  await validateSeed(workspaceTarget, cliRoot, `${mode} fixture`);
}

async function stage(
  workspaceTarget: string,
  documents: Readonly<Record<string, string>>,
): Promise<void> {
  await writeDocuments(workspaceTarget, documents);
  await git(workspaceTarget, ["add", "--", ...Object.keys(documents)]);
}

/**
 * Evaluator-owned staging for the decision and commit-review cases. Every
 * mode commits the same firm rule; the commit-review modes then leave one
 * staged change for the Kibi gate to judge, the unrecorded-change mode an
 * uncommitted edit the session made without recording it.
 */
// implements REQ-skillopt-codex-optimization
export async function setupDecisionFixture(
  workspaceTarget: string,
  cliRoot: string,
  mode: DecisionSetupMode,
): Promise<void> {
  await setupDecisionBase(workspaceTarget, cliRoot, mode);
  switch (mode) {
    case "seeded_decision_kb":
      return;
    case "seeded_unrecorded_change_kb":
      await writeDocuments(workspaceTarget, {
        [FIXTURE_SOURCE_PATH]: WHITESPACE_FIXTURE_SOURCE,
        [FIXTURE_TEST_PATH]: WHITESPACE_FIXTURE_TEST,
      });
      return;
    case "seeded_staged_symbol_kb":
      await stage(workspaceTarget, {
        [FIXTURE_SOURCE_PATH]: LABEL_FIXTURE_SOURCE,
      });
      return;
    case "seeded_staged_coordinates_kb":
    case "seeded_staged_refactor_kb":
      // The person refreshed and force-staged the gitignored coordinate
      // cache out of habit; the generated-manifest gate rejects it.
      await stage(workspaceTarget, {
        [FIXTURE_SOURCE_PATH]:
          mode === "seeded_staged_coordinates_kb"
            ? COMMENTED_FIXTURE_SOURCE
            : RENAMED_FIXTURE_SOURCE,
      });
      await refreshCoordinates(workspaceTarget, cliRoot);
      await git(workspaceTarget, ["add", "-f", "--", COORDINATE_CACHE_PATH]);
      return;
    case "seeded_impact_review_kb":
      // Synced after staging so the only gate failure left is the missing
      // review record.
      await stage(workspaceTarget, {
        [FIXTURE_SOURCE_PATH]: MESSAGE_FIXTURE_SOURCE,
      });
      await refreshCoordinates(workspaceTarget, cliRoot);
      return;
    case "seeded_staged_conflict_kb":
      await stage(workspaceTarget, {
        [FIXTURE_SOURCE_PATH]: RAISED_LIMIT_FIXTURE_SOURCE,
        [FIXTURE_TEST_PATH]: RAISED_LIMIT_FIXTURE_TEST,
      });
      return;
    case "seeded_merge_commit_kb":
      await git(workspaceTarget, ["checkout", "-q", "-b", SIDE_BRANCH]);
      await writeDocuments(workspaceTarget, {
        [INHERITED_SOURCE_PATH]: INHERITED_SOURCE,
      });
      await git(workspaceTarget, ["add", "-A"]);
      await git(workspaceTarget, [
        "commit",
        "-q",
        "--no-verify",
        "-m",
        "add inherited helper",
      ]);
      await git(workspaceTarget, ["checkout", "-q", FIXTURE_BRANCH]);
      await writeDocuments(workspaceTarget, {
        "README.md": "# Fixture\n",
      });
      await commitAndSync(workspaceTarget, cliRoot);
      await git(workspaceTarget, [
        "merge",
        "-q",
        "--no-commit",
        "--no-ff",
        SIDE_BRANCH,
      ]);
      await stage(workspaceTarget, {
        [FIXTURE_SOURCE_PATH]: LABEL_FIXTURE_SOURCE,
      });
      return;
  }
}

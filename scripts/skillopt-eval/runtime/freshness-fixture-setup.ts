/**
 * Evaluator-owned fixtures for the kibi-freshness held-out cases whose premise
 * is a particular branch-store or worktree state. Each starts from a seeded
 * KB and then damages, renames or dirties only what its prompt describes,
 * after stopping the fixture engine, so the agent's first status call is
 * what reports it.
 */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  setupSeededFreshKb,
  setupSeededStaleKb,
  stopFixtureEngine,
} from "./fixture-kb-setup";
import { SKILLOPT_EVALUATION_BRANCH } from "./permissions";
import { setupTraceabilityFixture } from "./traceability-fixture-setup";

const execFileAsync = promisify(execFile);

export const FRESHNESS_SETUP_MODES = [
  "seeded_legacy_branch_store_kb",
  "seeded_unreadable_legacy_store_kb",
  "seeded_unreadable_branch_store_kb",
  "seeded_missing_branch_store_kb",
  "seeded_dirty_editor_config_kb",
  "seeded_destructive_plan_kb",
] as const;

export type FreshnessSetupMode = (typeof FRESHNESS_SETUP_MODES)[number];

export function isFreshnessSetupMode(mode: string): mode is FreshnessSetupMode {
  return (FRESHNESS_SETUP_MODES as readonly string[]).includes(mode);
}

/** The editor configuration the dirty-editor case leaves modified. */
export const EDITOR_CONFIG_PATH = ".vscode/settings.json";

/** Kibi keeps a branch's store at the SHA-256 of the exact branch name. */
function hashedStore(workspace: string): string {
  return join(
    workspace,
    ".kb",
    "branches",
    createHash("sha256").update(SKILLOPT_EVALUATION_BRANCH).digest("hex"),
  );
}

/** Where stores were kept before they were keyed by hash. */
function literalStore(workspace: string): string {
  return join(workspace, ".kb", "branches", SKILLOPT_EVALUATION_BRANCH);
}

async function moveToLiteralStore(workspace: string): Promise<void> {
  await stopFixtureEngine(workspace);
  await rename(hashedStore(workspace), literalStore(workspace));
}

export async function setupFreshnessFixture(
  workspace: string,
  cliRoot: string,
  mode: FreshnessSetupMode,
): Promise<void> {
  switch (mode) {
    case "seeded_legacy_branch_store_kb":
      // A store written before branch stores were hashed is still attached
      // under the literal branch name; the authored sources are also stale.
      await setupSeededStaleKb(workspace, cliRoot);
      await moveToLiteralStore(workspace);
      return;
    case "seeded_unreadable_legacy_store_kb":
      // The literal store lost its generation pointer, so validating the
      // legacy migration fails and only recovery can attach a store.
      await setupSeededStaleKb(workspace, cliRoot);
      await moveToLiteralStore(workspace);
      await rm(join(literalStore(workspace), "CURRENT"), { force: true });
      return;
    case "seeded_unreadable_branch_store_kb":
      await setupSeededStaleKb(workspace, cliRoot);
      await stopFixtureEngine(workspace);
      await writeFile(
        join(hashedStore(workspace), "CURRENT"),
        "not a generation pointer\n",
        "utf8",
      );
      return;
    case "seeded_missing_branch_store_kb":
      await setupSeededStaleKb(workspace, cliRoot);
      await stopFixtureEngine(workspace);
      await rm(hashedStore(workspace), { recursive: true, force: true });
      return;
    case "seeded_destructive_plan_kb": {
      // A symbol's source file was deleted (reconciling it would delete the
      // symbol, a review action), and the legacy requirement gained the
      // context its layout migration needs; both are committed, not synced.
      await setupTraceabilityFixture(
        workspace,
        cliRoot,
        "seeded_moved_symbol_kb",
      );
      const legacy = join(workspace, "documentation/requirements/fixture.md");
      const text = await readFile(legacy, "utf8");
      if (text.startsWith("---\n") && !text.includes("## Context"))
        await writeFile(
          legacy,
          `${text}\n## Context\n\nSeeded by the evaluator as the project's legacy requirement; it carries no product rationale.\n`,
          "utf8",
        );
      await execFileAsync("git", ["add", "-A"], { cwd: workspace });
      await execFileAsync(
        "git",
        [
          "commit",
          "-q",
          "--no-verify",
          "-m",
          "Give the legacy requirement its context",
        ],
        { cwd: workspace },
      );
      return;
    }
    case "seeded_dirty_editor_config_kb":
      // A tracked editor configuration is edited and left uncommitted.
      await mkdir(join(workspace, ".vscode"), { recursive: true });
      await writeFile(
        join(workspace, EDITOR_CONFIG_PATH),
        `${JSON.stringify({ "editor.formatOnSave": true }, null, 2)}\n`,
        "utf8",
      );
      await setupSeededFreshKb(workspace, cliRoot);
      await writeFile(
        join(workspace, EDITOR_CONFIG_PATH),
        `${JSON.stringify({ "editor.formatOnSave": false }, null, 2)}\n`,
        "utf8",
      );
      return;
  }
}

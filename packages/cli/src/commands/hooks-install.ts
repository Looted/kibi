/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { resolveGitRepository } from "../utils/git-repository-context.js";
import { detectHookManager } from "./hook-managers.js";
import {
  installGitHooks,
  isRepositoryManagedHooksDir,
} from "./init-helpers.js";
import { serializeJson } from "./setup-choices.js";

/**
 * The package.json `prepare` command that installs Kibi's git hooks on every
 * dependency install, so a fresh clone gets them without anyone running
 * `kibi init`. Git never clones `.git/hooks`.
 *
 * It is a node one-liner rather than `kibi hooks install`: a production or
 * Docker install (`npm ci --omit=dev`) still runs `prepare` but has no kibi
 * binary, and a bare command would fail that install. `|| true` is not an
 * option either, because Windows runs npm scripts through cmd.exe.
 */
// implements REQ-kibi-fresh-clone-setup
export const KIBI_PREPARE_COMMAND =
  "node -e \"let b;try{b=require.resolve('kibi-cli/bin/kibi')}catch{process.exit(0)}require('child_process').spawnSync(process.execPath,[b,'hooks','install','--quiet'],{stdio:'inherit'})\"";

/** Recognizes Kibi's prepare step in any form a user may have written. */
const KIBI_PREPARE_PATTERN = /\bkibi\s+hooks\s+install\b|'hooks',\s*'install'/;

// implements REQ-kibi-fresh-clone-setup
export type PrepareScriptResult =
  | "added"
  | "appended"
  | "present"
  | "removed"
  | "absent"
  | "no-package-json"
  | "unreadable-package-json";

function splitSteps(script: string): string[] {
  return script
    .split("&&")
    .map((step) => step.trim())
    .filter((step) => step.length > 0);
}

/**
 * Adds (enabled) or removes (disabled) Kibi's step of the root package.json
 * `prepare` script. A repository without a root package.json is left alone:
 * Kibi never creates one, and its hooks then come from `kibi init`.
 */
// implements REQ-kibi-fresh-clone-setup
export function syncPrepareScript(
  worktreeRoot: string,
  enabled: boolean,
): PrepareScriptResult {
  const packagePath = path.join(worktreeRoot, "package.json");
  if (!existsSync(packagePath)) return "no-package-json";
  let raw: string;
  let manifest: Record<string, unknown>;
  try {
    raw = readFileSync(packagePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
      return "unreadable-package-json";
    manifest = parsed as Record<string, unknown>;
  } catch {
    return "unreadable-package-json";
  }
  const scripts =
    typeof manifest.scripts === "object" &&
    manifest.scripts !== null &&
    !Array.isArray(manifest.scripts)
      ? (manifest.scripts as Record<string, unknown>)
      : {};
  const current = typeof scripts.prepare === "string" ? scripts.prepare : "";
  const hasKibi = KIBI_PREPARE_PATTERN.test(current);

  let next: string | undefined;
  let result: PrepareScriptResult;
  if (enabled) {
    if (hasKibi) return "present";
    const blank = current.trim() === "";
    next = blank
      ? KIBI_PREPARE_COMMAND
      : `${current} && ${KIBI_PREPARE_COMMAND}`;
    result = blank ? "added" : "appended";
  } else {
    if (!hasKibi) return "absent";
    const remaining = splitSteps(current).filter(
      (step) => !KIBI_PREPARE_PATTERN.test(step),
    );
    next = remaining.length > 0 ? remaining.join(" && ") : undefined;
    result = "removed";
  }

  // The script moves to the end; an undefined one is left out of the JSON.
  const { prepare: _previous, ...otherScripts } = scripts;
  manifest.scripts = { ...otherScripts, prepare: next };
  writeFileSync(packagePath, serializeJson(manifest, raw));
  return result;
}

/** Whether the root package.json `prepare` script runs Kibi's hook install. */
// implements REQ-kibi-fresh-clone-setup
export function hasKibiPrepareScript(worktreeRoot: string): boolean {
  try {
    const manifest = JSON.parse(
      readFileSync(path.join(worktreeRoot, "package.json"), "utf8"),
    ) as { scripts: { prepare?: unknown } };
    // A manifest without scripts throws here and counts as no script.
    const prepare = manifest.scripts.prepare;
    return typeof prepare === "string" && KIBI_PREPARE_PATTERN.test(prepare);
  } catch {
    return false;
  }
}

// implements REQ-kibi-fresh-clone-setup
export type HooksInstallOutcome =
  | "installed"
  | "not-a-repository"
  | "not-initialized"
  | "ci"
  | "hook-manager"
  | "external-hooks-dir";

function isCi(env: NodeJS.ProcessEnv): boolean {
  const value = env.CI;
  return (
    value !== undefined && value !== "" && value !== "0" && value !== "false"
  );
}

/**
 * `kibi hooks install`: Kibi's git hooks for this checkout, and nothing else.
 * With --quiet (the `prepare` script) it never fails the install that runs it
 * and prints only when it installed something: outside a Git work tree, in CI,
 * before `kibi init`, or where a hook manager owns the hooks, it does nothing.
 */
// implements REQ-kibi-fresh-clone-setup, REQ-git-hook-effective-install
export async function hooksInstallCommand(
  options: { quiet?: boolean } = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ exitCode: number; outcome: HooksInstallOutcome }> {
  const quiet = options.quiet === true;
  const note = (message: string) => {
    if (!quiet) console.log(message);
  };
  const done = (outcome: HooksInstallOutcome, exitCode = 0) => ({
    exitCode,
    outcome,
  });

  if (quiet && isCi(env)) return done("ci");
  const resolution = resolveGitRepository(process.cwd());
  if (resolution.status !== "ok") {
    note("No Git work tree here; no hooks to install.");
    return done("not-a-repository", quiet ? 0 : 1);
  }
  const context = resolution.context;
  if (!existsSync(path.join(context.worktreeRoot, ".kb", "manifest.json"))) {
    note("Kibi is not initialized in this repository; run 'kibi init' first.");
    return done("not-initialized", quiet ? 0 : 1);
  }
  const manager = detectHookManager(
    context.worktreeRoot,
    context.effectiveHooksDir,
    context.hooksPathConfig,
  );
  if (manager !== null) {
    note(
      `Git hooks are managed by ${manager.name} (${manager.configPath}); Kibi installs none of its own. 'kibi doctor' checks that ${manager.name} runs Kibi's commands.`,
    );
    return done("hook-manager");
  }
  if (!isRepositoryManagedHooksDir(context)) {
    note(
      `The Git hooks directory resolves outside this repository (${context.effectiveHooksDir}); Kibi installs no hooks there.`,
    );
    return done("external-hooks-dir", quiet ? 0 : 1);
  }
  const results = installGitHooks(context.effectiveHooksDir, {
    hooksPathOrigin: context.hooksPathOrigin,
    ...(quiet ? { log: () => undefined } : {}),
  });
  if (quiet) {
    const installed = results
      .filter((entry) => entry.result === "installed")
      .map((entry) => entry.hook);
    if (installed.length > 0)
      console.log(`kibi: installed git hooks (${installed.join(", ")})`);
  }
  return done("installed");
}

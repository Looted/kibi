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

/**
 * How much of a fresh checkout Kibi sets up on its own. The choices are
 * committed, so every clone, harness and CI job follows the same answer:
 * `package.json` `kibi.setup` next to the project's other Kibi decisions,
 * or `.kb/setup.json` in a repository without a root package.json.
 */
export type SetupChoices = {
  /** Compile a missing branch store on first use instead of answering empty. */
  readonly autoSync: boolean;
  /** Install Kibi's git hooks from the package.json `prepare` script. */
  readonly prepareHooks: boolean;
  /** Keep a Kibi section in AGENTS.md (and an import in CLAUDE.md). */
  readonly agentInstructions: boolean;
  /** Scaffold the pull-request impact gate workflow with `kibi init --github`. */
  readonly ciGate: boolean;
};

export type SetupChoiceName = keyof SetupChoices;

export const SETUP_CHOICE_NAMES: readonly SetupChoiceName[] = [
  "autoSync",
  "prepareHooks",
  "agentInstructions",
  "ciGate",
];

export const DEFAULT_SETUP_CHOICES: SetupChoices = {
  autoSync: true,
  prepareHooks: true,
  agentInstructions: true,
  // A new required check can start failing pull requests; it is offered.
  ciGate: false,
};

export const SETUP_FILE = path.join(".kb", "setup.json");

export type SetupChoicesSource = "package.json" | "setup.json" | "defaults";

export type ResolvedSetupChoices = SetupChoices & {
  readonly source: SetupChoicesSource;
  /** Choices recorded explicitly, as opposed to defaulted. */
  readonly recorded: Partial<SetupChoices>;
};

function readJson(file: string): unknown {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(file).toString());
  } catch {
    // A missing or malformed file holds no value.
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordedChoices(value: unknown): Partial<SetupChoices> {
  if (!isRecord(value)) return {};
  const recorded: Partial<Record<SetupChoiceName, boolean>> = {};
  for (const name of SETUP_CHOICE_NAMES) {
    if (typeof value[name] === "boolean") recorded[name] = value[name];
  }
  return recorded;
}

/** The setup block of a root package.json, when it has a usable one. */
function packageSetup(workspaceRoot: string): unknown {
  const manifest = readJson(path.join(workspaceRoot, "package.json"));
  if (!isRecord(manifest) || !isRecord(manifest.kibi)) return undefined;
  return manifest.kibi.setup;
}

export function readSetupChoices(workspaceRoot: string): ResolvedSetupChoices {
  let source: SetupChoicesSource = "defaults";
  let recorded: Partial<SetupChoices> = {};
  const fromPackage = packageSetup(workspaceRoot);
  if (fromPackage !== undefined) {
    source = "package.json";
    recorded = recordedChoices(fromPackage);
  } else if (existsSync(path.join(workspaceRoot, SETUP_FILE))) {
    source = "setup.json";
    recorded = recordedChoices(readJson(path.join(workspaceRoot, SETUP_FILE)));
  }
  return { ...DEFAULT_SETUP_CHOICES, ...recorded, source, recorded };
}

/**
 * Records choices without touching any other key. A root package.json holds
 * them under `kibi.setup`; without one they go to `.kb/setup.json`, since a
 * repository that is not a JavaScript project must not get a package.json.
 * Returns the file it wrote, or null when nothing changed.
 */
export function writeSetupChoices(
  workspaceRoot: string,
  changes: Partial<SetupChoices>,
): string | null {
  if (Object.keys(changes).length === 0) return null;
  const packagePath = path.join(workspaceRoot, "package.json");
  if (existsSync(packagePath)) {
    const raw = readFileSync(packagePath, "utf8");
    const manifest = JSON.parse(raw) as Record<string, unknown>;
    const kibi = isRecord(manifest.kibi) ? manifest.kibi : {};
    const setup = isRecord(kibi.setup) ? kibi.setup : {};
    const next = { ...setup, ...changes };
    if (JSON.stringify(next) === JSON.stringify(setup)) return null;
    manifest.kibi = { ...kibi, setup: next };
    writeFileSync(packagePath, serializeJson(manifest, raw));
    return "package.json";
  }
  const setupPath = path.join(workspaceRoot, SETUP_FILE);
  const existing = readJson(setupPath);
  const current = isRecord(existing) ? existing : {};
  const next = { ...current, ...changes };
  if (existsSync(setupPath) && JSON.stringify(next) === JSON.stringify(current))
    return null;
  writeFileSync(setupPath, `${JSON.stringify(next, null, 2)}\n`);
  return SETUP_FILE;
}

/**
 * Serializes with the file's own indentation and trailing newline, so a
 * recorded choice is the only line a reviewer sees change.
 */
export function serializeJson(value: unknown, original: string): string {
  const indent = /^\{\r?\n([ \t]+)"/.exec(original)?.[1] ?? "  ";
  const newline = original.includes("\r\n") ? "\r\n" : "\n";
  const body = JSON.stringify(value, null, indent).replace(/\n/g, newline);
  return original.endsWith("\n") || original.length === 0
    ? `${body}${newline}`
    : body;
}

/** Whether auto-sync may run here: the env opt-out wins over the recorded choice. */
export function autoSyncEnabled(
  workspaceRoot: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.KIBI_AUTO_SYNC === "0") return false;
  return readSetupChoices(workspaceRoot).autoSync;
}

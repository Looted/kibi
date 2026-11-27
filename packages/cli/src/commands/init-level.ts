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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { createInterface } from "node:readline/promises";
import {
  DEFAULT_KIBI_LEVEL,
  KIBI_LEVELS,
  type KibiLevel,
  isKibiLevel,
  kibiLevelSettingName,
  readKibiLevel,
} from "kibi-agent-core/kibi-level";
import { SETUP_FILE, serializeJson } from "./setup-choices.js";

/** The question kibi init asks a person at a terminal. */
export const LEVEL_QUESTION = [
  "How hard should Kibi hold your coding agent to the requirements it records?",
  "  test      (recommended) Kibi also asks for the scenarios and linked tests that show each requirement holds, and blocks commits that leave them out.",
  "  remember  Kibi records requirements, links them to code and catches contradictions, but asks for no scenarios, tests or proofs.",
  "You can change this later in kibi.level (package.json) or level (.kb/setup.json).",
].join("\n");

/** Asks one question at the terminal and returns the answer. */
export type AskLevel = (question: string) => Promise<string>;

export async function askAtTerminal(
  question: string,
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout,
): Promise<string> {
  const terminal = createInterface({ input, output });
  try {
    return await terminal.question(`${question}\nLevel [test]: `);
  } finally {
    terminal.close();
  }
}

/** An answer read as a level: empty takes the recommended one. */
export function parseLevelAnswer(answer: string): KibiLevel | undefined {
  const trimmed = answer.trim().toLowerCase();
  if (trimmed === "") return DEFAULT_KIBI_LEVEL;
  return KIBI_LEVELS.find(
    (level) => level === trimmed || level.startsWith(trimmed),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Records the level where Kibi reads it: kibi.level in the root
 * package.json, else level in .kb/setup.json. Returns the file written, or
 * null when it already held this level.
 */
export function writeKibiLevel(
  workspaceRoot: string,
  level: KibiLevel,
): string | null {
  const packagePath = path.join(workspaceRoot, "package.json");
  if (existsSync(packagePath)) {
    const raw = readFileSync(packagePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      throw new Error("package.json root must be a JSON object");
    }
    const manifest = parsed;
    const kibi = isRecord(manifest.kibi) ? manifest.kibi : {};
    if (kibi.level === level) return null;
    manifest.kibi = { ...kibi, level };
    writeFileSync(packagePath, serializeJson(manifest, raw));
    return "package.json";
  }
  const setupPath = path.join(workspaceRoot, SETUP_FILE);
  let current: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(readFileSync(setupPath, "utf8"));
    if (isRecord(parsed)) current = parsed;
  } catch {
    // A missing or malformed setup file starts empty.
  }
  if (current.level === level) return null;
  mkdirSync(path.dirname(setupPath), { recursive: true });
  writeFileSync(
    setupPath,
    `${JSON.stringify({ ...current, level }, null, 2)}\n`,
  );
  return SETUP_FILE;
}

export type LevelSettlement =
  | {
      readonly level: KibiLevel;
      readonly written: string | null;
      readonly warning?: string;
    }
  | { readonly error: string };

function tryWriteKibiLevel(
  workspaceRoot: string,
  level: KibiLevel,
): LevelSettlement {
  try {
    return { level, written: writeKibiLevel(workspaceRoot, level) };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const where = kibiLevelSettingName(workspaceRoot);
    return {
      level,
      written: null,
      warning: `Warning: could not record Kibi level in ${where} (${reason}); this run used ${level} without recording.`,
    };
  }
}

/**
 * The level this init records: --level when given (refusing to overwrite a
 * different already-recorded level non-interactively unless `changeLevel` is
 * true); else the level the project already records; else the person's answer
 * at a terminal, with test recommended; else test.
 */
export async function settleKibiLevel(
  workspaceRoot: string,
  requested: string | undefined,
  interactive: boolean,
  ask: AskLevel = askAtTerminal,
  options?: Readonly<{ changeLevel?: boolean }>,
): Promise<LevelSettlement> {
  const recorded = readKibiLevel(workspaceRoot);
  if (requested !== undefined) {
    const level = requested.trim().toLowerCase();
    if (!isKibiLevel(level))
      return {
        error: `unknown --level '${requested}'. Expected one of: ${KIBI_LEVELS.join(", ")}.`,
      };
    if (
      recorded.source !== "default" &&
      recorded.invalid === undefined &&
      recorded.level !== level &&
      !interactive &&
      options?.changeLevel !== true
    ) {
      const where = kibiLevelSettingName(workspaceRoot);
      return {
        error: `this project already records Kibi level '${recorded.level}' in ${where}. Changing the Kibi level is the person's decision: run 'kibi init --level ${level}' at a terminal, or pass --change-level if the person explicitly asked to change it.`,
      };
    }
    return tryWriteKibiLevel(workspaceRoot, level);
  }
  if (recorded.source !== "default" && recorded.invalid === undefined)
    return { level: recorded.level, written: null };
  let level: KibiLevel = DEFAULT_KIBI_LEVEL;
  if (interactive) {
    let answer = parseLevelAnswer(await ask(LEVEL_QUESTION));
    while (answer === undefined)
      answer = parseLevelAnswer(
        await ask(`Please answer ${KIBI_LEVELS.join(" or ")}.`),
      );
    level = answer;
  }
  return tryWriteKibiLevel(workspaceRoot, level);
}

/** Whether init can ask a person: both ends are a terminal and not CI. */
export function initCanAsk(
  env: NodeJS.ProcessEnv = process.env,
  stdin: { isTTY?: boolean } = process.stdin,
  stdout: { isTTY?: boolean } = process.stdout,
): boolean {
  return stdin.isTTY === true && stdout.isTTY === true && !env.CI;
}

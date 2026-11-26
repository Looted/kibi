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

import {
  type Stats,
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import { sessionBriefFor } from "kibi-agent-core/session-brief";

/**
 * Agent instructions travel with the repository: AGENTS.md is read by Codex,
 * Cursor, OpenCode, ZCode and most other coding agents, Claude Code reads it
 * through an `@AGENTS.md` import in CLAUDE.md, and Gemini CLI, which reads
 * GEMINI.md by default, through an `@./AGENTS.md` import there. A plugin or
 * MCP server is per-user and per-machine; this is the one channel every
 * fresh clone has.
 */
export const AGENTS_FILE = "AGENTS.md";
export const CLAUDE_FILE = "CLAUDE.md";
export const GEMINI_FILE = "GEMINI.md";

export const KIBI_INSTRUCTIONS_BEGIN =
  "<!-- BEGIN kibi-managed: written by `kibi init`; edit outside these markers -->";
export const KIBI_INSTRUCTIONS_END = "<!-- END kibi-managed -->";

const INSTRUCTIONS_LEAD =
  "This repository records its requirements, decisions, tests and code ownership in a Kibi knowledge base (`.kb/`). Without the MCP tools, each `kb_*` call has a project-local CLI route that takes the same JSON object (`printf '%s\\n' '{\"query\":\"...\"}' | npx --no-install kibi search --input -`, or your package manager's runner).";

/**
 * What the session brief leaves to the skills, said where every agent reads
 * it: whom to ask, firm-code edits, hand edits and the skill to load.
 */
const INSTRUCTIONS_RULES: readonly string[] = [
  "- Ask the person only for a decision: a request that conflicts with a recorded rule, a choice between behaviours, an exception, or a rule you recorded in words that say more or less than theirs. Do the steps a Kibi result lists (`nextActions`, `kb_check` findings about your change) without asking, then report them.",
  '- Before editing code that implements a firm requirement (a rule the person set), ask the person unless the edit keeps that rule. After the edit, record your verdict for each edited symbol with `kb_review_firm_edit` (without MCP: `kibi review-firm-edit --input -`), "keeps" or "changes"; the commit is blocked until each has a current keeps receipt.',
  "- Do not edit `.kb/` files by hand.",
];

const COMMIT_GATE_LINE =
  "- When you commit, stage the `.kb` files with the code; commits must pass `kibi check --staged`, which the pre-commit hook runs. A fresh clone has no git hooks until the project's dependencies are installed or `kibi hooks install` runs.";

const NO_GIT_COMMIT_LINE =
  "- This directory has no Git repository, so there is no commit gate. After `git init`, run `kibi init` to install it.";

const SKILL_LINE =
  '- Workflow guidance: the `kibi-usage` skill (`kb_skills` with `action: "load"`, or `kibi skills load kibi-usage`).';

/**
 * The managed section for this workspace. Its change steps are the session
 * brief's own lines, so AGENTS.md (the one channel every fresh clone and
 * every host has) and the brief hosts and the MCP server send cannot drift
 * apart. Outside any Git repository the brief's check step and the commit
 * line say how to finish a change instead; `kibi init` run after `git init`
 * writes the Git version back. The OpenCode plugin reads kb_search/kb_query
 * in AGENTS.md as the project's Kibi posture; the brief names both.
 */
export function agentInstructionsFor(noGit: boolean): string {
  const steps = sessionBriefFor(noGit).split("\n").slice(1);
  return [
    "## Kibi",
    "",
    INSTRUCTIONS_LEAD,
    "",
    ...steps,
    ...INSTRUCTIONS_RULES,
    noGit ? NO_GIT_COMMIT_LINE : COMMIT_GATE_LINE,
    SKILL_LINE,
  ].join("\n");
}

/** The managed section of a workspace with Git. */
export const KIBI_AGENT_INSTRUCTIONS: string = agentInstructionsFor(false);

export const CLAUDE_IMPORT_SECTION = `## Kibi

@AGENTS.md`;

// Gemini CLI's memory import takes a path relative to the importing file.
export const GEMINI_IMPORT_SECTION = `## Kibi

@./AGENTS.md`;

export type InstructionFileResult =
  | "created"
  | "updated"
  | "unchanged"
  | "skipped-symlink"
  | "skipped-unsupported";

export type AgentInstructionsResult = Readonly<{
  agents: InstructionFileResult;
  claude: InstructionFileResult | "same-file";
  gemini: InstructionFileResult | "same-file";
}>;

function managedSection(body: string): string {
  return `${KIBI_INSTRUCTIONS_BEGIN}\n${body}\n${KIBI_INSTRUCTIONS_END}`;
}

// The markers hold no regular expression syntax, so they match literally.
const MANAGED_PATTERN = new RegExp(
  `${KIBI_INSTRUCTIONS_BEGIN}[\\s\\S]*?${KIBI_INSTRUCTIONS_END}`,
);

function stats(file: string): Stats | null {
  try {
    return lstatSync(file);
  } catch {
    return null;
  }
}

/**
 * Writes the managed section into one instruction file: appended to a file
 * the user wrote, replaced in place inside the markers, never anything
 * outside them. A symlink is never written through, so a link that leaves
 * the repository cannot redirect the write.
 */
export function upsertManagedSection(
  file: string,
  body: string,
): InstructionFileResult {
  const section = managedSection(body);
  const existing = stats(file);
  if (existing === null) {
    writeFileSync(file, `${section}\n`);
    return "created";
  }
  if (existing.isSymbolicLink()) return "skipped-symlink";
  if (!existing.isFile()) return "skipped-unsupported";
  const text = readFileSync(file, "utf8");
  const updated = MANAGED_PATTERN.test(text)
    ? text.replace(MANAGED_PATTERN, section)
    : `${text.trimEnd()}${text.trim().length > 0 ? "\n\n" : ""}${section}\n`;
  if (updated === text) return "unchanged";
  writeFileSync(file, updated);
  return "updated";
}

/** Whether a file already holds the current managed section. */
export function managedSectionState(
  file: string,
  body: string,
): "current" | "outdated" | "missing" {
  if (!existsSync(file)) return "missing";
  const text = readFileSync(file).toString();
  const match = MANAGED_PATTERN.exec(text);
  if (match === null) return "missing";
  return match[0] === managedSection(body) ? "current" : "outdated";
}

/**
 * The file a write to `file` lands in: itself, or the target of a symlink
 * that stays inside the worktree (AGENTS.md linked to CLAUDE.md is common).
 * Null for a link that leaves the worktree or dangles.
 */
function writeTarget(file: string, worktreeRoot: string): string | null {
  let root: string;
  try {
    root = realpathSync(worktreeRoot);
  } catch {
    return null;
  }
  if (stats(file) === null) return path.join(root, path.basename(file));
  let target: string;
  try {
    target = realpathSync(file);
  } catch {
    return null;
  }
  const relative = path.relative(root, target);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  )
    return null;
  return target;
}

/** A CLAUDE.md that already imports AGENTS.md needs no Kibi section of its own. */
function importsAgents(file: string): boolean {
  return (
    stats(file)?.isFile() === true &&
    /^\s*@(?:\.\/)?AGENTS\.md\s*$/m.test(readFileSync(file).toString())
  );
}

/**
 * The import section for a host file that reads AGENTS.md through it: none
 * when the file is AGENTS.md itself (linked) or already imports it.
 */
function writeImport(
  worktreeRoot: string,
  file: string,
  agentsTarget: string | null,
  section: string,
): InstructionFileResult | "same-file" {
  const target = writeTarget(path.join(worktreeRoot, file), worktreeRoot);
  // One file linked to the other already serves both hosts.
  if (agentsTarget !== null && agentsTarget === target) return "same-file";
  if (target === null) return "skipped-symlink";
  if (importsAgents(target)) return "unchanged";
  return upsertManagedSection(target, section);
}

export function writeAgentInstructions(
  worktreeRoot: string,
  noGit = false,
): AgentInstructionsResult {
  const agentsTarget = writeTarget(
    path.join(worktreeRoot, AGENTS_FILE),
    worktreeRoot,
  );
  const agents =
    agentsTarget === null
      ? "skipped-symlink"
      : upsertManagedSection(agentsTarget, agentInstructionsFor(noGit));
  return {
    agents,
    claude: writeImport(
      worktreeRoot,
      CLAUDE_FILE,
      agentsTarget,
      CLAUDE_IMPORT_SECTION,
    ),
    gemini: writeImport(
      worktreeRoot,
      GEMINI_FILE,
      agentsTarget,
      GEMINI_IMPORT_SECTION,
    ),
  };
}

export function reportAgentInstructions(result: AgentInstructionsResult): void {
  const line = (file: string, outcome: InstructionFileResult | "same-file") => {
    const what =
      file === CLAUDE_FILE
        ? "an @AGENTS.md import for Claude Code"
        : file === GEMINI_FILE
          ? "an @./AGENTS.md import for Gemini CLI"
          : "Kibi agent instructions";
    switch (outcome) {
      case "created":
        return `✓ Created ${file} with ${what}`;
      case "updated":
        return `✓ Updated the Kibi section of ${file}`;
      case "unchanged":
      case "same-file":
        return null;
      case "skipped-symlink":
        return `! ${file} is a symlink; Kibi never writes through it, so agents reading it get no Kibi instructions. Run 'kibi init' where the link's target is a regular file, or replace the link with a file.`;
      case "skipped-unsupported":
        return `! ${file} is not a regular file; left untouched.`;
    }
  };
  for (const message of [
    line(AGENTS_FILE, result.agents),
    line(CLAUDE_FILE, result.claude),
    line(GEMINI_FILE, result.gemini),
  ]) {
    if (message !== null) console.log(message);
  }
}

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

/**
 * Agent instructions travel with the repository: AGENTS.md is read by Codex,
 * Cursor, OpenCode, ZCode and most other coding agents, and Claude Code reads
 * it through an `@AGENTS.md` import in CLAUDE.md. A plugin or MCP server is
 * per-user and per-machine; this is the one channel every fresh clone has.
 */
// implements REQ-kibi-fresh-clone-setup
export const AGENTS_FILE = "AGENTS.md";
// implements REQ-kibi-fresh-clone-setup
export const CLAUDE_FILE = "CLAUDE.md";

// implements REQ-kibi-fresh-clone-setup
export const KIBI_INSTRUCTIONS_BEGIN =
  "<!-- BEGIN kibi-managed: written by `kibi init`; edit outside these markers -->";
// implements REQ-kibi-fresh-clone-setup
export const KIBI_INSTRUCTIONS_END = "<!-- END kibi-managed -->";

// The OpenCode plugin reads kb_search/kb_query in AGENTS.md as the project's
// Kibi posture, so both names stay in the section.
// implements REQ-kibi-fresh-clone-setup
export const KIBI_AGENT_INSTRUCTIONS = `## Kibi

This repository records its requirements, decisions, tests and code ownership in a Kibi knowledge base (\`.kb/\`).

- Before changing behavior, ask it: \`kb_search\` with the question, and \`kb_query\` with \`sourceFile\` for a file you edit. Without the MCP tools, use the project-local CLI (\`npx --no-install kibi search "<question>"\`, or your package manager's runner).
- A request that conflicts with a recorded requirement or decision is a question for the person, not a task.
- Record new or changed behavior with \`kb_upsert\` and finish with \`kb_check\`. Do not edit \`.kb/\` files by hand.
- Commits must pass \`kibi check --staged\`, which the pre-commit hook runs. A fresh clone has no git hooks until the project's dependencies are installed or \`kibi hooks install\` runs.
- Workflow guidance: the \`kibi-usage\` skill (\`kb_skills\` with \`action: "load"\`, or \`kibi skills load kibi-usage\`).`;

// implements REQ-kibi-fresh-clone-setup
export const CLAUDE_IMPORT_SECTION = `## Kibi

@AGENTS.md`;

// implements REQ-kibi-fresh-clone-setup
export type InstructionFileResult =
  | "created"
  | "updated"
  | "unchanged"
  | "skipped-symlink"
  | "skipped-unsupported";

// implements REQ-kibi-fresh-clone-setup
export type AgentInstructionsResult = Readonly<{
  agents: InstructionFileResult;
  claude: InstructionFileResult | "same-file";
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
// implements REQ-kibi-fresh-clone-setup
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
// implements REQ-kibi-fresh-clone-setup
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

// implements REQ-kibi-fresh-clone-setup
export function writeAgentInstructions(
  worktreeRoot: string,
): AgentInstructionsResult {
  const agentsTarget = writeTarget(
    path.join(worktreeRoot, AGENTS_FILE),
    worktreeRoot,
  );
  const claudeTarget = writeTarget(
    path.join(worktreeRoot, CLAUDE_FILE),
    worktreeRoot,
  );
  const agents =
    agentsTarget === null
      ? "skipped-symlink"
      : upsertManagedSection(agentsTarget, KIBI_AGENT_INSTRUCTIONS);
  // One file linked to the other already serves both hosts.
  if (agentsTarget !== null && agentsTarget === claudeTarget)
    return { agents, claude: "same-file" };
  if (claudeTarget === null) return { agents, claude: "skipped-symlink" };
  if (importsAgents(claudeTarget)) return { agents, claude: "unchanged" };
  const claude = upsertManagedSection(claudeTarget, CLAUDE_IMPORT_SECTION);
  return { agents, claude };
}

// implements REQ-kibi-fresh-clone-setup
export function reportAgentInstructions(result: AgentInstructionsResult): void {
  const line = (file: string, outcome: InstructionFileResult | "same-file") => {
    const what =
      file === CLAUDE_FILE
        ? "an @AGENTS.md import for Claude Code"
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
  ]) {
    if (message !== null) console.log(message);
  }
}

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
import fs from "node:fs";
import path from "node:path";

const WORKSPACE_ENV_KEYS = [
  "KIBI_WORKSPACE",
  "KIBI_PROJECT_ROOT",
  "KIBI_ROOT",
] as const;

/** Options whose value is a file or directory the user named from their shell. */
const PATH_OPTIONS = new Set([
  "--input",
  "--output",
  "--certificates",
  "--write-certificates",
]);

/** Commands that act on the current directory itself, never on an enclosing KB. */
const CWD_COMMANDS = new Set(["init"]);

function enclosingKbRoot(start: string): string | null {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, ".kb", "manifest.json")))
      return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function absolutePathArgs(argv: readonly string[], base: string): string[] {
  const absolute = (value: string): string =>
    value === "-" || path.isAbsolute(value) ? value : path.resolve(base, value);
  const result: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? "";
    const eq = arg.indexOf("=");
    if (eq > 0 && PATH_OPTIONS.has(arg.slice(0, eq))) {
      result.push(`${arg.slice(0, eq)}=${absolute(arg.slice(eq + 1))}`);
      continue;
    }
    result.push(arg);
    const next = argv[index + 1];
    if (PATH_OPTIONS.has(arg) && next !== undefined && !next.startsWith("--")) {
      result.push(absolute(next));
      index += 1;
    }
  }
  return result;
}

/**
 * Run from a subdirectory of a Kibi workspace against that workspace's KB,
 * the way git finds its repository: walk up to the nearest directory with
 * `.kb/manifest.json`. Without this, a command run from `apps/server/`
 * compiles a second, empty branch store there and reports an empty KB.
 * An explicit KIBI_WORKSPACE (or alias) and `kibi init` keep the given
 * directory. Relative path option values keep meaning what the user typed:
 * the result is the directory to run in and argv with those values made
 * absolute.
 */
// implements REQ-cli-subdirectory-workspace
export function resolveWorkspaceCwd(
  argv: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Readonly<{ cwd: string; argv: string[] }> {
  const unchanged = { cwd, argv: [...argv] };
  if (WORKSPACE_ENV_KEYS.some((key) => (env[key] ?? "").trim() !== ""))
    return unchanged;
  const command = argv.slice(2).find((arg) => !arg.startsWith("-"));
  if (command === undefined || CWD_COMMANDS.has(command)) return unchanged;
  const root = enclosingKbRoot(cwd);
  if (root === null || root === path.resolve(cwd)) return unchanged;
  return { cwd: root, argv: absolutePathArgs(argv, cwd) };
}

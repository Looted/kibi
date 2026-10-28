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

import { spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * How Kibi runs a small evaluator script against the workspace's own code:
 * the TypeScript and JavaScript runners (bun, the workspace's tsx, node with
 * type stripping) and the Python interpreters a project uses. The proof kinds
 * that read a model from the code (exhaustive domains, rule tables, state
 * machines, patterns, data schemas, route tables) all load code this way.
 */

// Node's type stripping resolves only exact specifiers. TypeScript apps
// import relative modules without an extension, or with `.js` for a `.ts`
// file; this resolve hook retries those as the TypeScript files they name.
export const TS_RESOLVE_HOOKS = `
const SUFFIXES = [".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", "/index.ts", "/index.tsx", "/index.js"];
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND" || !/^\\.\\.?\\//.test(specifier)) throw error;
    const base = specifier.replace(/\\.[cm]?js$/, "");
    for (const suffix of SUFFIXES) {
      try {
        return await next(base + suffix, context);
      } catch {}
    }
    throw error;
  }
}
`;

export function workspaceBin(workspaceRoot: string, name: string): string | null {
  let dir = path.resolve(workspaceRoot);
  for (;;) {
    const candidate = path.join(dir, "node_modules", ".bin", name);
    if (existsSync(candidate)) return candidate;
    if (path.dirname(dir) === dir) return null;
    dir = path.dirname(dir);
  }
}

/**
 * The Python interpreters a domain loads with, most specific first: the
 * KIBI_PYTHON override, the active virtualenv, a project virtualenv (`.venv`
 * or `venv`) between the domain file and the workspace root, then python3
 * and python on PATH. The system interpreter usually cannot import the
 * project's dependencies, so a project environment comes before it.
 */
// implements REQ-kibi-code-proof-kinds
export function pythonDomainInterpreters(
  workspaceRoot: string,
  sourceFile: string,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const interpreters: string[] = [];
  const add = (candidate: string | undefined) => {
    if (candidate && !interpreters.includes(candidate))
      interpreters.push(candidate);
  };
  add(env.KIBI_PYTHON?.trim() || undefined);
  const venvPython = (venv: string): string | undefined =>
    [
      path.join(venv, "bin", "python"),
      path.join(venv, "Scripts", "python.exe"),
    ].find((candidate) => existsSync(candidate));
  if (env.VIRTUAL_ENV) add(venvPython(env.VIRTUAL_ENV));
  const root = path.resolve(workspaceRoot);
  let dir = path.dirname(path.resolve(root, sourceFile));
  for (;;) {
    for (const name of [".venv", "venv"]) add(venvPython(path.join(dir, name)));
    if (dir === root || path.dirname(dir) === dir) break;
    if (!dir.startsWith(`${root}${path.sep}`)) break;
    dir = path.dirname(dir);
  }
  add("python3");
  add("python");
  return interpreters;
}

/**
 * spawnSync with the child's stdin, stdout and stderr in temp files instead
 * of pipes. Bun can miss the readiness event of a child's pipe, which leaves
 * a synchronous spawn waiting until its timeout although the child has long
 * exited; with no pipes the call only waits for the process to exit.
 */
export function spawnSyncThroughFiles(
  command: string,
  args: readonly string[],
  options: Readonly<{ cwd?: string; input?: string; timeout: number }>,
): { error: Error | undefined; status: number | null; stdout: string; stderr: string } {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-spawn-"));
  try {
    const inPath = path.join(dir, "stdin");
    const outPath = path.join(dir, "stdout");
    const errPath = path.join(dir, "stderr");
    writeFileSync(inPath, options.input ?? "");
    const fds = [openSync(inPath, "r"), openSync(outPath, "w"), openSync(errPath, "w")];
    let run: ReturnType<typeof spawnSync>;
    try {
      run = spawnSync(command, [...args], {
        cwd: options.cwd,
        stdio: fds,
        timeout: options.timeout,
      });
    } finally {
      for (const fd of fds) closeSync(fd);
    }
    return {
      error: run.error,
      status: run.status,
      stdout: readFileSync(outPath, "utf8"),
      stderr: readFileSync(errPath, "utf8"),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** The line of a runner's stderr that names the failure. */
function failureLine(stderr: string, python: boolean): string {
  const lines = stderr
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  // A Python traceback names the exception on its last line.
  return (python ? lines.at(-1) : lines[0]) ?? "";
}

/**
 * Run an evaluator script against the workspace code and return the JSON it
 * prints last. A TypeScript or JavaScript file runs with bun when it is on
 * PATH, else the workspace's tsx, else node's type stripping (which retries
 * extensionless relative imports as TypeScript files); a Python file (`.py`)
 * runs with the first interpreter pythonDomainInterpreters finds. A runner
 * whose output `accept` rejects (or that fails to start) yields to the next.
 */
// implements REQ-kibi-non-numeric-proof-kinds
export function runCodeEvaluator(
  workspaceRoot: string,
  sourceFile: string,
  scripts: Readonly<{ js: string; python: string }>,
  args: readonly string[],
  accept: (parsed: unknown) => boolean = () => true,
  options: Readonly<{
    runners?: readonly ("bun" | "tsx" | "node")[];
  }> = {},
):
  | { ok: true; value: unknown; python: boolean }
  | { ok: false; failure: string; python: boolean } {
  const python = /\.py$/i.test(sourceFile);
  const tsx = python ? null : workspaceBin(workspaceRoot, "tsx");
  const runners: [string, string[]][] = python
    ? pythonDomainInterpreters(workspaceRoot, sourceFile).map(
        (interpreter): [string, string[]] => [
          interpreter,
          ["-c", scripts.python],
        ],
      )
    : (options.runners ?? ["bun", "tsx", "node"]).flatMap(
        (runner): [string, string[]][] => {
          if (runner === "bun") return [["bun", ["-e", scripts.js]]];
          if (runner === "tsx")
            return tsx === null
              ? []
              : [[tsx, ["--eval", scripts.js, "--"]]];
          return [
            [
              process.execPath,
              [
                "--experimental-strip-types",
                "--no-warnings",
                "--input-type=module",
                "-e",
                scripts.js,
              ],
            ],
          ];
        },
      );
  let failure = "";
  for (const [command, argv] of runners) {
    const run = spawnSyncThroughFiles(command, [...argv, ...args], {
      cwd: workspaceRoot,
      timeout: 60_000,
    });
    if (run.error) continue;
    const line = run.stdout.trim().split("\n").pop() ?? "";
    try {
      const parsed = JSON.parse(line) as unknown;
      if (accept(parsed)) return { ok: true, value: parsed, python };
    } catch {
      // Fall through to the next runner.
    }
    failure = failureLine(run.stderr, python);
  }
  return { ok: false, failure, python };
}


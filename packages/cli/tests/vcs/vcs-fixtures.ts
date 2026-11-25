import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Temporary workspaces for the version-control tests: a directory outside
 * any repository (Git stops at its parent), a repository, and the cases
 * between them. Each test removes what it made with `cleanup`.
 */

const made: string[] = [];
let savedCeiling: string | undefined;
let savedPath: string | undefined;
let savedBranch: string | undefined;

export function isolateFromRepositories(): void {
  savedCeiling = process.env.GIT_CEILING_DIRECTORIES;
  savedBranch = process.env.KIBI_BRANCH;
  Reflect.deleteProperty(process.env, "KIBI_BRANCH");
  process.env.GIT_CEILING_DIRECTORIES = fs.realpathSync(os.tmpdir());
}

export function cleanup(): void {
  for (const dir of made.splice(0))
    fs.rmSync(dir, { recursive: true, force: true });
  restoreEnv("GIT_CEILING_DIRECTORIES", savedCeiling);
  restoreEnv("KIBI_BRANCH", savedBranch);
  if (savedPath !== undefined) {
    process.env.PATH = savedPath;
    savedPath = undefined;
  }
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) Reflect.deleteProperty(process.env, name);
  else process.env[name] = value;
}

/** A directory outside any repository. */
export function plainDirectory(prefix = "kibi-vcs-"): string {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  made.push(dir);
  return dir;
}

/** A repository on branch main, with no commit. */
export function gitRepository(): string {
  const dir = plainDirectory("kibi-vcs-git-");
  execFileSync("git", ["init", "-q", "-b", "main", dir]);
  return dir;
}

/** Hide Git from this process until cleanup. */
export function hideGit(): void {
  savedPath ??= process.env.PATH;
  process.env.PATH = plainDirectory("kibi-vcs-nopath-");
}

export function write(root: string, relative: string, text: string): void {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

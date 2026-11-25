import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  execFileSync,
  isolatedCliSandboxEnv,
  spawnSync,
} from "../helpers/isolated-env.js";
import { KIBI_CLI } from "./workspace.js";

/**
 * An agent asked to set Kibi up in a directory that is not a Git repository
 * yet. Before the fix kibi init exited 1 with no error category and a long
 * diagnostic that led with KIBI_BRANCH; init with KIBI_BRANCH then worked for
 * that run only, and every later kibi status failed as OPERATION_FAILED
 * (retryable) or as an uncaught error. Now every route refuses with
 * NOT_A_GIT_REPOSITORY and the same one instruction, init writes nothing,
 * and git init followed by kibi init works.
 */

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-outside-git-"));
  roots.push(root);
  return root;
}

function cliEnv(root: string, overrides: NodeJS.ProcessEnv = {}) {
  return isolatedCliSandboxEnv({
    // Nothing above the temporary directory may count as its repository.
    GIT_CEILING_DIRECTORIES: path.dirname(root),
    KIBI_AUTO_SYNC: "0",
    ...overrides,
  });
}

function kibi(
  root: string,
  args: string[],
  input?: string,
  overrides: NodeJS.ProcessEnv = {},
) {
  const result = spawnSync(process.execPath, [KIBI_CLI, ...args], {
    cwd: root,
    encoding: "utf8",
    env: cliEnv(root, overrides),
    ...(input === undefined ? {} : { input }),
  });
  return {
    status: result.status,
    stdout: String(result.stdout),
    stderr: String(result.stderr),
  };
}

const INSTRUCTION =
  "Failed to resolve active branch: this directory is not inside a Git repository, and Kibi keeps its knowledge per Git branch. Run 'git init' here (or run Kibi from inside the repository), then retry. To use Kibi without Git, set KIBI_BRANCH=<name> for this and every later Kibi command, Git hook and MCP server in this workspace.";

describe("Kibi outside a Git repository", () => {
  test("init writes nothing and every route gives the same coded instruction", () => {
    const root = workspace();

    const init = kibi(root, ["init"]);
    expect(init.status).toBe(1);
    expect(init.stderr.trim()).toBe(`Error: ${INSTRUCTION}`);
    expect(readdirSync(root)).toEqual([]);

    const status = kibi(root, ["status"]);
    expect(status.status).toBe(1);
    expect(status.stderr.trim()).toBe(INSTRUCTION);

    const json = kibi(root, ["status", "--input", "-"], "{}");
    expect(json.status).toBe(1);
    const envelope = JSON.parse(json.stdout) as {
      status: string;
      error: { code: string; message: string; retryable: boolean };
    };
    expect(envelope.status).toBe("error");
    expect(envelope.error).toStrictEqual({
      code: "NOT_A_GIT_REPOSITORY",
      message: INSTRUCTION,
      retryable: false,
    });
    expect(readdirSync(root)).toEqual([]);
  });

  test("following the instruction initializes the repository", () => {
    const root = workspace();
    execFileSync("git", ["init", "-q", "-b", "main"], {
      cwd: root,
      env: cliEnv(root),
    });
    const init = kibi(root, ["init", "--no-hooks"]);
    expect(init.status).toBe(0);
    expect(init.stdout).toContain("Kibi initialized");
    expect(init.stdout).not.toContain("No Git repository here");
    expect(existsSync(path.join(root, ".kb", "manifest.json"))).toBe(true);
    const status = kibi(root, ["status", "--input", "-"], "{}");
    expect(status.status).toBe(0);
  });

  test("KIBI_BRANCH stands in for Git on that run only, and init says so", () => {
    const root = workspace();
    const init = kibi(root, ["init", "--no-hooks"], undefined, {
      KIBI_BRANCH: "main",
    });
    expect(init.status).toBe(0);
    expect(init.stdout).toContain(
      "! No Git repository here: this workspace's knowledge is attached to KIBI_BRANCH=main for this run only.",
    );
    // Nothing in .kb/ remembers the branch (ADR-012), so the next command
    // without it gets the same instruction instead of a crash.
    const status = kibi(root, ["status"]);
    expect(status.status).toBe(1);
    expect(status.stderr.trim()).toBe(INSTRUCTION);
    const withBranch = kibi(root, ["status", "--input", "-"], "{}", {
      KIBI_BRANCH: "main",
    });
    expect(withBranch.status).toBe(0);
  });
});

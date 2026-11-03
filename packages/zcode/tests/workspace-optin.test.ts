// implements REQ-zcode-kibi-plugin-v1
import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { resolveKibiWorkspace } from "../src/workspace-optin";

const tempRoots: string[] = [];

function createTempRoot(prefix: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempRoots.push(root);
  return root;
}

function optInWorkspace(root: string): void {
  fs.mkdirSync(path.join(root, ".kb"), { recursive: true });
  fs.writeFileSync(path.join(root, ".kb", "manifest.json"), "{}");
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("codex workspace opt-in resolution", () => {
  test("marks a workspace opted in when its root owns .kb/manifest.json", () => {
    const workspace = createTempRoot("kibi-zcode-optin-");
    optInWorkspace(workspace);

    expect(resolveKibiWorkspace(workspace)).toEqual({
      root: workspace,
      optedIn: true,
    });
  });

  test("stays unconfigured when .kb exists without a manifest", () => {
    const workspace = createTempRoot("kibi-zcode-unconfigured-");
    fs.mkdirSync(path.join(workspace, ".kb"));

    const resolution = resolveKibiWorkspace(workspace);

    expect(resolution.optedIn).toBe(false);
    expect(resolution.root).toBe(workspace);
  });

  test("resolves subdirectories to the opted-in repository root", () => {
    const workspace = createTempRoot("kibi-zcode-subdir-");
    optInWorkspace(workspace);
    const nested = path.join(workspace, "packages", "codex", "src");
    fs.mkdirSync(nested, { recursive: true });

    expect(resolveKibiWorkspace(nested)).toEqual({
      root: workspace,
      optedIn: true,
    });
  });

  test("treats a git worktree root with its own manifest as opted in", () => {
    const worktree = createTempRoot("kibi-zcode-worktree-");
    optInWorkspace(worktree);
    // Git worktrees carry a .git file, not a directory.
    fs.writeFileSync(
      path.join(worktree, ".git"),
      "gitdir: /elsewhere/main.git",
    );

    expect(resolveKibiWorkspace(worktree)).toEqual({
      root: worktree,
      optedIn: true,
    });
  });

  test("does not inherit opt-in from an unrelated enclosing repository", () => {
    const enclosing = createTempRoot("kibi-zcode-enclosing-");
    optInWorkspace(enclosing);
    const nested = path.join(enclosing, "vendored-project");
    fs.mkdirSync(path.join(nested, ".git"), { recursive: true });

    expect(resolveKibiWorkspace(nested)).toEqual({
      root: nested,
      optedIn: false,
    });
  });

  test("reports a plain repository without Kibi as unconfigured at its root", () => {
    const workspace = createTempRoot("kibi-zcode-plain-");
    fs.mkdirSync(path.join(workspace, ".git"), { recursive: true });
    const nested = path.join(workspace, "src");
    fs.mkdirSync(nested);

    const resolution = resolveKibiWorkspace(nested);

    expect(resolution.root).toBe(workspace);
    expect(resolution.optedIn).toBe(false);
  });

  test("honors the supported Kibi workspace environment overrides", () => {
    const workspace = createTempRoot("kibi-zcode-env-");
    optInWorkspace(workspace);
    const elsewhere = createTempRoot("kibi-zcode-env-other-");

    for (const key of ["KIBI_WORKSPACE", "KIBI_PROJECT_ROOT", "KIBI_ROOT"]) {
      const resolution = resolveKibiWorkspace(elsewhere, {
        [key]: workspace,
      } as NodeJS.ProcessEnv);
      expect(resolution).toEqual({ root: workspace, optedIn: true });
    }
  });

  test("treats an empty cwd as the process cwd", () => {
    const workspace = createTempRoot("kibi-zcode-cwd-");
    optInWorkspace(workspace);

    expect(
      resolveKibiWorkspace("", {
        KIBI_WORKSPACE: workspace,
      } as NodeJS.ProcessEnv),
    ).toEqual({
      root: workspace,
      optedIn: true,
    });
  });

  test("ignores blank environment overrides", () => {
    const workspace = createTempRoot("kibi-zcode-env-blank-");
    optInWorkspace(workspace);
    const other = createTempRoot("kibi-zcode-env-blank-other-");
    optInWorkspace(other);

    expect(
      resolveKibiWorkspace(workspace, {
        KIBI_WORKSPACE: "   ",
        KIBI_PROJECT_ROOT: "",
        KIBI_ROOT: ` ${other} `,
      } as NodeJS.ProcessEnv),
    ).toStrictEqual({ root: other, optedIn: true });
    expect(
      resolveKibiWorkspace(workspace, {
        KIBI_WORKSPACE: "   ",
      } as NodeJS.ProcessEnv),
    ).toStrictEqual({ root: workspace, optedIn: true });
  });

  test("reads process.env by default", () => {
    const workspace = createTempRoot("kibi-zcode-env-default-");
    optInWorkspace(workspace);
    const saved = process.env.KIBI_ROOT;
    process.env.KIBI_ROOT = workspace;
    try {
      expect(resolveKibiWorkspace(undefined)).toStrictEqual({
        root: workspace,
        optedIn: true,
      });
    } finally {
      if (saved === undefined) Reflect.deleteProperty(process.env, "KIBI_ROOT");
      else process.env.KIBI_ROOT = saved;
    }
  });

  test("a missing or blank start directory walks from the process cwd", () => {
    const workspace = createTempRoot("kibi-zcode-cwd-walk-");
    const nested = path.join(workspace, "nested");
    fs.mkdirSync(nested);
    const previous = process.cwd();
    process.chdir(nested);
    try {
      for (const startDir of [undefined, "", "   "]) {
        expect(resolveKibiWorkspace(startDir, {})).toStrictEqual({
          root: fs.realpathSync(nested),
          optedIn: false,
        });
      }
      optInWorkspace(workspace);
      expect(resolveKibiWorkspace("  ", {})).toStrictEqual({
        root: fs.realpathSync(workspace),
        optedIn: true,
      });
    } finally {
      process.chdir(previous);
    }
  });

  test("a start directory without manifest or git ancestors is its own root", () => {
    const workspace = createTempRoot("kibi-zcode-no-boundary-");
    const nested = path.join(workspace, "a", "b");
    fs.mkdirSync(nested, { recursive: true });

    expect(resolveKibiWorkspace(nested, {})).toStrictEqual({
      root: nested,
      optedIn: false,
    });
  });
});

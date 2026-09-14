// implements REQ-codex-kibi-plugin-v1
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
    const workspace = createTempRoot("kibi-codex-optin-");
    optInWorkspace(workspace);

    expect(resolveKibiWorkspace(workspace)).toEqual({
      root: workspace,
      optedIn: true,
    });
  });

  test("stays unconfigured when .kb exists without a manifest", () => {
    const workspace = createTempRoot("kibi-codex-unconfigured-");
    fs.mkdirSync(path.join(workspace, ".kb"));

    const resolution = resolveKibiWorkspace(workspace);

    expect(resolution.optedIn).toBe(false);
    expect(resolution.root).toBe(workspace);
  });

  test("resolves subdirectories to the opted-in repository root", () => {
    const workspace = createTempRoot("kibi-codex-subdir-");
    optInWorkspace(workspace);
    const nested = path.join(workspace, "packages", "codex", "src");
    fs.mkdirSync(nested, { recursive: true });

    expect(resolveKibiWorkspace(nested)).toEqual({
      root: workspace,
      optedIn: true,
    });
  });

  test("treats a git worktree root with its own manifest as opted in", () => {
    const worktree = createTempRoot("kibi-codex-worktree-");
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
    const enclosing = createTempRoot("kibi-codex-enclosing-");
    optInWorkspace(enclosing);
    const nested = path.join(enclosing, "vendored-project");
    fs.mkdirSync(path.join(nested, ".git"), { recursive: true });

    expect(resolveKibiWorkspace(nested)).toEqual({
      root: nested,
      optedIn: false,
    });
  });

  test("reports a plain repository without Kibi as unconfigured at its root", () => {
    const workspace = createTempRoot("kibi-codex-plain-");
    fs.mkdirSync(path.join(workspace, ".git"), { recursive: true });
    const nested = path.join(workspace, "src");
    fs.mkdirSync(nested);

    const resolution = resolveKibiWorkspace(nested);

    expect(resolution.root).toBe(workspace);
    expect(resolution.optedIn).toBe(false);
  });

  test("honors the supported Kibi workspace environment overrides", () => {
    const workspace = createTempRoot("kibi-codex-env-");
    optInWorkspace(workspace);
    const elsewhere = createTempRoot("kibi-codex-env-other-");

    for (const key of ["KIBI_WORKSPACE", "KIBI_PROJECT_ROOT", "KIBI_ROOT"]) {
      const resolution = resolveKibiWorkspace(elsewhere, {
        [key]: workspace,
      } as NodeJS.ProcessEnv);
      expect(resolution).toEqual({ root: workspace, optedIn: true });
    }
  });

  test("treats an empty cwd as the process cwd", () => {
    const workspace = createTempRoot("kibi-codex-cwd-");
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
});

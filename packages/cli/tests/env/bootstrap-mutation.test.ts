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

import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  KIBI_LEGACY_ENV_FILE,
  KIBI_PROJECT_ENV_FILE,
  bootstrapKibiEnvironment,
  getLastBootstrapResult,
  inspectSecretSource,
  isSecretAvailable,
  parseEnvContent,
  resetKibiEnvironmentBootstrapStateForTests,
  resolveEnvFilePath,
  resolveKibiProjectEnvPath,
  resolveKibiUserEnvPath,
  resolveKibiWorkspaceRoot,
  secretSourceFromBootstrap,
} from "../../src/env/bootstrap.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  resetKibiEnvironmentBootstrapStateForTests();
});

function tempDir(base = os.tmpdir()): string {
  const dir = mkdtempSync(path.join(base, "kibi-env-boot-"));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/**
 * A writable base with no .kb or .git above it, when the host has one, so
 * discovery can be seen falling through to .git.
 */
function unmarkedBase(): string {
  for (const base of [os.tmpdir(), "/dev/shm", "/var/tmp"]) {
    const marked =
      discovered(base) !== base ||
      existsSync(path.join(base, ".kb")) ||
      existsSync(path.join(base, ".git"));
    if (!existsSync(base) || marked) continue;
    try {
      rmSync(mkdtempSync(path.join(base, "kibi-env-probe-")), {
        recursive: true,
      });
      return base;
    } catch {
      // Not writable.
    }
  }
  return os.tmpdir();
}

function write(file: string, content: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function chdir(dir: string): void {
  const previous = process.cwd();
  process.chdir(dir);
  cleanups.push(() => process.chdir(previous));
}

/** Sets process.env keys for one test and restores them afterwards. */
function setProcessEnv(values: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(values)) {
    const had = Object.hasOwn(process.env, key);
    const previous = process.env[key];
    cleanups.push(() => {
      if (had) process.env[key] = previous;
      else Reflect.deleteProperty(process.env, key);
    });
    if (value === undefined) Reflect.deleteProperty(process.env, key);
    else process.env[key] = value;
  }
}

/**
 * What discovery finds above a temporary directory: os.tmpdir() can sit below
 * a stray .kb or .git, so the expectation is computed rather than assumed.
 */
function discovered(start: string): string {
  for (const marker of [".kb", ".git"]) {
    let current = start;
    for (;;) {
      if (existsSync(path.join(current, marker))) return current;
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  return start;
}

const WORKSPACE_KEYS = {
  KIBI_WORKSPACE: undefined,
  KIBI_PROJECT_ROOT: undefined,
  KIBI_ROOT: undefined,
  KIBI_ENV_FILE: undefined,
};

describe("file names", () => {
  test("names the project and legacy env files", () => {
    expect(KIBI_PROJECT_ENV_FILE).toBe(".env.kibi");
    expect(KIBI_LEGACY_ENV_FILE).toBe(".env");
  });
});

describe("resolveKibiWorkspaceRoot", () => {
  test("prefers the workspace variables in order, trimmed", () => {
    const start = tempDir();
    expect(
      resolveKibiWorkspaceRoot(start, {
        KIBI_WORKSPACE: " /w ",
        KIBI_PROJECT_ROOT: "/p",
        KIBI_ROOT: "/r",
      }),
    ).toBe("/w");
    expect(
      resolveKibiWorkspaceRoot(start, {
        KIBI_WORKSPACE: "  ",
        KIBI_PROJECT_ROOT: "/p",
        KIBI_ROOT: "/r",
      }),
    ).toBe("/p");
    expect(resolveKibiWorkspaceRoot(start, { KIBI_ROOT: "/r/x/.." })).toBe(
      "/r",
    );
    chdir(start);
    expect(resolveKibiWorkspaceRoot(start, { KIBI_ROOT: "rel" })).toBe(
      path.join(process.cwd(), "rel"),
    );
  });

  test("finds a knowledge base before a repository root", () => {
    const outer = tempDir();
    const inner = path.join(outer, "repo", "pkg");
    mkdirSync(path.join(outer, ".kb"), { recursive: true });
    mkdirSync(path.join(outer, "repo", ".git"), { recursive: true });
    mkdirSync(inner, { recursive: true });
    expect(resolveKibiWorkspaceRoot(inner, {})).toBe(outer);
    const gitOnly = tempDir(unmarkedBase());
    mkdirSync(path.join(gitOnly, ".git"));
    mkdirSync(path.join(gitOnly, "a", "b"), { recursive: true });
    const nested = path.join(gitOnly, "a", "b");
    // A stray .kb above the temporary directory still wins over .git.
    const expected = discovered(nested);
    expect(resolveKibiWorkspaceRoot(nested, {})).toBe(expected);
    expect(resolveKibiWorkspaceRoot(`${gitOnly}/a/../a/b`, {})).toBe(expected);
  });

  test("falls back to the start directory", () => {
    // The filesystem root has no ancestors that could hold a stray marker.
    expect(resolveKibiWorkspaceRoot("/", {})).toBe(discovered("/"));
    const start = tempDir();
    expect(resolveKibiWorkspaceRoot(`${start}/x/..`, {})).toBe(
      discovered(start),
    );
    chdir(start);
    setProcessEnv(WORKSPACE_KEYS);
    expect(resolveKibiWorkspaceRoot()).toBe(discovered(process.cwd()));
    setProcessEnv({ KIBI_ROOT: "/from-process" });
    expect(resolveKibiWorkspaceRoot(start)).toBe("/from-process");
  });
});

describe("env file paths", () => {
  test("resolves env files against the workspace", () => {
    expect(resolveEnvFilePath("/abs/.env", "/w")).toBe("/abs/.env");
    expect(resolveEnvFilePath("/abs/../.env", "/w")).toBe("/abs/../.env");
    expect(resolveEnvFilePath("sub/../.env", "/w")).toBe("/w/.env");
  });

  test("resolves the user env file", () => {
    expect(
      resolveKibiUserEnvPath({
        xdgConfigHome: " /x ",
        env: { XDG_CONFIG_HOME: "/e" },
        homedir: "/h",
      }),
    ).toBe("/x/kibi/env");
    expect(
      resolveKibiUserEnvPath({
        xdgConfigHome: " ",
        env: { XDG_CONFIG_HOME: " /e " },
        homedir: "/h",
      }),
    ).toBe("/e/kibi/env");
    expect(
      resolveKibiUserEnvPath({ env: { XDG_CONFIG_HOME: " " }, homedir: "/h" }),
    ).toBe("/h/.config/kibi/env");
    expect(resolveKibiUserEnvPath({ env: {} })).toBe(
      path.join(os.homedir(), ".config", "kibi", "env"),
    );
    setProcessEnv({ XDG_CONFIG_HOME: "/proc-xdg" });
    expect(resolveKibiUserEnvPath()).toBe("/proc-xdg/kibi/env");
  });

  test("resolves the project env file and its override", () => {
    expect(resolveKibiProjectEnvPath("/w", {})).toBe("/w/.env.kibi");
    expect(resolveKibiProjectEnvPath("/w", { KIBI_ENV_FILE: " " })).toBe(
      "/w/.env.kibi",
    );
    expect(
      resolveKibiProjectEnvPath("/w", { KIBI_ENV_FILE: " conf/kibi.env " }),
    ).toBe("/w/conf/kibi.env");
    expect(resolveKibiProjectEnvPath("/w", { KIBI_ENV_FILE: "/abs" })).toBe(
      "/abs",
    );
    setProcessEnv({ KIBI_ENV_FILE: "p.env" });
    expect(resolveKibiProjectEnvPath("/w")).toBe("/w/p.env");
  });
});

describe("parseEnvContent", () => {
  test("reads keys, values and quotes", () => {
    expect(
      parseEnvContent(
        [
          "  # comment",
          "  # X=1",
          "#Y=2",
          "",
          "   ",
          "A=1",
          " B = two words ",
          'C="quoted"',
          "D='single'",
          "E=\"mismatch'",
          "F='open",
          'G="',
          "H=a=b",
          "=nokey",
          "novalue",
          "I=",
          'J=""',
          'K=x"',
          "L='x",
          'M="x',
        ].join("\r\n"),
      ),
    ).toStrictEqual([
      { key: "A", value: "1" },
      { key: "B", value: "two words" },
      { key: "C", value: "quoted" },
      { key: "D", value: "single" },
      { key: "E", value: "\"mismatch'" },
      { key: "F", value: "'open" },
      { key: "G", value: "" },
      { key: "H", value: "a=b" },
      { key: "I", value: "" },
      { key: "J", value: "" },
      { key: "K", value: 'x"' },
      { key: "L", value: "'x" },
      { key: "M", value: '"x' },
    ]);
    expect(parseEnvContent("A=1\nB=2\rC=3")).toStrictEqual([
      { key: "A", value: "1" },
      { key: "B", value: "2\rC=3" },
    ]);
  });
});

function workspaceWithFiles(files: {
  user?: string;
  project?: string;
  legacy?: string;
}) {
  const root = tempDir();
  mkdirSync(path.join(root, ".kb"));
  const xdg = path.join(root, "xdg");
  if (files.user !== undefined)
    write(path.join(xdg, "kibi", "env"), files.user);
  if (files.project !== undefined)
    write(path.join(root, ".env.kibi"), files.project);
  if (files.legacy !== undefined) write(path.join(root, ".env"), files.legacy);
  return { root, xdg };
}

describe("bootstrapKibiEnvironment with an injected env", () => {
  test("layers process, user, project and legacy values", () => {
    const { root, xdg } = workspaceWithFiles({
      user: "U_ONLY=u\nSHARED=user\nPROC=user\nBLANK_U= \nUSER_LEGACY=u\n",
      project:
        'SHARED=project\nP_ONLY=p\nPROC=project\nBLANK_P=""\nUSER_LEGACY=\n',
      legacy:
        "L_ONLY=l\nSHARED=legacy\nP_ONLY=legacy\nPROC=legacy\nUSER_LEGACY=legacy\nBLANK_L=\nEMPTY_PROC=legacy\n",
    });
    const env: NodeJS.ProcessEnv = {
      PROC: "process",
      EMPTY_PROC: " ",
      KIBI_WORKSPACE: root,
    };
    const result = bootstrapKibiEnvironment({
      env,
      startDir: "/",
      xdgConfigHome: xdg,
      homedir: "/nowhere",
    });
    expect(result).toStrictEqual({
      workspaceRoot: root,
      userEnvPath: path.join(xdg, "kibi", "env"),
      projectEnvPath: path.join(root, ".env.kibi"),
      legacyEnvPath: path.join(root, ".env"),
      sources: {
        PROC: "process",
        KIBI_WORKSPACE: "process",
        U_ONLY: "user_env",
        SHARED: "project_env",
        USER_LEGACY: "user_env",
        P_ONLY: "project_env",
        L_ONLY: "legacy_env",
        EMPTY_PROC: "legacy_env",
      },
      keysLoadedFromUser: ["U_ONLY", "SHARED", "USER_LEGACY"],
      keysLoadedFromProject: ["SHARED", "P_ONLY"],
      keysLoadedFromLegacy: ["L_ONLY", "EMPTY_PROC"],
    });
    expect(env).toStrictEqual({
      PROC: "process",
      EMPTY_PROC: "legacy",
      KIBI_WORKSPACE: root,
      U_ONLY: "u",
      SHARED: "project",
      USER_LEGACY: "u",
      P_ONLY: "p",
      L_ONLY: "l",
    });
    expect(getLastBootstrapResult()).toBe(null);
  });

  test("keeps values outside the initial process keys without loading over them", () => {
    const { root, xdg } = workspaceWithFiles({
      user: "A=user\n",
      project: "B=project\n",
      legacy: "C=legacy\nD=legacy\n",
    });
    const env: NodeJS.ProcessEnv = {
      A: "already",
      B: "already",
      C: "already",
      D: "kept",
    };
    const result = bootstrapKibiEnvironment({
      env,
      startDir: root,
      xdgConfigHome: xdg,
      initialNonEmptyProcessKeys: new Set(["D", "MISSING"]),
    });
    expect(result.sources).toStrictEqual({
      D: "process",
      A: "user_env",
      B: "project_env",
      C: "legacy_env",
    });
    expect(result.keysLoadedFromUser).toStrictEqual([]);
    expect(result.keysLoadedFromProject).toStrictEqual(["B"]);
    expect(result.keysLoadedFromLegacy).toStrictEqual([]);
    expect(env).toStrictEqual({
      A: "already",
      B: "project",
      C: "already",
      D: "kept",
    });
  });

  test("reads a project env override and treats unreadable files as absent", () => {
    const root = tempDir();
    mkdirSync(path.join(root, ".git"));
    mkdirSync(path.join(root, ".env"));
    write(path.join(root, "conf", "k.env"), "K=v\n");
    const env: NodeJS.ProcessEnv = { KIBI_ENV_FILE: "conf/k.env" };
    const result = bootstrapKibiEnvironment({
      env,
      startDir: root,
      xdgConfigHome: path.join(root, "none"),
    });
    expect(result.workspaceRoot).toBe(discovered(root));
    expect(result.projectEnvPath).toBe(
      path.join(result.workspaceRoot, "conf", "k.env"),
    );
    expect(result.legacyEnvPath).toBe(path.join(result.workspaceRoot, ".env"));
  });

  test("reads the user file under the home directory", () => {
    const root = tempDir();
    mkdirSync(path.join(root, ".kb"));
    write(path.join(root, "home", ".config", "kibi", "env"), "H=home\n");
    const env: NodeJS.ProcessEnv = {};
    const result = bootstrapKibiEnvironment({
      env,
      startDir: root,
      homedir: path.join(root, "home"),
    });
    expect(result.userEnvPath).toBe(
      path.join(root, "home", ".config", "kibi", "env"),
    );
    expect(env).toStrictEqual({ H: "home" });
  });
});

describe("bootstrapKibiEnvironment on process.env", () => {
  function processWorkspace(project: string) {
    const { root, xdg } = workspaceWithFiles({ project });
    setProcessEnv({
      ...WORKSPACE_KEYS,
      XDG_CONFIG_HOME: xdg,
      KIBI_BOOT_A: undefined,
      KIBI_BOOT_B: undefined,
    });
    return { root, xdg };
  }

  test("remembers the first snapshot of process keys", () => {
    const { root } = processWorkspace("KIBI_BOOT_A=file\n");
    setProcessEnv({ KIBI_BOOT_B: "proc" });
    const first = bootstrapKibiEnvironment({ startDir: root });
    expect(process.env.KIBI_BOOT_A).toBe("file");
    expect(first.sources.KIBI_BOOT_A).toBe("project_env");
    expect(first.sources.KIBI_BOOT_B).toBe("process");
    expect(getLastBootstrapResult()).toBe(first);

    // The file value is not a process key on re-entry, so a changed file
    // still applies; a key cleared since is no longer process-owned.
    write(path.join(root, ".env.kibi"), "KIBI_BOOT_A=changed\n");
    setProcessEnv({ KIBI_BOOT_B: "" });
    const second = bootstrapKibiEnvironment({ startDir: root });
    expect(process.env.KIBI_BOOT_A).toBe("changed");
    expect(second.sources.KIBI_BOOT_A).toBe("project_env");
    expect("KIBI_BOOT_B" in second.sources).toBe(false);
    expect(getLastBootstrapResult()).toBe(second);
  });

  test("snapshots the process again for a new workspace", () => {
    const { root } = processWorkspace("KIBI_BOOT_A=file\n");
    bootstrapKibiEnvironment({ startDir: root });
    const other = workspaceWithFiles({ project: "KIBI_BOOT_A=other\n" });
    const again = bootstrapKibiEnvironment({ startDir: other.root });
    expect(again.workspaceRoot).toBe(other.root);
    expect(again.sources.KIBI_BOOT_A).toBe("process");
    expect(process.env.KIBI_BOOT_A).toBe("file");
    const same = bootstrapKibiEnvironment({ startDir: other.root });
    expect(same.sources.KIBI_BOOT_A).toBe("process");
  });

  test("does not remember a snapshot of an injected env", () => {
    const { root } = processWorkspace("KIBI_BOOT_A=file\n");
    setProcessEnv({ KIBI_BOOT_B: "proc" });
    bootstrapKibiEnvironment({ env: { KIBI_WORKSPACE: root }, startDir: root });
    const real = bootstrapKibiEnvironment({ startDir: root });
    expect(real.sources.KIBI_BOOT_B).toBe("process");
  });

  test("forgets the snapshot when reset", () => {
    const { root } = processWorkspace("KIBI_BOOT_A=file\n");
    bootstrapKibiEnvironment({ startDir: root });
    resetKibiEnvironmentBootstrapStateForTests();
    expect(getLastBootstrapResult()).toBe(null);
    const fresh = bootstrapKibiEnvironment({ startDir: root });
    expect(fresh.sources.KIBI_BOOT_A).toBe("process");
  });
});

describe("secret attribution", () => {
  const bootstrap = {
    workspaceRoot: "/w",
    userEnvPath: "/u",
    projectEnvPath: "/p",
    legacyEnvPath: "/l",
    sources: { A: "user_env", B: "project_env" },
    keysLoadedFromUser: [],
    keysLoadedFromProject: [],
    keysLoadedFromLegacy: [],
  } as const;

  test("reads the attributed source while the value is set", () => {
    expect(secretSourceFromBootstrap("A", bootstrap, { A: "x" })).toBe(
      "user_env",
    );
    expect(secretSourceFromBootstrap("A", bootstrap, { A: " " })).toBe(
      "missing",
    );
    expect(secretSourceFromBootstrap("C", bootstrap, { C: "x" })).toBe(
      "process",
    );
    expect(secretSourceFromBootstrap("C", bootstrap, {})).toBe("missing");
    setProcessEnv({ B: "set" });
    expect(secretSourceFromBootstrap("B", bootstrap)).toBe("project_env");
  });

  test("dry-runs the bootstrap on a copy of the env", () => {
    const { root, xdg } = workspaceWithFiles({
      user: "U=u\n",
      project: "P=p\nBLANK=\n",
    });
    const env: NodeJS.ProcessEnv = { KIBI_WORKSPACE: root, X: "x" };
    const options = { env, xdgConfigHome: xdg };
    expect(inspectSecretSource("U", options)).toBe("user_env");
    expect(inspectSecretSource("P", options)).toBe("project_env");
    expect(inspectSecretSource("X", options)).toBe("process");
    expect(inspectSecretSource("BLANK", options)).toBe("missing");
    expect(env).toStrictEqual({ KIBI_WORKSPACE: root, X: "x" });
    expect(
      inspectSecretSource("X", { ...options, initialProcessKeys: new Set() }),
    ).toBe("process");
    expect(
      inspectSecretSource("P", {
        ...options,
        env: { ...env, P: "proc" },
        initialProcessKeys: new Set(["P"]),
      }),
    ).toBe("process");
    expect(
      inspectSecretSource("P", {
        ...options,
        env: { ...env, P: "proc" },
        initialProcessKeys: new Set(["P"]),
        initialNonEmptyProcessKeys: new Set(),
      }),
    ).toBe("project_env");
    expect(isSecretAvailable("P", options)).toBe(true);
    expect(isSecretAvailable("BLANK", options)).toBe(false);
    setProcessEnv({
      ...WORKSPACE_KEYS,
      KIBI_WORKSPACE: root,
      XDG_CONFIG_HOME: xdg,
    });
    expect(isSecretAvailable("P")).toBe(true);
    expect(isSecretAvailable("NONE")).toBe(false);
  });

  test("dry-runs an injected env even after a process bootstrap", () => {
    const { root, xdg } = workspaceWithFiles({ project: "P=p\n" });
    setProcessEnv({
      ...WORKSPACE_KEYS,
      KIBI_WORKSPACE: root,
      XDG_CONFIG_HOME: xdg,
      P: undefined,
      INJECTED: undefined,
    });
    bootstrapKibiEnvironment();
    setProcessEnv({ P: undefined });
    expect(inspectSecretSource("INJECTED", { env: { INJECTED: "x" } })).toBe(
      "process",
    );
    expect(
      inspectSecretSource("P", { env: { KIBI_WORKSPACE: root, P: "proc" } }),
    ).toBe("process");
  });

  test("answers from the last process bootstrap unless options narrow it", () => {
    const { root, xdg } = workspaceWithFiles({ project: "KIBI_BOOT_B=file\n" });
    setProcessEnv({
      ...WORKSPACE_KEYS,
      KIBI_WORKSPACE: root,
      XDG_CONFIG_HOME: xdg,
      KIBI_BOOT_B: undefined,
      KIBI_BOOT_C: "proc",
    });
    bootstrapKibiEnvironment();
    expect(inspectSecretSource("KIBI_BOOT_B")).toBe("project_env");
    // Recorded attribution is read, not the files: a later file is ignored.
    write(path.join(root, ".env.kibi"), "KIBI_BOOT_B=file\nKIBI_BOOT_D=late\n");
    expect(inspectSecretSource("KIBI_BOOT_D")).toBe("missing");
    expect(inspectSecretSource("KIBI_BOOT_D", { startDir: root })).toBe(
      "project_env",
    );
    expect(inspectSecretSource("KIBI_BOOT_D", { xdgConfigHome: xdg })).toBe(
      "project_env",
    );
    expect(inspectSecretSource("KIBI_BOOT_D", { homedir: "/h" })).toBe(
      "project_env",
    );
    expect(
      inspectSecretSource("KIBI_BOOT_D", {
        initialNonEmptyProcessKeys: new Set(),
      }),
    ).toBe("project_env");
    expect(
      inspectSecretSource("KIBI_BOOT_D", { initialProcessKeys: new Set() }),
    ).toBe("project_env");
    expect(process.env.KIBI_BOOT_D).toBe(undefined);
    // The remembered process keys still own KIBI_BOOT_C in a dry run, while
    // the file-loaded KIBI_BOOT_B is not a process key.
    write(path.join(root, ".env.kibi"), "KIBI_BOOT_B=file\nKIBI_BOOT_C=file\n");
    expect(inspectSecretSource("KIBI_BOOT_C", { startDir: root })).toBe(
      "process",
    );
    expect(inspectSecretSource("KIBI_BOOT_B", { startDir: root })).toBe(
      "project_env",
    );
    setProcessEnv({ KIBI_BOOT_C: " " });
    expect(inspectSecretSource("KIBI_BOOT_C", { startDir: root })).toBe(
      "project_env",
    );
  });

  test("snapshots a copy of the process env without a prior bootstrap", () => {
    const { root, xdg } = workspaceWithFiles({ project: "KIBI_BOOT_A=file\n" });
    setProcessEnv({
      ...WORKSPACE_KEYS,
      KIBI_WORKSPACE: root,
      XDG_CONFIG_HOME: xdg,
      KIBI_BOOT_A: "proc",
    });
    expect(inspectSecretSource("KIBI_BOOT_A")).toBe("process");
    expect(getLastBootstrapResult()).toBe(null);
    setProcessEnv({ KIBI_BOOT_A: undefined });
    expect(inspectSecretSource("KIBI_BOOT_A")).toBe("project_env");
    expect(process.env.KIBI_BOOT_A).toBe(undefined);
  });
});

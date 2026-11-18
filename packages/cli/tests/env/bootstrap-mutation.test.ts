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

import { afterEach, beforeAll, describe, expect, test } from "bun:test";
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

// Another file in the same process may have bootstrapped process.env first.
beforeAll(() => resetKibiEnvironmentBootstrapStateForTests());

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
          "H=a=b",
          "=nokey",
          "novalue",
          "I=",
          'J=""',
          'K=x"',
        ].join("\r\n"),
      ),
    ).toStrictEqual([
      { key: "A", value: "1" },
      { key: "B", value: "two words" },
      { key: "C", value: "quoted" },
      { key: "D", value: "single" },
      { key: "H", value: "a=b" },
      { key: "I", value: "" },
      { key: "J", value: "" },
      { key: "K", value: 'x"' },
    ]);
    // A quoted value runs to its closing quote across lines, so the lines of
    // a PEM key or a JSON blob are never read as keys; an unclosed quote runs
    // to the end of the file.
    expect(
      parseEnvContent(
        [
          'PEM="-----BEGIN KEY-----',
          "c2VjcmV0==  ",
          '-----END KEY-----"',
          'JSON=\'{"a":1,',
          ' "token=abc": "y=z"}\'',
          "E=\"mismatch'",
          "after=1",
          'close"',
          "L='x",
          "rest=2",
        ].join("\n"),
      ),
    ).toStrictEqual([
      {
        key: "PEM",
        value: "-----BEGIN KEY-----\nc2VjcmV0==\n-----END KEY-----",
      },
      { key: "JSON", value: '{"a":1,\n "token=abc": "y=z"}' },
      { key: "E", value: "mismatch'\nafter=1\nclose" },
      { key: "L", value: "x\nrest=2" },
    ]);
    expect(parseEnvContent('G="')).toStrictEqual([{ key: "G", value: "" }]);
    expect(parseEnvContent("F='\n'")).toStrictEqual([
      { key: "F", value: "\n" },
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
      user: "U_ONLY_TOKEN=u\nSHARED_TOKEN=user\nPROC_TOKEN=user\nBLANK_U_TOKEN= \nUSER_LEGACY_TOKEN=u\n",
      project:
        'SHARED_TOKEN=project\nP_ONLY_TOKEN=p\nPROC_TOKEN=project\nBLANK_P_TOKEN=""\nUSER_LEGACY_TOKEN=\n',
      legacy:
        "L_ONLY_TOKEN=l\nSHARED_TOKEN=legacy\nP_ONLY_TOKEN=legacy\nPROC_TOKEN=legacy\nUSER_LEGACY_TOKEN=legacy\nBLANK_L_TOKEN=\nEMPTY_PROC_TOKEN=legacy\n",
    });
    const env: NodeJS.ProcessEnv = {
      PROC_TOKEN: "process",
      EMPTY_PROC_TOKEN: " ",
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
        PROC_TOKEN: "process",
        KIBI_WORKSPACE: "process",
        U_ONLY_TOKEN: "user_env",
        SHARED_TOKEN: "project_env",
        USER_LEGACY_TOKEN: "user_env",
        P_ONLY_TOKEN: "project_env",
        L_ONLY_TOKEN: "legacy_env",
        EMPTY_PROC_TOKEN: "legacy_env",
      },
      keysLoadedFromUser: ["U_ONLY_TOKEN", "SHARED_TOKEN", "USER_LEGACY_TOKEN"],
      keysLoadedFromProject: ["SHARED_TOKEN", "P_ONLY_TOKEN"],
      keysLoadedFromLegacy: ["L_ONLY_TOKEN", "EMPTY_PROC_TOKEN"],
      keysIgnoredFromProject: [],
      keysIgnoredFromLegacy: [],
    });
    expect(env).toStrictEqual({
      PROC_TOKEN: "process",
      EMPTY_PROC_TOKEN: "legacy",
      KIBI_WORKSPACE: root,
      U_ONLY_TOKEN: "u",
      SHARED_TOKEN: "project",
      USER_LEGACY_TOKEN: "u",
      P_ONLY_TOKEN: "p",
      L_ONLY_TOKEN: "l",
    });
    expect(getLastBootstrapResult()).toBe(null);
  });

  test("keeps values outside the initial process keys without loading over them", () => {
    const { root, xdg } = workspaceWithFiles({
      user: "A_TOKEN=user\n",
      project: "B_TOKEN=project\n",
      legacy: "C_TOKEN=legacy\nD_TOKEN=legacy\n",
    });
    const env: NodeJS.ProcessEnv = {
      A_TOKEN: "already",
      B_TOKEN: "already",
      C_TOKEN: "already",
      D_TOKEN: "kept",
    };
    const result = bootstrapKibiEnvironment({
      env,
      startDir: root,
      xdgConfigHome: xdg,
      initialNonEmptyProcessKeys: new Set(["D_TOKEN", "MISSING"]),
    });
    expect(result.sources).toStrictEqual({
      D_TOKEN: "process",
      A_TOKEN: "user_env",
      B_TOKEN: "project_env",
      C_TOKEN: "legacy_env",
    });
    expect(result.keysLoadedFromUser).toStrictEqual([]);
    expect(result.keysLoadedFromProject).toStrictEqual(["B_TOKEN"]);
    expect(result.keysLoadedFromLegacy).toStrictEqual([]);
    expect(env).toStrictEqual({
      A_TOKEN: "already",
      B_TOKEN: "project",
      C_TOKEN: "already",
      D_TOKEN: "kept",
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
      BOOT_TEST_A_TOKEN: undefined,
      BOOT_TEST_B_TOKEN: undefined,
    });
    return { root, xdg };
  }

  test("remembers the first snapshot of process keys", () => {
    const { root } = processWorkspace("BOOT_TEST_A_TOKEN=file\n");
    setProcessEnv({ BOOT_TEST_B_TOKEN: "proc" });
    const first = bootstrapKibiEnvironment({ startDir: root });
    expect(process.env.BOOT_TEST_A_TOKEN).toBe("file");
    expect(first.sources.BOOT_TEST_A_TOKEN).toBe("project_env");
    expect(first.sources.BOOT_TEST_B_TOKEN).toBe("process");
    expect(getLastBootstrapResult()).toBe(first);

    // The file value is not a process key on re-entry, so a changed file
    // still applies; a key cleared since is no longer process-owned.
    write(path.join(root, ".env.kibi"), "BOOT_TEST_A_TOKEN=changed\n");
    setProcessEnv({ BOOT_TEST_B_TOKEN: "" });
    const second = bootstrapKibiEnvironment({ startDir: root });
    expect(process.env.BOOT_TEST_A_TOKEN).toBe("changed");
    expect(second.sources.BOOT_TEST_A_TOKEN).toBe("project_env");
    expect("BOOT_TEST_B_TOKEN" in second.sources).toBe(false);
    expect(getLastBootstrapResult()).toBe(second);
  });

  test("snapshots the process again for a new workspace", () => {
    const { root } = processWorkspace("BOOT_TEST_A_TOKEN=file\n");
    bootstrapKibiEnvironment({ startDir: root });
    const other = workspaceWithFiles({ project: "BOOT_TEST_A_TOKEN=other\n" });
    const again = bootstrapKibiEnvironment({ startDir: other.root });
    expect(again.workspaceRoot).toBe(other.root);
    expect(again.sources.BOOT_TEST_A_TOKEN).toBe("process");
    expect(process.env.BOOT_TEST_A_TOKEN).toBe("file");
    const same = bootstrapKibiEnvironment({ startDir: other.root });
    expect(same.sources.BOOT_TEST_A_TOKEN).toBe("process");
  });

  test("does not remember a snapshot of an injected env", () => {
    const { root } = processWorkspace("BOOT_TEST_A_TOKEN=file\n");
    setProcessEnv({ BOOT_TEST_B_TOKEN: "proc" });
    bootstrapKibiEnvironment({ env: { KIBI_WORKSPACE: root }, startDir: root });
    const real = bootstrapKibiEnvironment({ startDir: root });
    expect(real.sources.BOOT_TEST_B_TOKEN).toBe("process");
  });

  test("forgets the snapshot when reset", () => {
    const { root } = processWorkspace("BOOT_TEST_A_TOKEN=file\n");
    bootstrapKibiEnvironment({ startDir: root });
    resetKibiEnvironmentBootstrapStateForTests();
    expect(getLastBootstrapResult()).toBe(null);
    const fresh = bootstrapKibiEnvironment({ startDir: root });
    expect(fresh.sources.BOOT_TEST_A_TOKEN).toBe("process");
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
    keysIgnoredFromProject: [],
    keysIgnoredFromLegacy: [],
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
      user: "U_TOKEN=u\n",
      project: "P_TOKEN=p\nBLANK_TOKEN=\n",
    });
    const env: NodeJS.ProcessEnv = { KIBI_WORKSPACE: root, X_TOKEN: "x" };
    const options = { env, xdgConfigHome: xdg };
    expect(inspectSecretSource("U_TOKEN", options)).toBe("user_env");
    expect(inspectSecretSource("P_TOKEN", options)).toBe("project_env");
    expect(inspectSecretSource("X_TOKEN", options)).toBe("process");
    expect(inspectSecretSource("BLANK_TOKEN", options)).toBe("missing");
    expect(env).toStrictEqual({ KIBI_WORKSPACE: root, X_TOKEN: "x" });
    expect(
      inspectSecretSource("X_TOKEN", {
        ...options,
        initialProcessKeys: new Set(),
      }),
    ).toBe("process");
    expect(
      inspectSecretSource("P_TOKEN", {
        ...options,
        env: { ...env, P_TOKEN: "proc" },
        initialProcessKeys: new Set(["P_TOKEN"]),
      }),
    ).toBe("process");
    expect(
      inspectSecretSource("P_TOKEN", {
        ...options,
        env: { ...env, P_TOKEN: "proc" },
        initialProcessKeys: new Set(["P_TOKEN"]),
        initialNonEmptyProcessKeys: new Set(),
      }),
    ).toBe("project_env");
    expect(isSecretAvailable("P_TOKEN", options)).toBe(true);
    expect(isSecretAvailable("BLANK_TOKEN", options)).toBe(false);
    setProcessEnv({
      ...WORKSPACE_KEYS,
      KIBI_WORKSPACE: root,
      XDG_CONFIG_HOME: xdg,
    });
    expect(isSecretAvailable("P_TOKEN")).toBe(true);
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
    const { root, xdg } = workspaceWithFiles({
      project: "BOOT_TEST_B_TOKEN=file\n",
    });
    setProcessEnv({
      ...WORKSPACE_KEYS,
      KIBI_WORKSPACE: root,
      XDG_CONFIG_HOME: xdg,
      BOOT_TEST_B_TOKEN: undefined,
      BOOT_TEST_C_TOKEN: "proc",
    });
    bootstrapKibiEnvironment();
    expect(inspectSecretSource("BOOT_TEST_B_TOKEN")).toBe("project_env");
    // Recorded attribution is read, not the files: a later file is ignored.
    write(
      path.join(root, ".env.kibi"),
      "BOOT_TEST_B_TOKEN=file\nBOOT_TEST_D_TOKEN=late\n",
    );
    expect(inspectSecretSource("BOOT_TEST_D_TOKEN")).toBe("missing");
    expect(inspectSecretSource("BOOT_TEST_D_TOKEN", { startDir: root })).toBe(
      "project_env",
    );
    expect(
      inspectSecretSource("BOOT_TEST_D_TOKEN", { xdgConfigHome: xdg }),
    ).toBe("project_env");
    expect(inspectSecretSource("BOOT_TEST_D_TOKEN", { homedir: "/h" })).toBe(
      "project_env",
    );
    expect(
      inspectSecretSource("BOOT_TEST_D_TOKEN", {
        initialNonEmptyProcessKeys: new Set(),
      }),
    ).toBe("project_env");
    expect(
      inspectSecretSource("BOOT_TEST_D_TOKEN", {
        initialProcessKeys: new Set(),
      }),
    ).toBe("project_env");
    expect(process.env.BOOT_TEST_D_TOKEN).toBe(undefined);
    // The remembered process keys still own BOOT_TEST_C_TOKEN in a dry run, while
    // the file-loaded BOOT_TEST_B_TOKEN is not a process key.
    write(
      path.join(root, ".env.kibi"),
      "BOOT_TEST_B_TOKEN=file\nBOOT_TEST_C_TOKEN=file\n",
    );
    expect(inspectSecretSource("BOOT_TEST_C_TOKEN", { startDir: root })).toBe(
      "process",
    );
    expect(inspectSecretSource("BOOT_TEST_B_TOKEN", { startDir: root })).toBe(
      "project_env",
    );
    setProcessEnv({ BOOT_TEST_C_TOKEN: " " });
    expect(inspectSecretSource("BOOT_TEST_C_TOKEN", { startDir: root })).toBe(
      "project_env",
    );
  });

  test("snapshots a copy of the process env without a prior bootstrap", () => {
    const { root, xdg } = workspaceWithFiles({
      project: "BOOT_TEST_A_TOKEN=file\n",
    });
    setProcessEnv({
      ...WORKSPACE_KEYS,
      KIBI_WORKSPACE: root,
      XDG_CONFIG_HOME: xdg,
      BOOT_TEST_A_TOKEN: "proc",
    });
    expect(inspectSecretSource("BOOT_TEST_A_TOKEN")).toBe("process");
    expect(getLastBootstrapResult()).toBe(null);
    setProcessEnv({ BOOT_TEST_A_TOKEN: undefined });
    expect(inspectSecretSource("BOOT_TEST_A_TOKEN")).toBe("project_env");
    expect(process.env.BOOT_TEST_A_TOKEN).toBe(undefined);
  });
});

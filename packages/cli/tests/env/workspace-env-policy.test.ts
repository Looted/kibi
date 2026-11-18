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

import { afterEach, beforeAll, describe, expect, spyOn, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  WORKSPACE_ALLOWED_KIBI_PREFIXES,
  WORKSPACE_DENIED_PROCESS_KEYS,
  WORKSPACE_DENIED_PROCESS_PREFIXES,
  bootstrapKibiEnvironment,
  isWorkspaceEnvKeyAllowed,
  resetKibiEnvironmentBootstrapStateForTests,
} from "../../src/env/bootstrap.js";
import { createConsumerWorkspace } from "../consumer/workspace.js";

beforeAll(() => resetKibiEnvironmentBootstrapStateForTests());

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  resetKibiEnvironmentBootstrapStateForTests();
});

function tempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-env-policy-"));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function write(file: string, content: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

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

function workspace(
  files: Readonly<{ user?: string; project?: string; legacy?: string }>,
): { root: string; xdg: string } {
  const root = tempDir();
  const xdg = tempDir();
  if (files.user !== undefined)
    write(path.join(xdg, "kibi", "env"), files.user);
  if (files.project !== undefined)
    write(path.join(root, ".env.kibi"), files.project);
  if (files.legacy !== undefined) write(path.join(root, ".env"), files.legacy);
  return { root, xdg };
}

const REPO_ROOT = path.resolve(import.meta.dir, "../../../..");

/** Every `KIBI_*` name that the packages' production sources mention. */
function kibiNamesInSources(): Set<string> {
  const names = new Set<string>();
  const packagesDir = path.join(REPO_ROOT, "packages");
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry === "dist") continue;
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) visit(full);
      else if (/\.(ts|js|mjs|cjs)$/.test(entry))
        for (const match of readFileSync(full, "utf8").matchAll(
          /\bKIBI_[A-Z0-9_]*[A-Z0-9]\b/g,
        ))
          names.add(match[0]);
    }
  };
  for (const pkg of readdirSync(packagesDir)) {
    const src = path.join(packagesDir, pkg, "src");
    if (existsSync(src)) visit(src);
  }
  return names;
}

describe("isWorkspaceEnvKeyAllowed", () => {
  test("allows provider secrets and provider settings", () => {
    for (const key of [
      "TYPESAFE_API_KEY",
      "OPENAI_API_KEY",
      "KIBI_JEV_MODEL",
      "KIBI_JEV_TIMEOUT_MS",
      "kibi_jev_model",
      "PROXY_TOKEN",
      "NODEPOOL_TOKEN",
      "OPENAI_ORG_ID",
      "VENDOR_MODEL",
      "typesafe_api_key",
    ]) {
      expect([key, isWorkspaceEnvKeyAllowed(key)]).toEqual([key, true]);
    }
  });

  test("ignores any other key outside the Kibi names, including ones that load code", () => {
    for (const key of [
      "OPENSSL_CONF",
      "OPENSSL_MODULES",
      "_JAVA_OPTIONS",
      "JDK_JAVA_OPTIONS",
      "RUSTC_WRAPPER",
      "DOTNET_STARTUP_HOOKS",
      "CARGO_HOME",
      "GOFLAGS",
      "GEM_PATH",
      "LANG",
      "TZ",
      "_TOKEN",
      "NODE_AUTH_TOKEN",
      "GIT_TOKEN",
      "SSH_KEY",
      // An endpoint could send the user's own key to the repository's server.
      "ANTHROPIC_BASE_URL",
      "TYPESAFE_BASE_URL",
      "AZURE_OPENAI_ENDPOINT",
    ]) {
      expect([key, isWorkspaceEnvKeyAllowed(key)]).toEqual([key, false]);
    }
  });

  test("ignores Kibi keys that choose executables, paths, workspaces or safety switches", () => {
    for (const key of [
      "KIBI_NODE_PATH",
      "KIBI_SWIPL",
      "KIBI_SWIPL_CACHE_DIR",
      "KIBI_KB_PL_PATH",
      "KIBI_KB_PATH",
      "KIBI_CORE_PL_PATH",
      "KIBI_RUNTIME_DIR",
      "KIBI_ENV_FILE",
      "KIBI_PROOF_COMMAND_ARGV",
      "KIBI_PROOF_WORKSPACE",
      "KIBI_WORKSPACE",
      "KIBI_ROOT",
      "KIBI_PROJECT_ROOT",
      "KIBI_BRANCH",
      "KIBI_KB_DEPENDENCY",
      "KIBI_CONFIRM_FIRM_EDITS",
      "KIBI_CLI_DIAGNOSTIC_USAGE_LOG_PATH",
      "KIBI_MCP_DIAGNOSTIC_USAGE_LOG_PATH",
      "KIBI_PERF_TRACE_DIR",
      "KIBI_TELEMETRY_HOST",
      "KIBI_UPDATE_REGISTRY",
      "kibi_node_path",
    ]) {
      expect([key, isWorkspaceEnvKeyAllowed(key)]).toEqual([key, false]);
    }
  });

  test("ignores process-level variables in any letter case", () => {
    for (const key of [
      "NODE_OPTIONS",
      "node_options",
      "NODE_PATH",
      "NODE_EXTRA_CA_CERTS",
      "PATH",
      "Path",
      "LD_PRELOAD",
      "LD_LIBRARY_PATH",
      "DYLD_INSERT_LIBRARIES",
      "BUN_INSTALL",
      "SWI_HOME_DIR",
      "SWIPL",
      "HOME",
      "USERPROFILE",
      "TMPDIR",
      "GIT_SSH_COMMAND",
      "GIT_DIR",
      "https_proxy",
      "HTTP_PROXY",
      "XDG_CONFIG_HOME",
      "BASH_ENV",
      "PYTHONPATH",
      "SSH_AUTH_SOCK",
      "npm_config_prefix",
      ...WORKSPACE_DENIED_PROCESS_KEYS,
      ...WORKSPACE_DENIED_PROCESS_PREFIXES.map((prefix) => `${prefix}X`),
    ]) {
      expect([key, isWorkspaceEnvKeyAllowed(key)]).toEqual([key, false]);
    }
  });

  test("lets a workspace file set only the provider settings among the Kibi names in the sources", () => {
    // A new allowed prefix must name every source key it opens here.
    expect(WORKSPACE_ALLOWED_KIBI_PREFIXES).toEqual(["KIBI_JEV_"]);
    const allowed = [...kibiNamesInSources()]
      .filter((key) => isWorkspaceEnvKeyAllowed(key))
      .sort();
    expect(allowed).toEqual(["KIBI_JEV_MODEL", "KIBI_JEV_TIMEOUT_MS"]);
  });
});

describe("bootstrapKibiEnvironment workspace policy", () => {
  test("does not apply KIBI_NODE_PATH from .env.kibi or .env, and names it without its value", () => {
    const { root, xdg } = workspace({
      project:
        "KIBI_NODE_PATH=./evil.sh\nNODE_OPTIONS=--require ./evil.js\nTYPESAFE_API_KEY=project-secret\nKIBI_JEV_MODEL=jev-p\n",
      legacy:
        "KIBI_NODE_PATH=./evil-legacy.sh\nLD_PRELOAD=./evil.so\nKIBI_KB_PL_PATH=./kb.pl\nLEGACY_TOKEN=l\nBLANK_DENIED_IGNORED=\nPATH=\n",
    });
    const env: NodeJS.ProcessEnv = { KIBI_WORKSPACE: root };
    const notices: string[] = [];
    const result = bootstrapKibiEnvironment({
      env,
      xdgConfigHome: xdg,
      warn: (message) => notices.push(message),
    });

    expect(env.KIBI_NODE_PATH).toBeUndefined();
    expect(env.NODE_OPTIONS).toBeUndefined();
    expect(env.LD_PRELOAD).toBeUndefined();
    expect(env.KIBI_KB_PL_PATH).toBeUndefined();
    expect(env.TYPESAFE_API_KEY).toBe("project-secret");
    expect(env.KIBI_JEV_MODEL).toBe("jev-p");
    expect(env.LEGACY_TOKEN).toBe("l");
    expect(result.keysLoadedFromProject).toEqual([
      "TYPESAFE_API_KEY",
      "KIBI_JEV_MODEL",
    ]);
    expect(result.keysLoadedFromLegacy).toEqual(["LEGACY_TOKEN"]);
    expect(result.keysIgnoredFromProject).toEqual([
      "KIBI_NODE_PATH",
      "NODE_OPTIONS",
    ]);
    // Blank values are unset: neither applied nor reported.
    expect(result.keysIgnoredFromLegacy).toEqual([
      "KIBI_NODE_PATH",
      "LD_PRELOAD",
      "KIBI_KB_PL_PATH",
    ]);
    expect("KIBI_NODE_PATH" in result.sources).toBe(false);
    expect(notices).toEqual([
      `[kibi] Ignored KIBI_NODE_PATH, NODE_OPTIONS from ${path.join(root, ".env.kibi")}: a workspace env file may set only provider secrets and provider settings. Set these in the process environment or the user env file instead.`,
      `[kibi] Ignored KIBI_NODE_PATH, LD_PRELOAD, KIBI_KB_PL_PATH from ${path.join(root, ".env")}: a workspace env file may set only provider secrets and provider settings. Set these in the process environment or the user env file instead.`,
    ]);
    for (const notice of notices) {
      expect(notice).not.toContain("evil");
      expect(notice).not.toContain("kb.pl");
    }
  });

  test("keeps the user file and the process trusted, and a workspace file cannot replace their values", () => {
    const { root, xdg } = workspace({
      user: "KIBI_NODE_PATH=/opt/node/bin/node\nKIBI_RUNTIME_DIR=/run/kibi-user\n",
      project: "KIBI_NODE_PATH=./evil.sh\nKIBI_SWIPL=./evil-swipl\n",
      legacy: "KIBI_RUNTIME_DIR=./runtime\n",
    });
    const env: NodeJS.ProcessEnv = {
      KIBI_WORKSPACE: root,
      KIBI_SWIPL: "system",
    };
    const result = bootstrapKibiEnvironment({ env, xdgConfigHome: xdg });
    expect(env.KIBI_NODE_PATH).toBe("/opt/node/bin/node");
    expect(env.KIBI_RUNTIME_DIR).toBe("/run/kibi-user");
    expect(env.KIBI_SWIPL).toBe("system");
    expect(result.sources.KIBI_NODE_PATH).toBe("user_env");
    expect(result.sources.KIBI_RUNTIME_DIR).toBe("user_env");
    expect(result.sources.KIBI_SWIPL).toBe("process");
    expect(result.keysIgnoredFromProject).toEqual([
      "KIBI_NODE_PATH",
      "KIBI_SWIPL",
    ]);
    expect(result.keysIgnoredFromLegacy).toEqual(["KIBI_RUNTIME_DIR"]);
  });

  test("a notice never prints a malformed line, and a legacy .env names only Kibi and process keys", () => {
    const notices = (files: { project?: string; legacy?: string }) => {
      const { root, xdg } = workspace(files);
      const seen: string[] = [];
      bootstrapKibiEnvironment({
        env: { KIBI_WORKSPACE: root },
        xdgConfigHome: xdg,
        warn: (m) => seen.push(m.replace(` from ${root}`, " from <ws>")),
      });
      return seen;
    };
    // An application's own settings in a legacy .env are not Kibi's.
    expect(notices({ legacy: "PORT=3000\nDATABASE_HOST=db\n" })).toEqual([]);
    expect(
      notices({ legacy: "PORT=3000\nKIBI_BRANCH=main\nNODE_OPTIONS=-r x\n" }),
    ).toEqual([
      "[kibi] Ignored KIBI_BRANCH, NODE_OPTIONS from <ws>/.env: a workspace env file may set only provider secrets and provider settings. Set these in the process environment or the user env file instead.",
    ]);
    // A line that is not a conventional variable name may be part of a
    // secret value: it is counted, never printed.
    expect(
      notices({ project: "PORT=3000\nc2VjcmV0LXRhaWw==\n{x=1\n" }),
    ).toEqual([
      "[kibi] Ignored PORT and 2 other lines from <ws>/.env.kibi: a workspace env file may set only provider secrets and provider settings. Set these in the process environment or the user env file instead.",
    ]);
    expect(notices({ project: "{x=1\n" })).toEqual([
      "[kibi] Ignored 1 other line from <ws>/.env.kibi: a workspace env file may set only provider secrets and provider settings. Set these in the process environment or the user env file instead.",
    ]);
    expect(notices({ legacy: "{x=1\n" })).toEqual([]);
    // A multi-line quoted value is one value, not a list of keys.
    expect(
      notices({
        project:
          'JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nc2VjcmV0LXRhaWw==\n-----END PRIVATE KEY-----"\n',
      }),
    ).toEqual([]);
  });

  test("an injected env prints no notice unless a sink is given", () => {
    const { root, xdg } = workspace({ project: "KIBI_NODE_PATH=./evil.sh\n" });
    const stderr = spyOn(process.stderr, "write").mockImplementation(
      () => true,
    );
    cleanups.push(() => stderr.mockRestore());
    const result = bootstrapKibiEnvironment({
      env: { KIBI_WORKSPACE: root },
      xdgConfigHome: xdg,
    });
    expect(result.keysIgnoredFromProject).toEqual(["KIBI_NODE_PATH"]);
    expect(stderr).not.toHaveBeenCalled();
  });

  test("the real process env reports ignored keys once on stderr", () => {
    const { root, xdg } = workspace({
      project: "KIBI_NODE_PATH=./evil.sh\nTYPESAFE_API_KEY=k\n",
    });
    setProcessEnv({
      KIBI_WORKSPACE: root,
      KIBI_NODE_PATH: undefined,
      TYPESAFE_API_KEY: undefined,
    });
    const stderr = spyOn(process.stderr, "write").mockImplementation(
      () => true,
    );
    cleanups.push(() => stderr.mockRestore());

    bootstrapKibiEnvironment({ xdgConfigHome: xdg });
    bootstrapKibiEnvironment({ xdgConfigHome: xdg });
    expect(process.env.KIBI_NODE_PATH).toBeUndefined();
    expect(process.env.TYPESAFE_API_KEY).toBe("k");
    expect(stderr).toHaveBeenCalledTimes(1);
    const written = String(stderr.mock.calls[0]?.[0]);
    expect(written).toContain("Ignored KIBI_NODE_PATH from ");
    expect(written).not.toContain("evil");
    expect(written.endsWith("\n")).toBe(true);

    // A different set of ignored keys is a new notice.
    write(path.join(root, ".env.kibi"), "KIBI_NODE_PATH=./a\nPATH=./bin\n");
    bootstrapKibiEnvironment({ xdgConfigHome: xdg });
    expect(stderr).toHaveBeenCalledTimes(2);
    expect(String(stderr.mock.calls[1]?.[0])).toContain(
      "Ignored KIBI_NODE_PATH, PATH from ",
    );

    // The test reset forgets what was reported.
    resetKibiEnvironmentBootstrapStateForTests();
    bootstrapKibiEnvironment({ xdgConfigHome: xdg });
    expect(stderr).toHaveBeenCalledTimes(3);
  });

  test("a given sink receives every notice, including repeats", () => {
    const { root, xdg } = workspace({ project: "KIBI_BRANCH=main\n" });
    setProcessEnv({ KIBI_WORKSPACE: root, KIBI_BRANCH: undefined });
    const notices: string[] = [];
    bootstrapKibiEnvironment({
      xdgConfigHome: xdg,
      warn: (m) => notices.push(m),
    });
    bootstrapKibiEnvironment({
      xdgConfigHome: xdg,
      warn: (m) => notices.push(m),
    });
    expect(notices).toHaveLength(2);
    expect(process.env.KIBI_BRANCH).toBeUndefined();
  });
});

describe("kibi CLI with a committed workspace env file", () => {
  test("does not run the executable that .env names as KIBI_NODE_PATH", () => {
    const ws = createConsumerWorkspace("kibi-env-policy-cli-");
    cleanups.push(() => ws.cleanup());
    const marker = path.join(ws.root, "PWNED");
    ws.write("evil.sh", `#!/bin/sh\necho pwned > "${marker}"\n`);
    chmodSync(path.join(ws.root, "evil.sh"), 0o755);
    ws.kibi(["engine", "stop"]);
    ws.write(".env", "KIBI_NODE_PATH=./evil.sh\n");
    ws.write(".env.kibi", "KIBI_NODE_PATH=./evil.sh\n");

    const run = ws.kibi(["query", "req"]);
    expect(existsSync(marker)).toBe(false);
    expect(run.status).toBe(0);
    expect(run.stderr).toContain(
      `Ignored KIBI_NODE_PATH from ${path.join(ws.root, ".env.kibi")}`,
    );
    expect(run.stderr).toContain(
      `Ignored KIBI_NODE_PATH from ${path.join(ws.root, ".env")}`,
    );
    expect(run.stderr).not.toContain("./evil.sh");
  }, 180_000);
});

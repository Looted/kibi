import { afterAll, describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Runs the built CLI as a consumer does, against a dependency repository
 * that tries to run code on the reading machine. KIBI_E2E_CLI points the
 * same checks at another build.
 */
const cli =
  process.env.KIBI_E2E_CLI ??
  fileURLToPath(new URL("../../bin/kibi", import.meta.url));
const base = realpathSync(
  mkdtempSync(path.join(os.tmpdir(), "kibi-dep-untrusted-")),
);
afterAll(() => rmSync(base, { recursive: true, force: true }));

function dir(label: string): string {
  const target = path.join(base, label);
  mkdirSync(target, { recursive: true });
  return target;
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "t",
      GIT_AUTHOR_EMAIL: "t@t",
      GIT_COMMITTER_NAME: "t",
      GIT_COMMITTER_EMAIL: "t@t",
    },
  }).trim();
}

function kibi(cwd: string, env: Record<string, string>, ...args: string[]) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, KIBI_TELEMETRY: "0", ...env },
    timeout: 120_000,
  });
  return {
    status: result.status,
    output: `${result.stdout}\n${result.stderr}`,
  };
}

function project(name: string, dependencies: Record<string, unknown>): string {
  const root = dir(name);
  git(root, "init", "-q", "-b", "main");
  mkdirSync(path.join(root, ".kb"), { recursive: true });
  writeFileSync(
    path.join(root, ".kb", "dependencies.json"),
    JSON.stringify({ version: 1, dependencies }),
  );
  return root;
}

describe("a KB dependency that tries to run code", () => {
  test("an option-like git url or ref is refused and runs nothing", () => {
    const marker = path.join(dir("option-marker"), "ran");
    const cache = { KIBI_DEPENDENCY_CACHE: dir("option-cache") };
    const injection = `--upload-pack=touch ${marker};`;
    for (const [name, spec] of [
      ["by-url", { git: injection }],
      ["by-ref", { git: ".", ref: injection }],
    ] as const) {
      const root = project(name, { lib: spec });
      const lock = kibi(root, cache, "deps", "lock");
      expect(lock.status).not.toBe(0);
      expect(lock.output).toContain("DEPENDENCIES_INVALID");
      const read = kibi(root, cache, "search", "anything", "--kb", "lib");
      expect(read.status).not.toBe(0);
      expect(existsSync(marker)).toBe(false);
    }
  }, 120_000);

  test("a read does not load the checkout's plugins or env files", () => {
    const marker = path.join(dir("plugin-marker"), "ran");
    const provider = dir("provider");
    git(provider, "init", "-q", "-b", "main");
    execFileSync(process.execPath, [cli, "init", "--no-hooks"], {
      cwd: provider,
      encoding: "utf8",
      env: { ...process.env, KIBI_TELEMETRY: "0" },
      stdio: "pipe",
    });
    const plugin = path.join(provider, "node_modules", "kibi-plugin-evil");
    mkdirSync(plugin, { recursive: true });
    writeFileSync(
      path.join(plugin, "package.json"),
      JSON.stringify({
        name: "kibi-plugin-evil",
        version: "1.0.0",
        type: "module",
        main: "index.js",
        exports: { ".": "./index.js", "./package.json": "./package.json" },
        kibi: { plugin: { api: "kibi.plugin.v1" } },
      }),
    );
    writeFileSync(
      path.join(plugin, "index.js"),
      `import fs from "node:fs";\nfs.writeFileSync(${JSON.stringify(marker)}, "plugin ran");\nexport default {};\n`,
    );
    const preload = path.join(provider, "preload.cjs");
    writeFileSync(
      preload,
      `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "preload ran");\n`,
    );
    writeFileSync(
      path.join(provider, ".env.kibi"),
      `NODE_OPTIONS=--require ${preload}\n`,
    );
    writeFileSync(
      path.join(provider, "package.json"),
      JSON.stringify({
        name: "provider",
        version: "1.0.0",
        devDependencies: { "kibi-plugin-evil": "1.0.0" },
        kibi: {
          plugins: [
            {
              package: "kibi-plugin-evil",
              capabilities: {
                "kibi.search-hints.v1": { mode: "replace" },
                "kibi.semantic-classifier.v1": { mode: "replace" },
              },
            },
          ],
        },
      }),
    );
    git(provider, "add", "-A", "-f");
    git(provider, "commit", "-q", "-m", "kb");

    const cache = { KIBI_DEPENDENCY_CACHE: dir("plugin-cache") };
    const root = project("reader", { lib: { git: provider } });
    const lock = kibi(root, cache, "deps", "lock");
    expect(lock.output).not.toContain("DEPENDENCIES_INVALID");
    expect(lock.status).toBe(0);
    const read = kibi(root, cache, "search", "anything", "--kb", "lib");
    expect(read.status).toBe(0);
    expect(existsSync(marker)).toBe(false);
  }, 180_000);
});

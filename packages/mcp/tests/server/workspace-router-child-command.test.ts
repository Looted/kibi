import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  defaultResolveChildCommand,
  gitCommonDirectory,
} from "../../src/server/workspace-router.js";

const dirs: string[] = [];
const originalArgv1 = process.argv[1];

afterEach(() => {
  process.argv[1] = originalArgv1 as string;
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = realpathSync(
    mkdtempSync(path.join(tmpdir(), "kibi-router-cmd-")),
  );
  dirs.push(dir);
  return dir;
}

/** A workspace with node_modules/kibi-mcp declaring `bin` and a main entry. */
function workspaceWithInstall(
  manifest: Record<string, unknown>,
  files: readonly string[] = ["bin/kibi-mcp"],
): { root: string; pkg: string } {
  const root = tempDir();
  writeFileSync(path.join(root, "package.json"), '{"name":"ws"}');
  const pkg = path.join(root, "node_modules", "kibi-mcp");
  mkdirSync(path.join(pkg, "dist"), { recursive: true });
  writeFileSync(path.join(pkg, "dist", "server.js"), "");
  for (const file of files) {
    mkdirSync(path.dirname(path.join(pkg, file)), { recursive: true });
    writeFileSync(path.join(pkg, file), "");
  }
  writeFileSync(
    path.join(pkg, "package.json"),
    JSON.stringify({ main: "dist/server.js", ...manifest }),
  );
  return { root, pkg };
}

const selfEntry = () => ({
  command: process.execPath,
  args: [path.resolve(originalArgv1 as string)],
});

describe("defaultResolveChildCommand", () => {
  test("prefers the workspace's own kibi-mcp declared with a string bin", () => {
    const { root, pkg } = workspaceWithInstall({
      name: "kibi-mcp",
      bin: "bin/kibi-mcp",
    });
    expect(defaultResolveChildCommand(root)).toStrictEqual({
      command: process.execPath,
      args: [path.join(pkg, "bin", "kibi-mcp")],
    });
  });

  test("reads a bin map entry named kibi-mcp", () => {
    const { root, pkg } = workspaceWithInstall(
      { name: "kibi-mcp", bin: { "kibi-mcp": "bin/serve" } },
      ["bin/serve"],
    );
    expect(defaultResolveChildCommand(root)).toStrictEqual({
      command: process.execPath,
      args: [path.join(pkg, "bin", "serve")],
    });
  });

  test("walks up from the entry to the package that declares the bin", () => {
    const { root, pkg } = workspaceWithInstall({
      name: "kibi-mcp",
      bin: "bin/kibi-mcp",
    });
    // A nested package.json of another name between entry and package root.
    writeFileSync(
      path.join(pkg, "dist", "package.json"),
      JSON.stringify({ name: "other", type: "module" }),
    );
    expect(defaultResolveChildCommand(root)?.args).toStrictEqual([
      path.join(pkg, "bin", "kibi-mcp"),
    ]);
  });

  for (const [label, manifest, files] of [
    [
      "another package name",
      { name: "not-kibi", bin: "bin/kibi-mcp" },
      undefined,
    ],
    ["no bin", { name: "kibi-mcp" }, undefined],
    ["an empty bin", { name: "kibi-mcp", bin: "" }, undefined],
    [
      "a bin map without kibi-mcp",
      { name: "kibi-mcp", bin: { other: "bin/kibi-mcp" } },
      undefined,
    ],
    [
      "a bin map entry that is not text",
      { name: "kibi-mcp", bin: { "kibi-mcp": 1 } },
      undefined,
    ],
    ["a bin array", { name: "kibi-mcp", bin: ["bin/kibi-mcp"] }, undefined],
    [
      "a bin file that does not exist",
      { name: "kibi-mcp", bin: "bin/missing" },
      undefined,
    ],
  ] as const) {
    test(`falls back to this server's entry for ${label}`, () => {
      const { root } = workspaceWithInstall(
        manifest as Record<string, unknown>,
        files,
      );
      expect(defaultResolveChildCommand(root)).toStrictEqual(selfEntry());
    });
  }

  test("an unreadable manifest is skipped", () => {
    const { root, pkg } = workspaceWithInstall({
      name: "kibi-mcp",
      bin: "bin/kibi-mcp",
    });
    writeFileSync(path.join(pkg, "dist", "package.json"), "{not json");
    expect(defaultResolveChildCommand(root)?.args).toStrictEqual([
      path.join(pkg, "bin", "kibi-mcp"),
    ]);
    writeFileSync(path.join(pkg, "package.json"), "{not json");
    expect(defaultResolveChildCommand(root)).toStrictEqual(selfEntry());
  });

  test("a workspace without package.json or install uses this server's entry", () => {
    const bare = tempDir();
    expect(defaultResolveChildCommand(bare)).toStrictEqual(selfEntry());
    writeFileSync(path.join(bare, "package.json"), "{}");
    expect(defaultResolveChildCommand(bare)).toStrictEqual(selfEntry());
  });

  test("without a usable argv entry it falls back to the packaged bin", () => {
    const bare = tempDir();
    const packaged = fileURLToPath(
      new URL("../../bin/kibi-mcp", import.meta.url),
    );
    process.argv[1] = "";
    expect(defaultResolveChildCommand(bare)).toStrictEqual({
      command: process.execPath,
      args: [packaged],
    });
    process.argv[1] = path.join(bare, "missing-entry.js");
    expect(defaultResolveChildCommand(bare)).toStrictEqual({
      command: process.execPath,
      args: [packaged],
    });
  });

  test("a relative argv entry is resolved", () => {
    const bare = tempDir();
    const relative = path.relative(process.cwd(), originalArgv1 as string);
    process.argv[1] = relative;
    expect(defaultResolveChildCommand(bare)).toStrictEqual(selfEntry());
  });
});

describe("gitCommonDirectory", () => {
  test("names the shared git directory of a repository", () => {
    const repo = tempDir();
    spawnSync("git", ["init", "-q", repo]);
    expect(gitCommonDirectory(repo)).toBe(path.join(repo, ".git"));
    const sub = path.join(repo, "sub");
    mkdirSync(sub);
    expect(gitCommonDirectory(sub)).toBe(path.join(repo, ".git"));
  });

  test("is null outside a repository", () => {
    const plain = tempDir();
    writeFileSync(path.join(plain, ".git"), "gitdir: /nowhere\n");
    expect(gitCommonDirectory(plain)).toBeNull();
  });
});

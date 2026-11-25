import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  authoredSources,
  authoredSourcesSync,
  kbFilesOnDisk,
} from "../../src/vcs/source-inventory.js";
import {
  cleanup,
  gitRepository,
  isolateFromRepositories,
  plainDirectory,
  write,
} from "./vcs-fixtures.js";

beforeEach(isolateFromRepositories);
afterEach(cleanup);

describe("authoredSources", () => {
  test("in a repository the tracked files are listed, under the pathspec only", async () => {
    const root = gitRepository();
    write(root, ".kb/requirements/REQ-a.md", "a");
    write(root, ".kb/requirements/REQ-b.md", "b");
    write(root, "src/a ts.ts", "x");
    execFileSync("git", [
      "-C",
      root,
      "add",
      ".kb/requirements/REQ-a.md",
      "src",
    ]);
    expect(await authoredSources(root)).toStrictEqual({
      kind: "git",
      tracked: new Set([".kb/requirements/REQ-a.md", "src/a ts.ts"]),
    });
    expect(authoredSourcesSync(root, [".kb"])).toStrictEqual({
      kind: "git",
      tracked: new Set([".kb/requirements/REQ-a.md"]),
    });
  });

  test("a repository with nothing tracked lists nothing", async () => {
    const root = gitRepository();
    expect(await authoredSources(root, [".kb"])).toStrictEqual({
      kind: "git",
      tracked: new Set(),
    });
  });

  test("outside any repository every file on disk is input", async () => {
    const root = plainDirectory();
    expect(await authoredSources(root)).toStrictEqual({ kind: "disk" });
    expect(authoredSourcesSync(root, [".kb"])).toStrictEqual({ kind: "disk" });
  });

  test("a repository Git refuses keeps Git's failure", async () => {
    const root = plainDirectory();
    fs.mkdirSync(path.join(root, ".git"));
    await expect(authoredSources(root)).rejects.toThrow();
    expect(() => authoredSourcesSync(root)).toThrow();
  });
});

describe("kbFilesOnDisk", () => {
  test("lists every file under .kb, sorted, dot files included", () => {
    const root = plainDirectory();
    write(root, ".kb/symbols.yaml", "");
    write(root, ".kb/adr/ADR-1.md", "");
    write(root, ".kb/.hidden", "");
    write(root, "README.md", "");
    fs.mkdirSync(path.join(root, ".kb", "empty"));
    expect(kbFilesOnDisk(root)).toEqual([
      ".kb/.hidden",
      ".kb/adr/ADR-1.md",
      ".kb/symbols.yaml",
    ]);
  });
});

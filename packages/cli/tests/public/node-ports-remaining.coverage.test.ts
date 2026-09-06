// implements REQ-014
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs/promises";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { nodeFilesystem, nodeGit } from "../../src/public/operations/node-ports.js";
import {
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
  withCwd,
} from "../helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];
const roots: string[] = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("node-ports remaining snapshot and git helpers", () => {
  test("hashes unreadable snapshot files with their error codes", async () => {
    restores.push(isolateKibiEnv());
    const root = createGitWorkspace();
    roots.push(root);
    writeFileSync(path.join(root, "tracked.ts"), "export const ok = 1;\n");
    execFileSync("git", ["add", "tracked.ts"], { cwd: root, stdio: "ignore" });
    const originalRead = fs.readFile.bind(fs);
    const read = spyOn(fs, "readFile").mockImplementation(async (target, encoding) => {
      if (String(target).endsWith("tracked.ts")) {
        const error = new Error("EACCES");
        (error as Error & { code: string }).code = "EACCES";
        throw error;
      }
      return originalRead(target, encoding as BufferEncoding);
    });
    spies.push(read);
    const snapshot = await nodeGit.workspaceSnapshot?.(root);
    expect(snapshot?.fileCount).toBeGreaterThan(0);
    expect(snapshot?.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  test("revParse, showToplevel, ignoredPaths, and glob cover remaining ports", async () => {
    restores.push(isolateKibiEnv());
    const root = createGitWorkspace();
    roots.push(root);
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(path.join(root, "src", "main.ts"), "export {};\n");
    const branch = await withCwd(root, () =>
      nodeGit.revParse("--abbrev-ref", "HEAD"),
    );
    expect(branch).toBe("main");
    const toplevel = await withCwd(root, () => nodeGit.showToplevel());
    expect(path.resolve(toplevel)).toBe(path.resolve(root));
    const ignored = await nodeGit.ignoredPaths(root, [
      "src/main.ts",
      "node_modules/pkg/index.js",
    ]);
    expect(ignored).toContain("node_modules/pkg/index.js");
    const files = await nodeFilesystem.glob(["src/**/*.ts"], { cwd: root });
    expect(files).toContain("src/main.ts");
  });
});

// implements REQ-014
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import * as fs from "node:fs";
import path from "node:path";
import {
  clearRecoveredPendingSourceReceipts,
  discoverSourceFiles,
} from "../../../src/commands/sync/discovery.js";
import { writePendingSourceReceipt } from "../../../src/operations/mutation/source-authoring.js";
import {
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
} from "../../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) removeTempDir(root);
  if (process.exitCode === 1) process.exitCode = 0;
});

function sha(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

describe("discoverSourceFiles remaining pending coordinate and receipt races", () => {
  test("adds a pending symbol-coordinates manifest that glob discovery missed", async () => {
    restores.push(isolateKibiEnv());
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    const relative = ".kb/symbol-coordinates.yaml";
    const body = "symbols: []\n";
    writeFileSync(path.join(cwd, relative), body);
    writePendingSourceReceipt(cwd, relative, sha(body));
    const result = await discoverSourceFiles(cwd, { trackedOnly: true });
    expect(
      result.manifestFiles.some((file) => file.endsWith("symbol-coordinates.yaml")),
    ).toBe(true);
  });

  test("treats a receipt that vanishes between exists and read as already consumed", () => {
    restores.push(isolateKibiEnv());
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const pendingRoot = path.join(cwd, ".kb", "recovery", "pending-sources");
    mkdirSync(pendingRoot, { recursive: true });
    const receiptPath = path.join(pendingRoot, "race.json");
    const body = `${JSON.stringify({ path: "docs/REQ.md", afterHash: "a".repeat(64) })}\n`;
    writeFileSync(receiptPath, body);
    const originalRead = fs.readFileSync;
    const read = spyOn(fs, "readFileSync").mockImplementation(((
      target: fs.PathOrFileDescriptor,
      options?: unknown,
    ) => {
      if (String(target) === receiptPath) {
        const error = new Error("gone") as NodeJS.ErrnoException;
        error.code = "ENOENT";
        throw error;
      }
      return originalRead(target, options as never);
    }) as typeof fs.readFileSync);
    restores.push(() => read.mockRestore());
    expect(() =>
      clearRecoveredPendingSourceReceipts(cwd, [
        {
          receiptPath,
          path: "docs/REQ.md",
          afterHash: "a".repeat(64),
          rawHash: sha(body),
        },
      ]),
    ).not.toThrow();
  });
});

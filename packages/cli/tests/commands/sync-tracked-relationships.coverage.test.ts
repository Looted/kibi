// implements REQ-003, REQ-007
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SyncError, trackedRelationshipFiles } from "../../src/commands/sync.js";
import {
  createGitWorkspace,
  git,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) removeTempDir(root);
});

function prepared(): string {
  const restoreEnv = isolateKibiEnv();
  restores.push(restoreEnv);
  const cwd = createGitWorkspace();
  roots.push(cwd);
  const relDir = path.join(cwd, ".kb", "relationships");
  mkdirSync(relDir, { recursive: true });
  writeFileSync(
    path.join(relDir, "REQ-A__implements__SYM-A.yaml"),
    "relationships:\n  - type: implements\n    from: SYM-A\n    to: REQ-A\n",
  );
  git(cwd, "add .kb/relationships");
  git(cwd, "commit --no-verify -m 'rel shards'");
  return cwd;
}

function writeReceipt(
  cwd: string,
  name: string,
  body: string | Record<string, unknown>,
): string {
  const pendingRoot = path.join(cwd, ".kb", "recovery", "pending-sources");
  mkdirSync(pendingRoot, { recursive: true });
  const receiptPath = path.join(pendingRoot, name);
  writeFileSync(
    receiptPath,
    typeof body === "string" ? body : `${JSON.stringify(body)}\n`,
  );
  return receiptPath;
}

describe("trackedRelationshipFiles leftover pending-source branches", () => {
  test("skips malformed receipts and recovers or rejects missing relationship shards", () => {
    const cwd = prepared();
    const relDir = path.join(cwd, ".kb", "relationships");
    writeReceipt(cwd, "bad.json", "{not-json");
    writeReceipt(cwd, "skip.json", {
      path: ".kb/requirements/REQ-X.md",
      afterHash: "a".repeat(64),
    });
    writeReceipt(cwd, "incomplete.json", { path: ".kb/relationships/x.yaml" });

    const recovered: Array<{ receiptPath: string; path: string }> = [];
    expect(
      trackedRelationshipFiles(cwd, relDir, true, recovered as never),
    ).toEqual(expect.any(Array));

    const escapeReceipt = writeReceipt(cwd, "escape.json", {
      path: ".kb/relationships/../../../outside.yaml",
      afterHash: "b".repeat(64),
    });
    expect(() => trackedRelationshipFiles(cwd, relDir)).toThrow(SyncError);
    expect(() => trackedRelationshipFiles(cwd, relDir)).toThrow(
      /Pending source path escapes workspace/,
    );
    unlinkSync(escapeReceipt);

    writeReceipt(cwd, "gone.json", {
      path: ".kb/relationships/REQ-GONE__implements__SYM-GONE.yaml",
      afterHash: "c".repeat(64),
    });
    expect(() => trackedRelationshipFiles(cwd, relDir)).toThrow(
      /Pending source is missing/,
    );

    const recoveredMissing: Array<{
      receiptPath: string;
      path: string;
      afterHash: string;
    }> = [];
    trackedRelationshipFiles(cwd, relDir, true, recoveredMissing as never);
    expect(
      recoveredMissing.some((item) =>
        item.path.endsWith("REQ-GONE__implements__SYM-GONE.yaml"),
      ),
    ).toBe(true);

    trackedRelationshipFiles(cwd, relDir, true, recoveredMissing as never);
    const goneCount = recoveredMissing.filter((item) =>
      item.path.endsWith("REQ-GONE__implements__SYM-GONE.yaml"),
    ).length;
    expect(goneCount).toBe(1);
    unlinkSync(path.join(cwd, ".kb", "recovery", "pending-sources", "gone.json"));

    const liveRelative = ".kb/relationships/REQ-A__implements__SYM-A.yaml";
    const driftReceipt = writeReceipt(cwd, "drift.json", {
      path: liveRelative,
      afterHash: "d".repeat(64),
    });
    expect(() => trackedRelationshipFiles(cwd, relDir)).toThrow(/hash drift/);
    unlinkSync(driftReceipt);
    expect(trackedRelationshipFiles(cwd, relDir).some((file) =>
      file.endsWith("REQ-A__implements__SYM-A.yaml"),
    )).toBe(true);
  });
});

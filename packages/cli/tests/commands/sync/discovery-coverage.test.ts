// implements REQ-014
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import * as fs from "node:fs";
import path from "node:path";
import {
  clearRecoveredPendingSourceReceipts,
  discoverSourceFiles,
} from "../../../src/commands/sync/discovery.js";
import { writePendingSourceReceipt } from "../../../src/operations/mutation/source-authoring.js";
import {
  createGitWorkspace,
  git,
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
});

function sha(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

describe("discoverSourceFiles pending receipts and tracked-only paths", () => {
  test("ignores non-json and malformed receipts, then includes pending markdown and symbols", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const pendingRoot = path.join(cwd, ".kb", "recovery", "pending-sources");
    mkdirSync(pendingRoot, { recursive: true });
    writeFileSync(path.join(pendingRoot, "skip.txt"), "nope");
    writeFileSync(path.join(pendingRoot, "broken.json"), "{not json");
    writeFileSync(
      path.join(pendingRoot, "incomplete.json"),
      JSON.stringify({ path: ".kb/requirements/REQ-1.md" }),
    );

    mkdirSync(path.join(cwd, ".kb", "requirements"), { recursive: true });
    const reqBody = `---
id: REQ-PEND
title: Pending
status: open
type: req
---

Body.
`;
    writeFileSync(path.join(cwd, ".kb", "requirements", "REQ-PEND.md"), reqBody);
    writePendingSourceReceipt(
      cwd,
      ".kb/requirements/REQ-PEND.md",
      sha(reqBody),
    );

    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    const symbols = "symbols: []\n";
    writeFileSync(path.join(cwd, ".kb", "symbols.yaml"), symbols);
    writePendingSourceReceipt(cwd, ".kb/symbols.yaml", sha(symbols));

    const result = await discoverSourceFiles(cwd, { trackedOnly: true });
    expect(result.markdownFiles.some((file) => file.endsWith("REQ-PEND.md"))).toBe(
      true,
    );
    expect(result.manifestFiles.some((file) => file.endsWith("symbols.yaml"))).toBe(
      true,
    );
  });

  test("rejects a pending receipt that escapes the workspace", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const pendingRoot = path.join(cwd, ".kb", "recovery", "pending-sources");
    mkdirSync(pendingRoot, { recursive: true });
    writeFileSync(
      path.join(pendingRoot, "escape.json"),
      JSON.stringify({
        path: "../outside.md",
        afterHash: "a".repeat(64),
      }),
    );
    await expect(
      discoverSourceFiles(cwd, { trackedOnly: true }),
    ).rejects.toThrow(/escapes workspace/);
  });

  test("consumes a pending receipt once git tracks the file", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb", "requirements"), { recursive: true });
    const relative = ".kb/requirements/REQ-TRACK.md";
    const body = `---
id: REQ-TRACK
title: Tracked
status: open
type: req
---

Body.
`;
    writeFileSync(path.join(cwd, relative), body);
    writePendingSourceReceipt(cwd, relative, sha(body));
    git(cwd, `add ${relative}`);
    const pendingRoot = path.join(cwd, ".kb", "recovery", "pending-sources");
    writeFileSync(path.join(pendingRoot, "ignore.txt"), "skip");
    writeFileSync(path.join(pendingRoot, "bad.json"), "{");
    const result = await discoverSourceFiles(cwd, { trackedOnly: true });
    expect(result.markdownFiles.some((file) => file.endsWith("REQ-TRACK.md"))).toBe(
      true,
    );
    const leftover = fs
      .readdirSync(pendingRoot)
      .filter((name) => name.endsWith(".json"));
    expect(leftover).toEqual(["bad.json"]);
  });

  test("leaves pending receipts when consumeTrackedPendingReceipts is false", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb", "requirements"), { recursive: true });
    const relative = ".kb/requirements/REQ-KEEP.md";
    const body = `---
id: REQ-KEEP
title: Keep
status: open
type: req
---

Body.
`;
    writeFileSync(path.join(cwd, relative), body);
    writePendingSourceReceipt(cwd, relative, sha(body));
    git(cwd, `add ${relative}`);
    const result = await discoverSourceFiles(cwd, {
      trackedOnly: true,
      consumeTrackedPendingReceipts: false,
    });
    expect(result.markdownFiles.length).toBeGreaterThan(0);
    expect(
      existsSync(path.join(cwd, ".kb", "recovery", "pending-sources")),
    ).toBe(true);
  });
});

describe("clearRecoveredPendingSourceReceipts", () => {
  test("refuses a receipt path outside the recovery root", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    expect(() =>
      clearRecoveredPendingSourceReceipts(cwd, [
        {
          receiptPath: path.join(cwd, "outside.json"),
          path: "docs/REQ.md",
          afterHash: "a".repeat(64),
          rawHash: "b".repeat(64),
        },
      ]),
    ).toThrow(/escapes recovery root/);
  });

  test("skips a receipt that disappeared and refuses a rewritten body", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const pendingRoot = path.join(cwd, ".kb", "recovery", "pending-sources");
    mkdirSync(pendingRoot, { recursive: true });
    const missing = path.join(pendingRoot, "gone.json");
    expect(() =>
      clearRecoveredPendingSourceReceipts(cwd, [
        {
          receiptPath: missing,
          path: "docs/REQ.md",
          afterHash: "a".repeat(64),
          rawHash: "b".repeat(64),
        },
      ]),
    ).not.toThrow();

    const receiptPath = path.join(pendingRoot, "changed.json");
    const raw = `${JSON.stringify({ path: "docs/REQ.md", afterHash: "a".repeat(64) })}\n`;
    writeFileSync(receiptPath, raw);
    expect(() =>
      clearRecoveredPendingSourceReceipts(cwd, [
        {
          receiptPath,
          path: "docs/REQ.md",
          afterHash: "a".repeat(64),
          rawHash: "c".repeat(64),
        },
      ]),
    ).toThrow(/changed during recovery/);
  });

  test("refuses a receipt that became invalid JSON or changed identity", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const pendingRoot = path.join(cwd, ".kb", "recovery", "pending-sources");
    mkdirSync(pendingRoot, { recursive: true });
    const invalid = path.join(pendingRoot, "invalid.json");
    writeFileSync(invalid, "{not json");
    expect(() =>
      clearRecoveredPendingSourceReceipts(cwd, [
        {
          receiptPath: invalid,
          path: "docs/REQ.md",
          afterHash: "a".repeat(64),
          rawHash: sha("{not json"),
        },
      ]),
    ).toThrow(/changed during recovery/);

    const identity = path.join(pendingRoot, "identity.json");
    const body = `${JSON.stringify({ path: "docs/OTHER.md", afterHash: "d".repeat(64) })}\n`;
    writeFileSync(identity, body);
    expect(() =>
      clearRecoveredPendingSourceReceipts(cwd, [
        {
          receiptPath: identity,
          path: "docs/REQ.md",
          afterHash: "a".repeat(64),
          rawHash: sha(body),
        },
      ]),
    ).toThrow(/changed during recovery/);
  });

  test("treats unlink ENOENT as success and wraps other unlink failures", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const pendingRoot = path.join(cwd, ".kb", "recovery", "pending-sources");
    mkdirSync(pendingRoot, { recursive: true });
    const receiptPath = path.join(pendingRoot, "ok.json");
    const body = `${JSON.stringify({ path: "docs/REQ.md", afterHash: "a".repeat(64) })}\n`;
    writeFileSync(receiptPath, body);
    const originalUnlink = unlinkSync;
    const unlink = spyOn(fs, "unlinkSync").mockImplementation(((
      target: fs.PathLike,
    ) => {
      const error = new Error("gone") as NodeJS.ErrnoException;
      error.code = "ENOENT";
      throw error;
    }) as typeof unlinkSync);
    restores.push(() => unlink.mockRestore());
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
    unlink.mockImplementation((() => {
      throw new Error("permission denied");
    }) as typeof unlinkSync);
    writeFileSync(receiptPath, body);
    expect(() =>
      clearRecoveredPendingSourceReceipts(cwd, [
        {
          receiptPath,
          path: "docs/REQ.md",
          afterHash: "a".repeat(64),
          rawHash: sha(body),
        },
      ]),
    ).toThrow(/Failed to retire pending source receipt/);
    expect(originalUnlink).toBeDefined();
    expect(readFileSync(receiptPath, "utf8")).toBe(body);
  });

  test("wraps unexpected read failures while inspecting a receipt", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const pendingRoot = path.join(cwd, ".kb", "recovery", "pending-sources");
    mkdirSync(pendingRoot, { recursive: true });
    const receiptPath = path.join(pendingRoot, "read.json");
    writeFileSync(receiptPath, "{}\n");
    const originalRead = readFileSync;
    const read = spyOn(fs, "readFileSync").mockImplementation(((
      target: fs.PathOrFileDescriptor,
      options?: unknown,
    ) => {
      if (String(target) === receiptPath) {
        throw new Error("EIO");
      }
      return originalRead(target, options as never);
    }) as typeof readFileSync);
    restores.push(() => read.mockRestore());
    expect(() =>
      clearRecoveredPendingSourceReceipts(cwd, [
        {
          receiptPath,
          path: "docs/REQ.md",
          afterHash: "a".repeat(64),
          rawHash: "b".repeat(64),
        },
      ]),
    ).toThrow(/Failed to inspect pending source receipt/);
  });
});

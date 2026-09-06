// implements REQ-014
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import * as fs from "node:fs";
import path from "node:path";
import {
  clearRecoveredPendingSourceReceipts,
  discoverSourceFiles,
  normalizeMarkdownPath,
} from "../../src/commands/sync/discovery.js";
import { writePendingSourceReceipt } from "../../src/operations/mutation/source-authoring.js";
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

function sha(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function prepared(): string {
  const restoreEnv = isolateKibiEnv();
  restores.push(restoreEnv);
  const cwd = createGitWorkspace();
  roots.push(cwd);
  return cwd;
}

describe("discoverSourceFiles leftover pending and README branches", () => {
  test("normalizeMarkdownPath still treats empty and glob inputs as before", () => {
    expect(normalizeMarkdownPath(undefined)).toBeNull();
    expect(normalizeMarkdownPath("")).toBeNull();
    expect(normalizeMarkdownPath("docs/*.md")).toBe("docs/*.md");
  });

  test("ignores README.md and discovers untracked canonical markdown without trackedOnly", async () => {
    const cwd = prepared();
    mkdirSync(path.join(cwd, ".kb", "requirements"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "requirements", "README.md"),
      "# ignore\n",
    );
    writeFileSync(
      path.join(cwd, ".kb", "requirements", "REQ-FREE.md"),
      `---
id: REQ-FREE
title: Free
status: open
type: req
---
`,
    );
    const result = await discoverSourceFiles(cwd);
    expect(result.markdownFiles.some((file) => file.endsWith("README.md"))).toBe(
      false,
    );
    expect(
      result.markdownFiles.some((file) => file.endsWith("REQ-FREE.md")),
    ).toBe(true);
  });

  test("rejects a missing pending source unless recoverMissingPendingSources is set", async () => {
    const cwd = prepared();
    const pendingRoot = path.join(cwd, ".kb", "recovery", "pending-sources");
    mkdirSync(pendingRoot, { recursive: true });
    writeFileSync(
      path.join(pendingRoot, "gone.json"),
      JSON.stringify({
        path: ".kb/requirements/REQ-GONE.md",
        afterHash: "a".repeat(64),
      }),
    );
    await expect(
      discoverSourceFiles(cwd, { trackedOnly: true }),
    ).rejects.toThrow(/Pending source is missing/);
    const recovered = await discoverSourceFiles(cwd, {
      trackedOnly: true,
      recoverMissingPendingSources: true,
    });
    expect(recovered.recoveredPendingReceiptPaths).toHaveLength(1);
    expect(recovered.recoveredPendingReceiptPaths[0]?.path).toBe(
      ".kb/requirements/REQ-GONE.md",
    );
  });

  test("rejects pending source hash drift", async () => {
    const cwd = prepared();
    mkdirSync(path.join(cwd, ".kb", "requirements"), { recursive: true });
    const relative = ".kb/requirements/REQ-DRIFT.md";
    writeFileSync(path.join(cwd, relative), "current\n");
    writePendingSourceReceipt(cwd, relative, "b".repeat(64));
    await expect(
      discoverSourceFiles(cwd, { trackedOnly: true }),
    ).rejects.toThrow(/hash drift/);
  });

  test("keeps a pending untracked markdown file when it is not yet git-tracked", async () => {
    const cwd = prepared();
    mkdirSync(path.join(cwd, ".kb", "requirements"), { recursive: true });
    const relative = ".kb/requirements/REQ-PEND.md";
    const body = `---
id: REQ-PEND
title: Pending
status: open
type: req
---
`;
    writeFileSync(path.join(cwd, relative), body);
    writePendingSourceReceipt(cwd, relative, sha(body));
    const result = await discoverSourceFiles(cwd, { trackedOnly: true });
    expect(result.markdownFiles.some((file) => file.endsWith("REQ-PEND.md"))).toBe(
      true,
    );
  });
});

describe("clearRecoveredPendingSourceReceipts leftover success and ENOENT inspect", () => {
  test("retires an unchanged receipt and treats inspect ENOENT as success", () => {
    const cwd = prepared();
    const pendingRoot = path.join(cwd, ".kb", "recovery", "pending-sources");
    mkdirSync(pendingRoot, { recursive: true });
    const receiptPath = path.join(pendingRoot, "ok.json");
    const body = `${JSON.stringify({
      path: "docs/REQ.md",
      afterHash: "a".repeat(64),
    })}\n`;
    writeFileSync(receiptPath, body);
    clearRecoveredPendingSourceReceipts(cwd, [
      {
        receiptPath,
        path: "docs/REQ.md",
        afterHash: "a".repeat(64),
        rawHash: sha(body),
      },
    ]);
    expect(existsSync(receiptPath)).toBe(false);

    const vanished = path.join(pendingRoot, "race.json");
    writeFileSync(vanished, body);
    const originalRead = readFileSync;
    const read = spyOn(fs, "readFileSync").mockImplementation(((
      target: fs.PathOrFileDescriptor,
      options?: unknown,
    ) => {
      if (String(target) === vanished) {
        throw Object.assign(new Error("gone"), { code: "ENOENT" });
      }
      return originalRead(target, options as never);
    }) as typeof readFileSync);
    restores.push(() => read.mockRestore());
    expect(() =>
      clearRecoveredPendingSourceReceipts(cwd, [
        {
          receiptPath: vanished,
          path: "docs/REQ.md",
          afterHash: "a".repeat(64),
          rawHash: sha(body),
        },
      ]),
    ).not.toThrow();

    const unlinkTarget = path.join(pendingRoot, "unlink-race.json");
    writeFileSync(unlinkTarget, body);
    const originalUnlink = fs.unlinkSync;
    const unlink = spyOn(fs, "unlinkSync").mockImplementation(((
      target: fs.PathLike,
    ) => {
      if (String(target) === unlinkTarget) {
        throw Object.assign(new Error("already gone"), { code: "ENOENT" });
      }
      return originalUnlink(target);
    }) as typeof fs.unlinkSync);
    restores.push(() => unlink.mockRestore());
    expect(() =>
      clearRecoveredPendingSourceReceipts(cwd, [
        {
          receiptPath: unlinkTarget,
          path: "docs/REQ.md",
          afterHash: "a".repeat(64),
          rawHash: sha(body),
        },
      ]),
    ).not.toThrow();
  });
});

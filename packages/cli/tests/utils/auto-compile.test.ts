import {
  afterEach,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as syncModule from "../../src/commands/sync.js";
import { SYNC_COMPILER_FINGERPRINT } from "../../src/commands/sync/cache.js";
import { ensureBranchStoreCompiled } from "../../src/utils/auto-compile.js";
import type { BranchAttachment } from "../../src/utils/branch-resolver.js";
import {
  branchStorePath,
  ensureBranchStoreManifest,
} from "../../src/utils/branch-store-locator.js";

const dirs: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function makeRepoWithHealthyStore(): {
  root: string;
  storePath: string;
  attachment: BranchAttachment;
} {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-auto-compile-"));
  dirs.push(root);
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: root });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: root });

  mkdirSync(path.join(root, ".kb", "requirements"), { recursive: true });
  const reqText = "---\nid: REQ-1\ntitle: One\nstatus: open\n---\n";
  writeFileSync(path.join(root, ".kb", "requirements", "REQ-1.md"), reqText);
  execFileSync("git", ["add", "-A"], { cwd: root });
  execFileSync("git", ["commit", "-qm", "init"], { cwd: root });

  const storePath = ensureBranchStoreManifest(root, "main");
  mkdirSync(path.join(storePath, "rdf"), { recursive: true });
  writeFileSync(path.join(storePath, "storage.json"), '{"mode":"journaled"}\n');
  writeFileSync(path.join(storePath, "CURRENT"), "generation-1:1\n");
  writeFileSync(
    path.join(storePath, "sync-cache.json"),
    JSON.stringify({
      version: 2,
      compilerFingerprint: SYNC_COMPILER_FINGERPRINT,
      hashes: {
        ".kb/requirements/REQ-1.md": sha256(reqText),
      },
      seenAt: {},
      semanticHashes: {},
      semanticContracts: {},
    }),
  );

  const attachment: BranchAttachment = {
    gitBranch: "main",
    kbBranch: "main",
    storePath,
    kind: "exact",
    migrationRequired: false,
  };
  return { root, storePath, attachment };
}

describe("ensureBranchStoreCompiled invariants", () => {
  test("excludes kb_status and kb_apply_plan", async () => {
    const { root, attachment } = makeRepoWithHealthyStore();
    writeFileSync(
      path.join(root, ".kb", "requirements", "REQ-1.md"),
      "---\nid: REQ-1\ntitle: Changed\nstatus: open\n---\n",
    );
    const syncSpy = spyOn(syncModule, "syncCommand").mockResolvedValue({
      success: true,
    } as never);
    restores.push(() => syncSpy.mockRestore());

    expect(
      await ensureBranchStoreCompiled(root, attachment, { name: "kb_status" }),
    ).toBe("not-needed");
    expect(
      await ensureBranchStoreCompiled(root, attachment, {
        name: "kb_apply_plan",
      }),
    ).toBe("not-needed");
    expect(syncSpy).not.toHaveBeenCalled();
  });

  test("a staged check leaves a drifted compiled store as it is", async () => {
    const { root, attachment } = makeRepoWithHealthyStore();
    writeFileSync(
      path.join(root, ".kb", "requirements", "REQ-1.md"),
      "---\nid: REQ-1\ntitle: Changed\nstatus: open\n---\n",
    );
    const syncSpy = spyOn(syncModule, "syncCommand").mockResolvedValue({
      success: true,
    } as never);
    restores.push(() => syncSpy.mockRestore());

    expect(
      await ensureBranchStoreCompiled(root, attachment, {
        name: "kb_check",
        syncDrift: false,
      }),
    ).toBe("not-needed");
    expect(syncSpy).not.toHaveBeenCalled();
    expect(
      await ensureBranchStoreCompiled(root, attachment, { name: "kb_check" }),
    ).toBe("compiled");
    expect(syncSpy).toHaveBeenCalledTimes(1);
  });

  test("shares one single-flight syncCommand call for concurrent drifted reads", async () => {
    const { root, attachment } = makeRepoWithHealthyStore();
    const updated = "---\nid: REQ-1\ntitle: Changed\nstatus: open\n---\n";
    writeFileSync(path.join(root, ".kb", "requirements", "REQ-1.md"), updated);

    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const syncSpy = spyOn(syncModule, "syncCommand").mockImplementation(
      async () => {
        markStarted();
        await gate;
        return { success: true } as never;
      },
    );
    restores.push(() => syncSpy.mockRestore());

    const first = ensureBranchStoreCompiled(root, attachment, {
      name: "kb_query",
    });
    const second = ensureBranchStoreCompiled(root, attachment, {
      name: "kb_search",
    });
    await started;
    expect(syncSpy).toHaveBeenCalledTimes(1);
    expect(syncSpy.mock.calls[0]?.[0]).toMatchObject({
      workspaceRoot: root,
      quiet: true,
      compileOnly: true,
      lockTimeoutMs: 500,
    });
    release();
    expect(await Promise.all([first, second])).toEqual([
      "compiled",
      "compiled",
    ]);
  });

  test("skips untracked .kb files, matching pending receipts, and unchanged extraction failures", async () => {
    const { root, storePath, attachment } = makeRepoWithHealthyStore();
    const syncSpy = spyOn(syncModule, "syncCommand").mockResolvedValue({
      success: true,
    } as never);
    restores.push(() => syncSpy.mockRestore());

    // Untracked file only -> never triggers auto-compile.
    writeFileSync(
      path.join(root, ".kb", "requirements", "REQ-untracked.md"),
      "---\nid: REQ-untracked\ntitle: Untracked\nstatus: open\n---\n",
    );
    expect(
      await ensureBranchStoreCompiled(root, attachment, { name: "kb_query" }),
    ).toBe("not-needed");

    // In-scope pending-sources receipt matching tracked bytes (kb_upsert write) -> not-needed.
    const upserted = "---\nid: REQ-1\ntitle: Upserted\nstatus: open\n---\n";
    writeFileSync(path.join(root, ".kb", "requirements", "REQ-1.md"), upserted);
    const pendingDir = path.join(root, ".kb", "recovery", "pending-sources");
    mkdirSync(pendingDir, { recursive: true });
    writeFileSync(
      path.join(pendingDir, "req1.json"),
      JSON.stringify({
        version: 1,
        path: ".kb/requirements/REQ-1.md",
        afterHash: sha256(upserted),
        branch: "main",
      }),
    );
    expect(
      await ensureBranchStoreCompiled(root, attachment, { name: "kb_query" }),
    ).toBe("not-needed");

    // Remove pending receipt, stamp unchanged extraction failure with matching hash -> skipped.
    rmSync(pendingDir, { recursive: true, force: true });
    writeFileSync(
      path.join(storePath, "sync-cache.json"),
      JSON.stringify({
        version: 2,
        compilerFingerprint: SYNC_COMPILER_FINGERPRINT,
        hashes: {},
        extractionFailures: {
          ".kb/requirements/REQ-1.md": {
            hash: sha256(upserted),
            message: "bad status",
          },
        },
        seenAt: {},
        semanticHashes: {},
        semanticContracts: {},
      }),
    );
    expect(
      await ensureBranchStoreCompiled(root, attachment, { name: "kb_query" }),
    ).toBe("not-needed");
    expect(syncSpy).not.toHaveBeenCalled();
  });

  test("applies failure backoff when syncCommand fails", async () => {
    const { root, attachment } = makeRepoWithHealthyStore();
    writeFileSync(
      path.join(root, ".kb", "requirements", "REQ-1.md"),
      "---\nid: REQ-1\ntitle: Drift\nstatus: open\n---\n",
    );
    const syncSpy = spyOn(syncModule, "syncCommand").mockResolvedValue({
      success: false,
    } as never);
    restores.push(() => syncSpy.mockRestore());

    expect(
      await ensureBranchStoreCompiled(root, attachment, { name: "kb_query" }),
    ).toBe("failed");
    expect(
      await ensureBranchStoreCompiled(root, attachment, { name: "kb_query" }),
    ).toBe("failed");
    expect(syncSpy).toHaveBeenCalledTimes(1);

    const realNow = Date.now;
    const nowSpy = spyOn(Date, "now").mockImplementation(
      () => realNow() + 61_000,
    );
    restores.push(() => nowSpy.mockRestore());
    expect(
      await ensureBranchStoreCompiled(root, attachment, { name: "kb_query" }),
    ).toBe("failed");
    expect(syncSpy).toHaveBeenCalledTimes(2);
  });
});

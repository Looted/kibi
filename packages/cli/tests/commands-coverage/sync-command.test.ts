import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { engineStopCommand } from "../../src/commands/engine.js";
import { initCommand } from "../../src/commands/init.js";
import { stagedNewSourceKeys, syncCommand } from "../../src/commands/sync.js";
import {
  SYNC_CACHE_VERSION,
  SYNC_COMPILER_FINGERPRINT,
  writeSyncCache,
} from "../../src/commands/sync/cache.js";
import * as manifest from "../../src/commands/sync/manifest.js";
import { EngineClient } from "../../src/engine.js";
import { branchStorePath } from "../../src/utils/branch-store-locator.js";
import {
  captureIo,
  createGitWorkspace,
  createTempDir,
  git,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
  withCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(async () => {
  mock.restore();
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) {
    try {
      await withCwd(root, () => engineStopCommand());
    } catch {
      // Fixtures that never started an engine.
    }
    removeTempDir(root);
  }
});

async function initializedWorkspace(): Promise<string> {
  restores.push(isolateKibiEnv());
  const root = createGitWorkspace("main");
  roots.push(root);
  const io = captureIo();
  try {
    await withCwd(root, () => initCommand({}));
  } finally {
    io.restore();
  }
  return root;
}

function write(root: string, relative: string, content: string): void {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
}

function requirement(id: string, extra = ""): string {
  return `---\nid: ${id}\ntitle: ${id} title\nstatus: open\ntype: req\n${extra}---\n\nMust remain independently testable.\n`;
}

const MANIFEST = ".kb/symbols.yaml";

function receiptPath(root: string, relative: string): string {
  return path.join(
    root,
    ".kb",
    "recovery",
    "pending-sources",
    `${createHash("sha256").update(relative).digest("hex")}.json`,
  );
}

describe("stagedNewSourceKeys", () => {
  test("is empty outside a Git repository", () => {
    const dir = createTempDir("kibi-sync-nongit-");
    roots.push(dir);
    expect(stagedNewSourceKeys(dir)).toStrictEqual(new Set());
  });
});

describe("syncCommand validation paths", () => {
  test("refuses an explicit attachment that is not a detached snapshot", async () => {
    const root = await initializedWorkspace();
    const io = captureIo();
    restores.push(io.restore);
    await expect(
      syncCommand({
        workspaceRoot: root,
        validateOnly: true,
        detachedSnapshot: { kind: "branch" } as never,
      }),
    ).rejects.toThrow(
      "Only a detached HEAD snapshot attachment can be compiled explicitly",
    );
  });

  test("points drifted advertised inventories at kibi migrate", async () => {
    const root = await initializedWorkspace();
    write(
      root,
      ".kb/requirements/REQ-DRIFT.md",
      requirement(
        "REQ-DRIFT",
        `semantic_inventory_version: kibi.semantic-inventory.v1\nsemantic_source_field: semantic_text\nsemantic_source_hash: \"${"0".repeat(64)}\"\n`,
      ),
    );
    git(root, "add -A");
    const io = captureIo();
    restores.push(io.restore);
    const failure = await syncCommand({
      workspaceRoot: root,
      validateOnly: true,
    }).catch((error: unknown) => error);
    expect(String(failure)).toContain(
      "Run 'kibi migrate' to re-derive inventories that drifted with the semantic advisor",
    );
    expect(String(failure)).not.toContain("state(s) no inventory");
  }, 60_000);

  test("judges a source the last sync could not extract by its recorded failure", async () => {
    const root = await initializedWorkspace();
    write(root, ".kb/requirements/REQ-FAILED.md", requirement("REQ-FAILED"));
    git(root, "add -A");
    const store = branchStorePath(root, "main");
    mkdirSync(store, { recursive: true });
    writeSyncCache(path.join(store, "sync-cache.json"), {
      version: SYNC_CACHE_VERSION,
      compilerFingerprint: SYNC_COMPILER_FINGERPRINT,
      hashes: {},
      relationshipHashes: {},
      seenAt: {},
      semanticHashes: {},
      semanticContracts: {},
      extractionFailures: {
        ".kb/requirements/REQ-FAILED.md": {
          hash: "a".repeat(64),
          message: "previous failure",
          baseline: true,
        },
      },
    } as never);
    const io = captureIo();
    restores.push(io.restore);
    const result = await syncCommand({
      workspaceRoot: root,
      validateOnly: true,
    });
    expect(result.success).toBe(true);
  }, 60_000);
});

describe("syncCommand write paths", () => {
  function untrackedManifestWithDanglingShard(root: string): void {
    write(root, ".kb/requirements/REQ-DEMO.md", requirement("REQ-DEMO"));
    write(
      root,
      MANIFEST,
      "symbols:\n  - id: SYM-DEMO-A\n    title: a\n    status: active\n  - id: SYM-DEMO-B\n    title: b\n    status: active\n",
    );
    write(
      root,
      ".kb/relationships/00.yaml",
      'relationships:\n  - id: rel-demo\n    type: implements\n    from: SYM-DEMO-A\n    to: REQ-DEMO\n    created_at: "2026-01-01T00:00:00.000Z"\n    created_by: test\n    source: test\n',
    );
    git(root, "add .kb/requirements .kb/relationships");
  }

  test("checks the store before adopting an untracked manifest and names its dangling endpoints", async () => {
    const root = await initializedWorkspace();
    untrackedManifestWithDanglingShard(root);
    const asked: unknown[] = [];
    spyOn(EngineClient.prototype, "queryEntities").mockImplementation((async (
      query: unknown,
    ) => {
      asked.push(query);
      return { count: 0, entities: [] };
    }) as never);
    const io = captureIo();
    restores.push(io.restore);
    await syncCommand({ workspaceRoot: root }).catch(() => undefined);
    expect(asked).toStrictEqual([
      { id: "SYM-DEMO-A", limit: 1, offset: 0 },
      { id: "SYM-DEMO-B", limit: 1, offset: 0 },
    ]);
    expect(existsSync(receiptPath(root, MANIFEST))).toBe(false);
    expect(io.warns.join("\n")).toContain(
      `  Note: SYM-DEMO-A is declared in ${MANIFEST}, which Git does not track and no pending-source receipt covers, so sync ignores it.`,
    );
  }, 120_000);

  test("adopts nothing when the store cannot be read", async () => {
    const root = await initializedWorkspace();
    untrackedManifestWithDanglingShard(root);
    spyOn(EngineClient.prototype, "queryEntities").mockRejectedValue(
      new Error("store unreadable"),
    );
    const io = captureIo();
    restores.push(io.restore);
    await syncCommand({ workspaceRoot: root }).catch(() => undefined);
    expect(existsSync(receiptPath(root, MANIFEST))).toBe(false);
  }, 120_000);

  test("warns and continues when symbol coordinates cannot be refreshed", async () => {
    const root = await initializedWorkspace();
    write(root, MANIFEST, "symbols:\n  - id: SYM-T\n    title: t\n");
    git(root, `add ${MANIFEST}`);
    spyOn(manifest, "refreshManifestCoordinates").mockRejectedValue(
      new Error("extractor offline"),
    );
    const io = captureIo();
    restores.push(io.restore);
    await syncCommand({ workspaceRoot: root }).catch(() => undefined);
    expect(io.warns).toContain(
      `Warning: could not update symbol coordinates for ${MANIFEST}: extractor offline`,
    );
  }, 120_000);
});

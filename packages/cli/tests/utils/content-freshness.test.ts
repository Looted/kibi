// implements REQ-cli-status-pre-first-sync
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { confirmSourceNewerReasons } from "../../src/utils/content-freshness.js";

/**
 * A store compiled before an untracked, upsert-only `.kb/symbols.yaml` was
 * ever visible to sync has no hash for that manifest nor for the code files
 * its symbols reference. The coordinate artifact still records each symbol's
 * source hash, and that evidence alone confirms an mtime-only reason.
 */

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

const SOURCE = "src/export.ts";
const SOURCE_BYTES = "export function exportReport() {\n  return 'csv';\n}\n";

function workspace(coordinateHash: string | null): {
  root: string;
  store: string;
} {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-content-freshness-"));
  roots.push(root);
  const store = path.join(root, ".kb", "branches", "main");
  mkdirSync(store, { recursive: true });
  mkdirSync(path.join(root, "src"), { recursive: true });
  writeFileSync(path.join(root, SOURCE), SOURCE_BYTES);
  writeFileSync(
    path.join(root, ".kb", "symbols.yaml"),
    `symbols:\n  - id: SYM-demo-export-report\n    title: exportReport\n    sourceFile: ${SOURCE}\n`,
  );
  // Markdown only: the manifest and the code file have no cached hash.
  writeFileSync(
    path.join(store, "sync-cache.json"),
    JSON.stringify({
      version: 2,
      hashes: { ".kb/requirements/REQ-demo-export.md": sha256("req") },
      seenAt: {},
    }),
  );
  if (coordinateHash !== null) {
    writeFileSync(
      path.join(root, ".kb", "symbol-coordinates.yaml"),
      [
        "version: 2",
        "coordinates:",
        "  abc123:",
        `    identityHash: ${sha256("identity")}`,
        `    sourceHash: ${coordinateHash}`,
        `    sourceFile: ${SOURCE}`,
        "    sourceLine: 1",
        "",
      ].join("\n"),
    );
  }
  return { root, store };
}

const reason = {
  code: "indexed_source_newer",
  path: SOURCE,
  entityIds: ["SYM-demo-export-report"],
};

describe("confirmSourceNewerReasons", () => {
  test("drops a reason whose file matches the coordinate artifact's source hash although the manifest was never hashed", () => {
    const { root, store } = workspace(sha256(SOURCE_BYTES));
    expect(confirmSourceNewerReasons(root, store, [reason])).toEqual({
      kept: [],
      dropped: [reason],
    });
  });

  test("keeps the reason when the file no longer matches the recorded source hash", () => {
    const { root, store } = workspace(sha256("an older version\n"));
    expect(confirmSourceNewerReasons(root, store, [reason])).toEqual({
      kept: [reason],
      dropped: [],
    });
  });

  test("keeps the reason when neither the cache nor the coordinates record evidence", () => {
    const { root, store } = workspace(null);
    expect(confirmSourceNewerReasons(root, store, [reason])).toEqual({
      kept: [reason],
      dropped: [],
    });
  });
});

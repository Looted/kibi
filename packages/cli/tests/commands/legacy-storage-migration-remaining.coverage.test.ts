// implements REQ-014
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import fg from "fast-glob";
import { planLegacyStorageMigration } from "../../src/commands/legacy-storage-migration.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];
const roots: string[] = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("legacy storage migration remaining glob and duplicate destinations", () => {
  test("normalizes globbed legacy paths and reports colliding destinations", () => {
    restores.push(isolateKibiEnv());
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-legacy-glob-"));
    roots.push(root);
    mkdirSync(path.join(root, ".kb"), { recursive: true });
    mkdirSync(path.join(root, "docs", "reqs"), { recursive: true });
    mkdirSync(path.join(root, "alt", "reqs"), { recursive: true });
    writeFileSync(
      path.join(root, "docs", "reqs", "REQ-GLOB.md"),
      "---\nid: REQ-GLOB\ntype: req\ntitle: Glob\nstatus: active\n---\n\nbody\n",
    );
    writeFileSync(
      path.join(root, "alt", "reqs", "REQ-GLOB.md"),
      "---\nid: REQ-GLOB\ntype: req\ntitle: Alt\nstatus: active\n---\n\nbody\n",
    );
    writeFileSync(
      path.join(root, ".kb", "config.json"),
      JSON.stringify({
        schemaVersion: 4,
        paths: {
          requirements: "docs/reqs/*.md",
          scenarios: "alt/reqs/*.md",
        },
      }),
    );
    const globbed = planLegacyStorageMigration(root);
    expect(globbed.moves.some((move) => move.from.includes("docs/reqs"))).toBe(
      true,
    );

    mkdirSync(path.join(root, "docs", "tests"), { recursive: true });
    mkdirSync(path.join(root, "docs", "requirements"), { recursive: true });
    writeFileSync(
      path.join(root, ".kb", "config.json"),
      JSON.stringify({
        schemaVersion: 4,
        paths: {
          requirements: "docs/reqs",
          tests: "docs/tests",
        },
      }),
    );
    const originalSync = fg.sync.bind(fg);
    spies.push(
      spyOn(fg, "sync").mockImplementation(((patterns: string | string[], options?: unknown) => {
        const glob = String(Array.isArray(patterns) ? patterns[0] : patterns);
        if (glob.includes("docs/reqs")) {
          return [path.join(root, "docs/reqs/REQ-GLOB.md")];
        }
        if (glob.includes("docs/tests")) {
          return [
            path.join(root, "docs/tests", "..", "requirements", "REQ-GLOB.md"),
          ];
        }
        return originalSync(patterns, options as never);
      }) as typeof fg.sync),
    );
    const colliding = planLegacyStorageMigration(root);
    expect(
      colliding.blockers.some((blocker) =>
        blocker.includes("would migrate to"),
      ),
    ).toBe(true);
  });
});

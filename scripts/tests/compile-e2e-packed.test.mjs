import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { preparePackedCompilation } from "../compile-e2e-packed.mjs";

test("packed compilation reuses a snapshot cache and does not run tsc again", async () => {
  const root = mkdtempSync(
    path.join(os.tmpdir(), "kibi-packed-compile-cache-"),
  );
  const calls = [];
  const run = async (command, args) => {
    calls.push([command, ...args]);
    const outDir = args.at(-1);
    writeFileSync(path.join(outDir, "helpers.js"), "export {};\n", "utf8");
  };
  const env = {
    KIBI_E2E_PACK_CACHE_KEY: "snapshot-a",
    KIBI_E2E_PACK_CACHE_ROOT: root,
  };
  try {
    const first = await preparePackedCompilation({
      repoRoot: path.resolve("."),
      env,
      run,
      sourceHash: "abc123",
    });
    const second = await preparePackedCompilation({
      repoRoot: path.resolve("."),
      env,
      run,
      sourceHash: "abc123",
    });
    assert.equal(first.reused, false);
    assert.equal(second.reused, true);
    assert.equal(second.directory, first.directory);
    assert.equal(calls.length, 2);
    assert.equal(
      calls.filter((argv) => argv.some((part) => String(part).includes("tsc")))
        .length,
      1,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

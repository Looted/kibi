import { afterEach, beforeEach, describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getSourceLinkedRequirementIds } from "../src/source-linked-guidance";

describe("source-linked-guidance coverage", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-source-guidance-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns an empty list when the configured symbols path cannot be read", () => {
    fs.mkdirSync(path.join(tmpDir, "documentation", "symbols.yaml"), {
      recursive: true,
    });

    const ids = getSourceLinkedRequirementIds(
      tmpDir,
      path.join(tmpDir, "src", "feature.ts"),
    );

    assert.deepEqual(ids, []);
  });
});

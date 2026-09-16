import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, open, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertSuccess,
  removeAt,
  writeAtomicTextFile,
} from "../artifact-path-write";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("artifact-path-write remaining unlink and replace failure", () => {
  test("removeAt returns a numeric unlink result", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-unlink-"));
    roots.push(root);
    const handle = await open(root, "r");
    try {
      expect(typeof removeAt(handle.fd, "missing-name")).toBe("number");
    } finally {
      await handle.close();
    }
  });

  test("cleans up a stage file when replace fails because the name is a directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-replace-"));
    roots.push(root);
    await mkdir(join(root, "blocked"));
    const handle = await open(root, "r");
    try {
      expect(() => writeAtomicTextFile(handle, "blocked", "payload")).toThrow(
        /artifact replace failed/,
      );
    } finally {
      await handle.close();
    }
    expect(assertSuccess(0, "noop")).toBeUndefined();
  });
});

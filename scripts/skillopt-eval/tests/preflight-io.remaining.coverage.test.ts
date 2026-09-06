// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureInside, parent } from "../preflight-io";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("preflight-io remaining path boundary helpers", () => {
  test("ensureInside rejects escaped and equal paths and parent returns the dirname", () => {
    const root = mkdtempSync(join(tmpdir(), "skillopt-preflight-io-"));
    roots.push(root);
    expect(() => ensureInside(root, root)).toThrow("path-boundary");
    expect(() => ensureInside(root, join(root, "..", "outside"))).toThrow(
      "path-boundary",
    );
    expect(() => ensureInside(root, "/tmp/absolute-outside")).toThrow(
      "path-boundary",
    );
    ensureInside(root, join(root, "nested", "lock.json"));
    expect(parent(join(root, "nested", "lock.json"))).toBe(join(root, "nested"));
  });
});

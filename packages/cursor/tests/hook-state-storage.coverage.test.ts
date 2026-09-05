// implements REQ-cursor-kibi-plugin-v1
// implements REQ-cursor-stop-job-vs-plan
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import fs, { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  emptyHookState,
  loadHookState,
  mergeStringPaths,
  normalizePath,
  resolveStateDir,
  saveHookState,
  updateHookState,
} from "../src/hook-state-storage.js";

const dirs: string[] = [];

afterEach(() => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("cursor hook-state storage", () => {
  test("normalizes paths and merges unique guided paths", () => {
    expect(normalizePath("  a\\b  ")).toBe("a/b");
    expect(mergeStringPaths(["a", ""], ["a", "b", "  "])).toEqual(["a", "b"]);
    expect(emptyHookState().mcpState).toBe("unknown");
  });

  test("resolves state directories and loads empty or invalid state", () => {
    expect(resolveStateDir(undefined, undefined)).toBeUndefined();
    expect(resolveStateDir("/tmp/plugin", "c1")).toBe("/tmp/plugin");
    expect(resolveStateDir(undefined, "conv/id")).toContain("kibi-cursor-hook-state");
    expect(loadHookState(undefined)).toEqual(emptyHookState());
    const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-hook-state-"));
    dirs.push(dir);
    writeFileSync(path.join(dir, "hook-state.json"), "{not-json");
    expect(loadHookState(dir)).toEqual(emptyHookState());
  });

  test("saves, updates, and coerces hook state through the lock", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-hook-state-"));
    dirs.push(dir);
    saveHookState(undefined, emptyHookState());
    const next = updateHookState(dir, (state) => ({
      ...state,
      mcpState: "observed",
      dirtyPaths: ["one", "one", "two"],
      kbCheckRun: true,
      planDelivered: true,
      kbMutationTools: ["kb_upsert"],
    }));
    expect(next.mcpState).toBe("observed");
    expect(loadHookState(dir).dirtyPaths).toEqual(["one", "two"]);
    expect(loadHookState(dir).kbCheckRun).toBe(true);
    expect(updateHookState(undefined, (state) => ({ ...state, kbCheckRun: true })).kbCheckRun).toBe(
      true,
    );
  });

  test("removes a stale lock and continues when the lock is busy", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-hook-lock-"));
    dirs.push(dir);
    const lock = path.join(dir, "hook-state.lock");
    writeFileSync(lock, "stale");
    const ancient = new Date(Date.now() - 60_000);
    utimesSync(lock, ancient, ancient);
    const updated = updateHookState(dir, (state) => ({
      ...state,
      impactCheckRun: true,
    }));
    expect(updated.impactCheckRun).toBe(true);

    const busy = mkdtempSync(path.join(os.tmpdir(), "kibi-hook-busy-"));
    dirs.push(busy);
    writeFileSync(path.join(busy, "hook-state.lock"), "fresh");
    const fallback = updateHookState(busy, (state) => ({
      ...state,
      planDelivered: true,
    }));
    expect(fallback.planDelivered).toBe(true);
  });

  test("rethrows a non-Error from closeSync while releasing the lock", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-hook-close-"));
    dirs.push(dir);
    const close = spyOn(fs, "closeSync").mockImplementation(() => {
      throw "close-failed";
    });
    try {
      expect(() =>
        updateHookState(dir, (state) => ({
          ...state,
          kbCheckRun: true,
        })),
      ).toThrow("close-failed");
    } finally {
      close.mockRestore();
    }
  });

  test("rethrows a non-Error from unlinkSync while releasing the lock", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-hook-unlink-"));
    dirs.push(dir);
    const unlink = spyOn(fs, "unlinkSync").mockImplementation(() => {
      throw "unlink-failed";
    });
    try {
      expect(() =>
        updateHookState(dir, (state) => ({
          ...state,
          impactCheckRun: true,
        })),
      ).toThrow("unlink-failed");
    } finally {
      unlink.mockRestore();
    }
  });
});

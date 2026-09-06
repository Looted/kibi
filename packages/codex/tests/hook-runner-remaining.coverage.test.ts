// implements REQ-codex-kibi-hooks
import { afterEach, describe, expect, test } from "bun:test";
import { runHookCliIfMain } from "../src/hook-runner.js";

afterEach(() => {
  process.exitCode = 0;
});

describe("codex hook runner leftover main gate", () => {
  test("runHookCliIfMain starts only when invoked as CLI", async () => {
    let started = 0;
    await runHookCliIfMain(false, async () => {
      started += 1;
    });
    expect(started).toBe(0);
    await runHookCliIfMain(true, async () => {
      started += 1;
    });
    expect(started).toBe(1);
  });
});

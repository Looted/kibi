// implements REQ-test-journaled-engine-harness
import { afterEach, describe, expect, test } from "bun:test";
import { requestEngineSignalShutdown } from "../src/engine.js";

afterEach(() => {
  process.exitCode = 0;
});

describe("engine leftover signal shutdown helper", () => {
  test("requestEngineSignalShutdown invokes shutdown", () => {
    let called = 0;
    requestEngineSignalShutdown(() => {
      called += 1;
    })();
    expect(called).toBe(1);
  });
});

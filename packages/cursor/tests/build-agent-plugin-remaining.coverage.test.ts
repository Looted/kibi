// implements REQ-cursor-agent-plugin-standard-v1
import { afterEach, describe, expect, test } from "bun:test";
import { runBuildAgentPluginIfMain } from "../scripts/build-agent-plugin.ts";

afterEach(() => {
  process.exitCode = 0;
});

describe("build-agent-plugin leftover main gate", () => {
  test("runBuildAgentPluginIfMain starts only when invoked as main", async () => {
    let started = 0;
    await runBuildAgentPluginIfMain(false, [], async () => {
      started += 1;
    });
    expect(started).toBe(0);
    await runBuildAgentPluginIfMain(true, ["--check"], async () => {
      started += 1;
    });
    expect(started).toBe(1);
  });
});

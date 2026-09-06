// implements REQ-core-journaled-engine-persistence
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as url from "node:url";
import { isEngineDaemonEntrypoint } from "../src/engine-daemon.js";
import { isolateKibiEnv } from "./helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("engine-daemon remaining entrypoint catch", () => {
  test("returns false when the entry path cannot be converted to a file URL", () => {
    restores.push(isolateKibiEnv());
    const spy = spyOn(url, "pathToFileURL").mockImplementation(() => {
      throw new Error("invalid entry");
    });
    spies.push(spy);
    expect(isEngineDaemonEntrypoint(["node", "/tmp/engine-daemon.js"])).toBe(
      false,
    );
  });
});

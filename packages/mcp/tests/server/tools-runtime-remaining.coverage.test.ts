// implements REQ-008
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  DEFAULT_TOOLS_RUNTIME,
  _resetSessionModulePromise,
  _setToolsServerDepsForTests,
} from "../../src/server/tools-runtime.js";

const spies: Array<{ mockRestore: () => void }> = [];
const previousDebug = process.env.KIBI_MCP_DEBUG;

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  _setToolsServerDepsForTests({}, true);
  _resetSessionModulePromise();
  if (previousDebug === undefined) {
    Reflect.deleteProperty(process.env, "KIBI_MCP_DEBUG");
  } else {
    process.env.KIBI_MCP_DEBUG = previousDebug;
  }
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("tools-runtime remaining debug stamp-refresh warning", () => {
  test("logs a stamp refresh failure when MCP debug is enabled", async () => {
    process.env.KIBI_MCP_DEBUG = "1";
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    spies.push(warn);
    const session = {
      activeBranchName: "coverage-branch",
      attachedBranchKbPath: "/tmp/kibi-stamp-debug",
      ensureProlog: async () => ({ query: async () => ({ success: true }) }),
      resetProlog: async () => {},
      inFlightRequests: new Map(),
      isShuttingDown: false,
      prologProcess: { getPid: () => 1 },
      updateAttachedBranchStamp: () => {
        throw new Error("stamp failed");
      },
    };
    _setToolsServerDepsForTests(
      { getSessionModule: async () => session as never },
      true,
    );
    const writeSpec = {
      name: "kb_upsert",
      requiresProlog: false,
      effects: ["kb-write"],
    } as never;
    const context = await DEFAULT_TOOLS_RUNTIME.operationRuntime.open(
      writeSpec,
      {},
    );
    await DEFAULT_TOOLS_RUNTIME.operationRuntime.afterSuccess(
      writeSpec,
      context,
    );
    expect(warn.mock.calls.join(" ")).toContain(
      "Attached branch stamp refresh failed",
    );
  });
});

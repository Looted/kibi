// implements REQ-002
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as runtime from "kibi-runtime";
import { __test__ } from "../src/tools/upsert.js";

const spies: Array<{ mockRestore: () => void }> = [];
const previousDebug = process.env.KIBI_MCP_DEBUG;

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  __test__.setRefreshCoordinatesForSymbolIdForTests(undefined);
  if (previousDebug === undefined) {
    Reflect.deleteProperty(process.env, "KIBI_MCP_DEBUG");
  } else {
    process.env.KIBI_MCP_DEBUG = previousDebug;
  }
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("upsert remaining coordinate-refresh error wrapper", () => {
  test("swallows Error and non-Error refresh failures and warns when debug is on", async () => {
    process.env.KIBI_MCP_DEBUG = "1";
    const warn = spyOn(console, "warn").mockImplementation(() => undefined);
    spies.push(warn);
    let wrapped:
      | ((symbolId: string) => Promise<{ refreshed: boolean; found: boolean }>)
      | undefined;
    spies.push(
      spyOn(runtime, "setSymbolRefreshForTests").mockImplementation((fn) => {
        wrapped = fn as typeof wrapped;
      }),
    );
    __test__.setRefreshCoordinatesForSymbolIdForTests(async () => {
      throw new Error("refresh exploded");
    });
    expect(wrapped).toBeTypeOf("function");
    await expect(wrapped!("SYM-1")).resolves.toEqual({
      refreshed: false,
      found: false,
    });
    expect(warn).toHaveBeenCalled();

    __test__.setRefreshCoordinatesForSymbolIdForTests(async () => {
      throw "string-fail";
    });
    await expect(wrapped!("SYM-2")).resolves.toEqual({
      refreshed: false,
      found: false,
    });
  });
});

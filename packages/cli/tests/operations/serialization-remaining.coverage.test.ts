// implements REQ-kibi-operation-interface-parity
import { afterEach, describe, expect, test } from "bun:test";
import { buildPropertyList } from "../../src/operations/mutation/serialization.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("mutation serialization remaining number and boolean values", () => {
  test("serializes numbers, booleans, and fallback objects", () => {
    restores.push(isolateKibiEnv());
    const properties = buildPropertyList({
      type: "req",
      id: "REQ-SERIAL",
      count: 12,
      enabled: true,
      disabled: false,
      nested: { ok: 1 },
    });
    expect(properties).toContain("count=12");
    expect(properties).toContain("enabled=true");
    expect(properties).toContain("disabled=false");
    expect(properties).toContain("nested=");
  });
});

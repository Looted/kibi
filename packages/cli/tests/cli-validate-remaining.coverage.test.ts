// implements REQ-kibi-operation-interface-parity
import { afterEach, describe, expect, test } from "bun:test";
import { prepareOperationInput } from "../src/cli-validate.js";
import { isolateKibiEnv } from "./helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  process.exitCode = 0;
});

describe("prepareOperationInput remaining non-object input", () => {
  test("rejects a non-object payload before schema validation", () => {
    restores.push(isolateKibiEnv());
    expect(prepareOperationInput(null, { type: "object" })).toEqual({
      valid: false,
      errors: ["input must be an object"],
    });
    expect(prepareOperationInput("x", { type: "object" })).toEqual({
      valid: false,
      errors: ["input must be an object"],
    });
  });
});

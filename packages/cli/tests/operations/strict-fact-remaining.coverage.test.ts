// implements REQ-kibi-operation-interface-parity
import { afterEach, describe, expect, test } from "bun:test";
import { validateFactModelingShape } from "../../src/operations/mutation/strict-fact.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("strict-fact remaining rule_schema length mismatch", () => {
  test("rejects argument_names and argument_types of different lengths", () => {
    restores.push(isolateKibiEnv());
    expect(() =>
      validateFactModelingShape({
        type: "fact",
        fact_kind: "rule_schema",
        rule_name: "owns",
        argument_names: ["subject"],
        argument_types: ["atom", "atom"],
      }),
    ).toThrow(/equal lengths/);
  });
});

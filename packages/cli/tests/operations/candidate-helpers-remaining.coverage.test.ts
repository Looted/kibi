// implements REQ-KIBI-BOOTSTRAP-PLAN
import { afterEach, describe, expect, test } from "bun:test";
import { strictPlan } from "../../src/operations/bootstrap/candidate-helpers.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("candidate-helpers remaining observation write-set", () => {
  test("strictPlan emits only the observation fact when the write set is not strict", () => {
    restores.push(isolateKibiEnv());
    const planned = strictPlan({
      isStrict: false,
      confidence: 0.4,
      relationships: [],
      observationFact: {
        type: "fact",
        id: "FACT-OBS-1",
        properties: {
          id: "FACT-OBS-1",
          title: "Observed claim",
          status: "active",
          source: ".kb/facts/FACT-OBS-1.md",
          fact_kind: "observation",
        },
      },
    });
    expect(planned).toEqual([
      {
        type: "fact",
        id: "FACT-OBS-1",
        properties: {
          id: "FACT-OBS-1",
          title: "Observed claim",
          status: "active",
          source: ".kb/facts/FACT-OBS-1.md",
          fact_kind: "observation",
        },
        relationships: [],
      },
    ]);
  });
});

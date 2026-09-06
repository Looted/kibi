// implements REQ-mcp-semantic-advisor-preflight
import { afterEach, describe, expect, test } from "bun:test";
import { observationPlan } from "../../src/operations/semantic-advisor/observation-plan.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("observation-plan remaining nonlogical review target", () => {
  test("links a nonlogical observation to review:nonlogical", () => {
    restores.push(isolateKibiEnv());
    const [fact] = observationPlan(
      { type: "req", id: "REQ-OBS", properties: { text_ref: "narrative only" } },
      "Observation",
      ["review:nonlogical"],
    );
    expect(fact?.relationships).toEqual([
      expect.objectContaining({
        type: "relates_to",
        to: "review:nonlogical",
      }),
    ]);
  });
});

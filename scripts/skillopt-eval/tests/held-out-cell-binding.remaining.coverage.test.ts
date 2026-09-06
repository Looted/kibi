// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, test } from "bun:test";
import { contractHash, JsonValueSchema } from "../contracts/common";
import type { EpisodeRequest } from "../contracts/episode";
import {
  bindPhysicalCells,
  predicateGate,
  predicateReplicateFor,
  skillGate,
} from "../held-out-cell-binding";
import type { BoundPhysicalCell } from "../held-out-cell-binding";
import { receipt, request } from "./held-out-evaluation-test-helpers";

afterEach(() => {
  if (process.exitCode === 1) process.exitCode = 0;
});

const HASHES = {
  baseline: "a".repeat(64),
  "one-shot": "b".repeat(64),
  skillopt: "c".repeat(64),
} as const;

function bound(status: string, extras: Partial<BoundPhysicalCell> = {}): BoundPhysicalCell {
  const req = request({
    episode: 1,
    taskId: "task-1",
    variant: "skillopt",
    hashes: HASHES,
    replicate: 2,
  });
  const parsedReceipt = receipt(req, false);
  return {
    kind: "predicate",
    taskId: "task-1",
    family: "deny_polarity",
    request: { ...req, replicate: 2 },
    receipt: {
      ...parsedReceipt,
      result: {
        ...parsedReceipt.result,
        status: status as never,
        hardPass: false,
        score: 10,
      },
    },
    ...extras,
  };
}

describe("held-out-cell-binding remaining terminal categories and parse misses", () => {
  test("maps every terminal status and drops cells that fail schema binding", () => {
    expect(predicateReplicateFor(bound("completed").request)).toBe(2);
    const statuses = [
      "completed",
      "behavioral-failure",
      "infrastructure-failure",
      "interrupted",
      "budget-exhausted",
      "evidence-conflict",
      "not-a-status",
    ];
    for (const status of statuses) {
      expect(() => skillGate([bound(status)], [])).not.toThrow();
    }
    expect(predicateGate([bound("completed")]).eligibility).toBeDefined();
    expect(
      bindPhysicalCells([
        {
          kind: "skill",
          taskId: "bad",
          family: "x",
          request: { nope: true } as never,
          receipt: { nope: true } as never,
        },
      ]),
    ).toEqual([]);
    const req = request({
      episode: 2,
      taskId: "task-2",
      variant: "baseline",
      hashes: HASHES,
    }) as EpisodeRequest;
    expect(contractHash(JsonValueSchema.parse({ ok: true }))).toHaveLength(64);
    expect(req.replicate).toBeUndefined();
    expect(predicateReplicateFor(req)).toBeNull();
  });
});

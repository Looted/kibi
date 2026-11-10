import { describe, expect, test } from "bun:test";
import {
  isBlockingWitness,
  parseWhatIfAnalysis,
} from "../../../src/operations/mutation/what-if.js";

describe("parseWhatIfAnalysis", () => {
  test("reads an analysis object and normalizes its witnesses", () => {
    const raw = JSON.stringify({
      after: [
        {
          requirements: ["kb:entity/REQ-1", 2],
          reason: "  clash  ",
          status: " infeasible ",
          kind: "rule",
          extra: true,
        },
        "not a witness",
        ["nor", "this"],
        null,
      ],
      introduced: [{ reason: 7, status: "   ", kind: 3 }],
      removed: [{}],
      unchanged: "none",
    });
    expect(parseWhatIfAnalysis(raw)).toStrictEqual({
      after: [
        {
          requirements: ["REQ-1", "2"],
          reason: "clash",
          status: "infeasible",
          kind: "rule",
          extra: true,
        },
      ],
      introduced: [{ requirements: [], reason: "", status: "contradiction" }],
      removed: [{ requirements: [], reason: "", status: "contradiction" }],
      unchanged: [],
    });
  });

  test("decodes a JSON-encoded string once more", () => {
    const inner = JSON.stringify([{ requirements: ["A"], reason: "r" }]);
    const witness = {
      requirements: ["A"],
      reason: "r",
      status: "contradiction",
    };
    expect(parseWhatIfAnalysis(JSON.stringify(inner))).toStrictEqual({
      after: [witness],
      introduced: [witness],
      removed: [],
      unchanged: [],
    });
  });

  test("returns null for unreadable output", () => {
    expect(parseWhatIfAnalysis(42)).toBeNull();
    expect(parseWhatIfAnalysis(["[]"])).toBeNull();
    expect(parseWhatIfAnalysis("{")).toBeNull();
    expect(parseWhatIfAnalysis(JSON.stringify("{"))).toBeNull();
    expect(parseWhatIfAnalysis("null")).toBeNull();
    expect(parseWhatIfAnalysis("3")).toBeNull();
  });
});

describe("isBlockingWitness", () => {
  test("blocks contradictions and infeasible scenarios only", () => {
    const w = (status?: string) => ({ requirements: [], reason: "", status });
    expect(isBlockingWitness(w("contradiction"))).toBe(true);
    expect(isBlockingWitness(w("infeasible"))).toBe(true);
    expect(isBlockingWitness(w("possible"))).toBe(false);
    expect(isBlockingWitness(w())).toBe(false);
  });
});

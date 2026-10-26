import { describe, expect, test } from "bun:test";

import {
  type RequirementView,
  matchesReportView,
  reportFilterCounts,
} from "../../src/report/report-view.js";

const rows: RequirementView[] = [
  {
    text: "REQ-1 Password Reset",
    states: ["tested", "proved"],
    earliestGate: "tested",
  },
  {
    text: "REQ-2 Trial Duration",
    states: ["attention", "contradiction", "stale", "below_floor"],
    earliestGate: "semantic",
  },
  {
    text: "REQ-3 Checkout",
    states: ["attention", "pending_reproof"],
    earliestGate: "implementation",
  },
];

describe("report view matching", () => {
  test("counts come from the same classification used for filters", () => {
    expect(reportFilterCounts(rows)).toEqual({
      all: 3,
      proved: 1,
      tested: 1,
      attention: 2,
      below_floor: 1,
      pending_reproof: 1,
      stale: 1,
      contradiction: 1,
    });
  });

  test("the below-floor filter selects only requirements under their floor", () => {
    expect(
      rows
        .filter((row) =>
          matchesReportView(row, {
            query: "",
            filter: "below_floor",
            gate: "all",
          }),
        )
        .map((row) => row.text),
    ).toEqual(["REQ-2 Trial Duration"]);
  });

  test("composes text search with filters and proof-gate selection", () => {
    expect(
      rows
        .filter((row) =>
          matchesReportView(row, {
            query: "",
            filter: "all",
            gate: "semantic",
          }),
        )
        .map((row) => row.text),
    ).toEqual(["REQ-2 Trial Duration"]);
    expect(
      rows.filter((row) =>
        matchesReportView(row, {
          query: "trial",
          filter: "attention",
          gate: "all",
        }),
      ),
    ).toHaveLength(1);
    expect(
      rows.filter((row) =>
        matchesReportView(row, {
          query: "password",
          filter: "attention",
          gate: "all",
        }),
      ),
    ).toHaveLength(0);
    expect(
      rows.filter((row) =>
        matchesReportView(row, {
          query: "missing",
          filter: "all",
          gate: "all",
        }),
      ),
    ).toHaveLength(0);
  });
});

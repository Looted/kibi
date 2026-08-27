import { describe, expect, test } from "bun:test";

import {
  type RequirementView,
  matchesReportView,
  reportFilterCounts,
} from "../../src/report/report-view.js";

const rows: RequirementView[] = [
  {
    text: "REQ-1 Password Reset",
    states: ["proven"],
    earliestGate: "proven",
  },
  {
    text: "REQ-2 Trial Duration",
    states: ["attention", "contradiction", "stale"],
    earliestGate: "semantic",
  },
  {
    text: "REQ-3 Checkout",
    states: ["attention"],
    earliestGate: "implementation",
  },
];

describe("report view matching", () => {
  test("counts come from the same classification used for filters", () => {
    expect(reportFilterCounts(rows)).toEqual({
      all: 3,
      proven: 1,
      attention: 2,
      stale: 1,
      contradiction: 1,
    });
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

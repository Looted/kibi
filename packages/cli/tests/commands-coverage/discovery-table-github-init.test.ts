import { describe, expect, test } from "bun:test";
import { renderCoverageTable } from "../../src/commands/discovery-table.js";
import { detectReadmePath } from "../../src/commands/github-init.js";

describe("coverage table evidence cell", () => {
  test("shows proved claim counts only when claims apply", () => {
    const row = (id: string, claimSummary: unknown) => ({
      id,
      scenarioCount: 1,
      evidenceLevel: "L1",
      claimSummary,
    });
    const rendered = renderCoverageTable({
      summary: { total: 3 },
      rows: [
        row("REQ-A", { applicable: 2, proved: 1 }),
        row("REQ-B", { applicable: 3, proved: "unknown" }),
        row("REQ-C", { applicable: 0, proved: 0 }),
        row("REQ-D", { applicable: "2" }),
      ],
    });
    expect(rendered).toContain("1/2");
    expect(rendered).toContain("0/3");
    expect(rendered).not.toContain("/0");
    expect(rendered.match(/claims/g)).toHaveLength(2);
  });
});

describe("detectReadmePath", () => {
  test("returns undefined when the directory cannot be listed", () => {
    expect(detectReadmePath("/nonexistent/kibi/readme/dir")).toBeUndefined();
  });
});

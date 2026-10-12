// implements REQ-kibi-operation-interface-parity
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  type ConsumerWorkspace,
  type Json,
  checkViolations,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * A production symbol needs a covered_by edge to a test of its requirement,
 * or kb_check reports symbol-coverage. The upsert (dry run and write) says so
 * up front instead of the agent learning it from the next check.
 */

let workspace: ConsumerWorkspace;

beforeAll(() => {
  workspace = createConsumerWorkspace("kibi-symbol-coverage-warning-");
  workspace.write(
    ".kb/requirements/REQ-demo-export.md",
    doc(
      "id: REQ-demo-export\ntitle: Users can export reports\nstatus: open",
      "## Context\n\nReports export as CSV.\n",
    ),
  );
  workspace.write(
    ".kb/requirements/REQ-demo-export-format.md",
    doc(
      "id: REQ-demo-export-format\ntitle: Exported reports are CSV\nstatus: open",
      "## Context\n\nThe export format is CSV.\n",
    ),
  );
  workspace.write(
    ".kb/tests/TEST-demo-export.md",
    doc(
      "id: TEST-demo-export\ntitle: Export returns CSV\nstatus: active",
      "Calls exportReport and checks the CSV.\n",
    ),
  );
  writeFileSync(
    path.join(workspace.root, "export.ts"),
    "export function exportReport() {\n  return 'csv';\n}\n",
  );
  workspace.git("add", ".kb", "export.ts");
  workspace.text(["sync"]);
}, 300_000);

afterAll(() => workspace?.cleanup());

const COVERAGE_WARNING = "kb_check will report symbol-coverage";

function symbol(
  id: string,
  relationships: ReadonlyArray<{ type: string; to: string }>,
  dryRun: boolean,
): Json {
  return {
    type: "symbol",
    id,
    properties: {
      title: "exportReport",
      status: "active",
      sourceFile: "export.ts",
    },
    relationships: relationships.map((relationship) => ({
      ...relationship,
      from: id,
    })),
    ...(dryRun ? { dryRun: true } : {}),
  };
}

function upsert(input: Json): { status: unknown; data: Json } {
  return workspace.json(["upsert"], input) as { status: unknown; data: Json };
}

function coverageWarnings(result: { data: Json }): string[] {
  return ((result.data.warnings ?? []) as string[]).filter((warning) =>
    warning.includes("symbol-coverage"),
  );
}

describe("kb_upsert of a production symbol without covered_by", () => {
  test("the dry run warns once that kb_check will report symbol-coverage, and the write and the check agree", () => {
    const id = "SYM-demo-export-report";
    const implementsOnly = [{ type: "implements", to: "REQ-demo-export" }];
    const preview = upsert(symbol(id, implementsOnly, true));
    expect(preview.status).toBe("success");
    expect(preview.data.valid).toBe(true);
    const warnings = coverageWarnings(preview);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(`Production symbol ${id}`);
    expect(warnings[0]).toContain(COVERAGE_WARNING);
    expect(warnings[0]).toContain("covered_by: TEST-<area>-<behavior>");

    const written = upsert(symbol(id, implementsOnly, false));
    expect(written.status, JSON.stringify(written)).toBe("success");
    expect(coverageWarnings(written)).toEqual(warnings);
    expect(
      checkViolations(workspace, "symbol-coverage").map(
        (violation) => violation.entityId,
      ),
    ).toContain(id);
  }, 300_000);

  test("a covered_by edge in the payload gives no warning", () => {
    const preview = upsert(
      symbol(
        "SYM-demo-export-covered",
        [
          { type: "implements", to: "REQ-demo-export" },
          { type: "covered_by", to: "TEST-demo-export" },
        ],
        true,
      ),
    );
    expect(preview.data.valid).toBe(true);
    expect(coverageWarnings(preview)).toEqual([]);
  }, 300_000);

  test("an executable_for edge in the payload gives no warning", () => {
    const preview = upsert(
      symbol(
        "SYM-demo-export-executable",
        [
          { type: "implements", to: "REQ-demo-export" },
          { type: "executable_for", to: "TEST-demo-export" },
        ],
        true,
      ),
    );
    expect(coverageWarnings(preview)).toEqual([]);
  }, 300_000);

  test("an existing symbol with a stored covered_by edge gives no warning when an upsert adds only implements", () => {
    const id = "SYM-demo-export-stored";
    const created = upsert(
      symbol(
        id,
        [
          { type: "implements", to: "REQ-demo-export" },
          { type: "covered_by", to: "TEST-demo-export" },
        ],
        false,
      ),
    );
    expect(created.status, JSON.stringify(created)).toBe("success");
    const addImplements = [
      { type: "implements", to: "REQ-demo-export-format" },
    ];
    const preview = upsert(symbol(id, addImplements, true));
    expect(preview.data.valid).toBe(true);
    expect(coverageWarnings(preview)).toEqual([]);
    const written = upsert(symbol(id, addImplements, false));
    expect(written.status, JSON.stringify(written)).toBe("success");
    expect(coverageWarnings(written)).toEqual([]);
  }, 300_000);
});

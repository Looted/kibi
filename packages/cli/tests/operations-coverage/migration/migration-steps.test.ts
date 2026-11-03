import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { planEntityTypeBackfill } from "../../../src/operations/migration/entity-type.js";
import {
  planEvidenceFloorPins,
  readLadderFloorVerdicts,
} from "../../../src/operations/migration/evidence-floor.js";
import * as kbSources from "../../../src/operations/migration/kb-sources.js";
import { applyOriginBackfill } from "../../../src/operations/migration/origin-backfill.js";
import { applyRequirementStatusMapping } from "../../../src/operations/migration/requirement-status.js";
import {
  coordinateRefreshFailureMessage,
  refreshCoordinatesAfterMigration,
} from "../../../src/operations/migration/symbol-coordinates-refresh.js";
import * as evidenceFloorRows from "../../../src/public/operations/evidence-floor.js";
import * as runtimeTypes from "../../../src/public/operations/runtime-types.js";
import { scratch } from "../helpers.js";

const spies: { mockRestore: () => void }[] = [];
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function workspace(files: Record<string, string> = {}): string {
  const ws = scratch(files);
  cleanups.push(ws.cleanup);
  return ws.root;
}

describe("migration steps on authored files", () => {
  test("leave a file whose front matter does not parse to its checks", () => {
    const root = workspace({
      ".kb/requirements/REQ-bad.md": "---\nid: [unclosed\n---\n",
    });
    expect(planEntityTypeBackfill(root).targets).toStrictEqual([]);
  });

  test("refuse a status mapping once the status changed", () => {
    const root = workspace({
      ".kb/requirements/REQ-a.md": "---\nid: REQ-a\nstatus: closed\n---\n",
    });
    expect(() =>
      applyRequirementStatusMapping(
        root,
        ".kb/requirements/REQ-a.md",
        "open",
        "active",
      ),
    ).toThrow(
      ".kb/requirements/REQ-a.md no longer has status open; rerun kibi migrate and approve the new plan.",
    );
  });

  test("skip a file it cannot read when backfilling origins", () => {
    const root = workspace({
      ".kb/requirements/REQ-a.md": "---\nid: REQ-a\ntype: req\n---\n",
    });
    spies.push(spyOn(kbSources, "readText").mockReturnValue(null));
    expect(
      applyOriginBackfill(root, "2026-09-05T00:00:00.000Z").skipped,
    ).toStrictEqual([
      { path: ".kb/requirements/REQ-a.md", reason: "unreadable" },
    ]);
  });

  test("skip a firm requirement whose evidence floor cannot be set in place", () => {
    const root = workspace({
      ".kb/requirements/REQ-firm.md":
        // Indented as a whole, so a key appended at column 0 does not parse.
        "---\n  id: REQ-firm\n  title: Firm\n  type: req\n  status: open\n---\nOrders must ship within two days.\n",
    });
    expect(planEvidenceFloorPins(root).skipped).toStrictEqual([
      {
        id: "REQ-firm",
        path: ".kb/requirements/REQ-firm.md",
        reason: "required_evidence could not be edited safely",
      },
    ]);
  });

  test("read the ladder verdicts of requirements whose floor is tested", async () => {
    spies.push(
      spyOn(runtimeTypes, "executeOperation").mockImplementation((async (
        _runtime: unknown,
        spec: {
          name: string;
          execute: (input: unknown, context: unknown) => unknown;
        },
      ) =>
        spec.name === "kb_migrate_evidence_floor_preview"
          ? spec.execute({}, {})
          : {
              structuredContent: {
                branchStore: { state: "healthy" },
                snapshotId: "snap",
                branchAttachment: { kind: "exact" },
              },
            }) as never),
      spyOn(evidenceFloorRows, "readEvidenceFloorRows").mockResolvedValue([
        { id: "REQ-a", requiredEvidence: "tested", status: "below" },
        { id: "REQ-b", requiredEvidence: "proved", status: "below" },
      ] as never),
    );
    expect(await readLadderFloorVerdicts(workspace())).toStrictEqual(
      new Map([["REQ-a", "below"]]),
    );
  });
});

describe("coordinate refresh after a migration", () => {
  test("reports a manifest it cannot refresh", async () => {
    const root = workspace({ ".kb/symbols.yaml": "symbols: [unclosed\n" });
    const refresh = await refreshCoordinatesAfterMigration(root);
    expect(refresh.outcome).toBe("failed");
    expect(
      coordinateRefreshFailureMessage((refresh as { reason: string }).reason),
    ).toStartWith("Could not refresh symbol coordinates after the migration (");
  });
});

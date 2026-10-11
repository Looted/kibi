// implements REQ-cli-status-pre-first-sync
import { afterEach, describe, expect, test } from "bun:test";
import { utimesSync } from "node:fs";
import path from "node:path";
import {
  type ConsumerWorkspace,
  type Json,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * kb_status compared source mtimes with the store's snapshot time only. A
 * fresh clone or checkout rewrites every mtime, so an untouched workspace was
 * reported stale with one review-only migration action per file and no
 * executor for any of them. Content that matches the last compilation is now
 * fresh; content that changed gets one automatic `kibi sync` action.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

type StatusData = {
  syncState: string;
  dirty: boolean;
  staleReasons: Array<{ code: string; path?: string }>;
  migrationPlan: Json & {
    planHash: string;
    actions: Array<{
      id: string;
      code: string;
      safety: string;
      autoApplicable?: boolean;
      invocation: { kind: string; command_argv?: string[] };
    }>;
  };
};

const SOURCE_NEWER = new Set([
  "indexed_source_newer",
  "knowledge_source_newer",
  "documentation_source_newer",
]);

function status(ws: ConsumerWorkspace): StatusData {
  return (ws.json(["status"], {}) as { data: StatusData }).data;
}

function requirement(body: string): string {
  return doc(
    "id: REQ-demo-export\ntitle: Users can export reports\nstatus: open",
    body,
  );
}

describe("kb_status confirms newer sources by content", () => {
  test("a touched but unchanged source stays fresh; a changed one gets an automatic resync", () => {
    const ws = createConsumerWorkspace("kibi-content-freshness-");
    workspace = ws;
    const relative = ".kb/requirements/REQ-demo-export.md";
    ws.write(relative, requirement("## Context\n\nReports export as CSV.\n"));
    ws.sync();
    expect(status(ws).syncState).toBe("fresh");

    // Same bytes, newer mtime: what a clone or checkout does.
    const future = new Date(Date.now() + 120_000);
    utimesSync(path.join(ws.root, relative), future, future);
    const touched = status(ws);
    expect(
      touched.staleReasons.filter((reason) => SOURCE_NEWER.has(reason.code)),
    ).toEqual([]);
    expect(touched.syncState).toBe("fresh");
    expect(touched.dirty).toBe(false);

    ws.write(relative, requirement("## Context\n\nReports export as JSON.\n"));
    utimesSync(path.join(ws.root, relative), future, future);
    const changed = status(ws);
    expect(changed.syncState).toBe("stale");
    expect(
      changed.staleReasons.some(
        (reason) => SOURCE_NEWER.has(reason.code) && reason.path === relative,
      ),
    ).toBe(true);
    const plan = changed.migrationPlan;
    const freshness = plan.actions.filter((action) =>
      action.id.startsWith("freshness-"),
    );
    expect(freshness).toHaveLength(1);
    expect(freshness[0]).toMatchObject({
      id: "freshness-resync",
      code: "freshness_resync",
      safety: "automatic",
      autoApplicable: true,
      invocation: { kind: "cli", command_argv: ["kibi", "sync"] },
    });

    const applied = ws.json(["apply-plan"], {
      plan,
      approvedPlanHash: plan.planHash,
      approvedActionIds: ["freshness-resync"],
    }) as { data: { outcome: string } };
    expect(applied.data.outcome).toBe("applied");
    expect(status(ws).syncState).toBe("fresh");
  }, 240_000);
});

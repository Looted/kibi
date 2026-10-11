// implements REQ-cli-status-pre-first-sync
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  unlinkSync,
  utimesSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "../helpers/isolated-env.js";
import {
  type ConsumerWorkspace,
  type Json,
  KIBI_CLI,
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
const copies: string[] = [];

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
  for (const copy of copies.splice(0)) {
    spawnSync("node", [KIBI_CLI, "engine", "stop"], {
      cwd: copy,
      encoding: "utf8",
      timeout: 120_000,
    });
    rmSync(copy, { recursive: true, force: true });
  }
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

function receiptPath(root: string, relative: string): string {
  return path.join(
    root,
    ".kb",
    "recovery",
    "pending-sources",
    `${createHash("sha256").update(relative).digest("hex")}.json`,
  );
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

  test("symbols an older upsert left in an untracked manifest without a receipt stay fresh after a clone", () => {
    const ws = createConsumerWorkspace("kibi-content-freshness-upsert-only-");
    workspace = ws;
    const requirementPath = ".kb/requirements/REQ-demo-export.md";
    const sourcePath = "src/export.ts";
    const manifest = ".kb/symbols.yaml";
    ws.write(requirementPath, requirement("## Context\n\nReports export.\n"));
    ws.write(
      sourcePath,
      "export function exportReport() {\n  return 'csv';\n}\n",
    );
    ws.git("add", ".kb/requirements", sourcePath);
    ws.text(["sync"]);
    const upserted = ws.json(["upsert"], {
      type: "symbol",
      id: "SYM-demo-export-report",
      properties: {
        title: "exportReport",
        status: "active",
        sourceFile: sourcePath,
      },
      relationships: [
        {
          type: "implements",
          from: "SYM-demo-export-report",
          to: "REQ-demo-export",
        },
      ],
    });
    expect(upserted, JSON.stringify(upserted.error)).toMatchObject({
      status: "success",
    });
    // The state an older Kibi left: the manifest is untracked and no
    // pending-source receipt covers it, so sync never hashed it.
    const receipt = receiptPath(ws.root, manifest);
    unlinkSync(receipt);
    expect(ws.git("status", "--porcelain", "--", manifest)).toBe(
      `?? ${manifest}`,
    );

    // A clone or checkout rewrites every mtime without changing a byte.
    const touchAll = (root: string) => {
      const future = new Date(Date.now() + 120_000);
      for (const relative of [requirementPath, sourcePath, manifest]) {
        utimesSync(path.join(root, relative), future, future);
      }
    };
    touchAll(ws.root);
    const touched = status(ws);
    expect(
      touched.staleReasons.filter((reason) => SOURCE_NEWER.has(reason.code)),
    ).toEqual([]);
    expect(touched.syncState).toBe("fresh");

    // The automatic resync compiles the upsert-only manifest so the store
    // records its content hash and every later clone stays fresh too.
    ws.text(["sync"]);
    expect(existsSync(receipt)).toBe(true);
    expect(status(ws).syncState).toBe("fresh");
    ws.kibi(["engine", "stop"]);

    const clone = realpathSync(
      mkdtempSync(path.join(os.tmpdir(), "kibi-content-freshness-clone-")),
    );
    copies.push(clone);
    cpSync(ws.root, clone, { recursive: true });
    touchAll(clone);
    const cloned = spawnSync("node", [KIBI_CLI, "status", "--input", "-"], {
      cwd: clone,
      encoding: "utf8",
      input: "{}\n",
      timeout: 120_000,
    });
    const clonedStatus = (JSON.parse(cloned.stdout) as { data: StatusData })
      .data;
    expect(
      clonedStatus.staleReasons.filter((reason) =>
        SOURCE_NEWER.has(reason.code),
      ),
    ).toEqual([]);
    expect(clonedStatus.syncState).toBe("fresh");
  }, 300_000);
});

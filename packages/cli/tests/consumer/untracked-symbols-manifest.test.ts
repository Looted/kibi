// implements REQ-core-persistence, REQ-kibi-source-relationship-parity
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  type ConsumerWorkspace,
  type Json,
  checkViolations,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * `kibi init` creates `.kb/symbols.yaml` and nothing stages it. kb_upsert
 * appended symbols to that untracked file without a pending-source receipt,
 * so it was invisible to sync: the branch that wrote them kept them (the
 * upsert wrote the store directly), but the first compile of a new branch
 * kept the authored implements edges and dropped their symbol endpoints,
 * reporting dangling relationships and source-relationship-parity
 * violations.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

const MANIFEST = ".kb/symbols.yaml";

function receiptPath(root: string, relative: string): string {
  return path.join(
    root,
    ".kb",
    "recovery",
    "pending-sources",
    `${createHash("sha256").update(relative).digest("hex")}.json`,
  );
}

describe("symbols appended to an untracked manifest", () => {
  test("compile on a new branch keeps the symbols and their relationships", () => {
    const ws = createConsumerWorkspace("kibi-untracked-symbols-");
    workspace = ws;
    ws.write(
      ".kb/requirements/REQ-demo-export.md",
      doc(
        "id: REQ-demo-export\ntitle: Users can export reports\nstatus: open",
        "## Context\n\nReports export as CSV.\n",
      ),
    );
    writeFileSync(
      path.join(ws.root, "export.ts"),
      "export function exportReport() {\n  return 'csv';\n}\n",
    );
    ws.git("add", ".kb/requirements", "export.ts");
    ws.text(["sync"]);
    ws.git("commit", "-qm", "requirements");
    expect(ws.git("status", "--porcelain", "--", MANIFEST)).toBe(
      `?? ${MANIFEST}`,
    );

    const upserted = ws.json(["upsert"], {
      type: "symbol",
      id: "SYM-demo-export-report",
      properties: {
        title: "exportReport",
        status: "active",
        sourceFile: "export.ts",
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
    // The untracked manifest now carries a receipt, so sync sees it.
    expect(existsSync(receiptPath(ws.root, MANIFEST))).toBe(true);
    // The manifest is block YAML, not one `symbols: [ { ... } ]` line.
    const manifest = ws.read(MANIFEST);
    expect(manifest).not.toContain("symbols: [");
    expect(manifest).toContain("  - id: SYM-demo-export-report\n");

    // A new branch (no hooks) starts with an empty store.
    ws.git("checkout", "-q", "-b", "feature/export");
    const sync = ws.kibi(["sync"]);
    expect(sync.status, sync.stderr).toBe(0);
    expect(`${sync.stdout}${sync.stderr}`).not.toContain("dangling");

    const queried = ws.json(["query"], {
      id: "SYM-demo-export-report",
    }) as { data: { entities: Json[] } };
    expect(queried.data.entities.map((entity) => entity.id)).toEqual([
      "SYM-demo-export-report",
    ]);
    expect(checkViolations(ws, "source-relationship-parity")).toEqual([]);
  }, 300_000);

  test("sync names a missing endpoint declared in an untracked manifest without a receipt", () => {
    const ws = createConsumerWorkspace("kibi-untracked-symbols-warning-");
    workspace = ws;
    ws.write(
      ".kb/requirements/REQ-demo-export.md",
      doc(
        "id: REQ-demo-export\ntitle: Users can export reports\nstatus: open",
        "## Context\n\nReports export as CSV.\n",
      ),
    );
    // A relationship shard (always receipted) whose symbol endpoint lives in
    // an untracked manifest no receipt covers: the state an older Kibi left.
    ws.write(
      MANIFEST,
      "symbols:\n  - id: SYM-demo-export-report\n    title: exportReport\n    status: active\n",
    );
    ws.write(
      ".kb/relationships/00.yaml",
      'relationships:\n  - id: rel-demo-export-impl\n    type: implements\n    from: SYM-demo-export-report\n    to: REQ-demo-export\n    created_at: "2026-01-01T00:00:00.000Z"\n    created_by: kibi/upsert\n    source: mcp://kibi/upsert\n',
    );
    ws.git("add", ".kb/requirements", ".kb/relationships");
    const sync = ws.kibi(["sync"]);
    const output = `${sync.stdout}${sync.stderr}`;
    expect(output).toContain("dangling relationship(s) found");
    expect(output).toContain(
      "SYM-demo-export-report is not in this branch's sources",
    );
    expect(output).toContain(
      `SYM-demo-export-report is declared in ${MANIFEST}, which Git does not track and no pending-source receipt covers`,
    );
    expect(output).toContain(`git add ${MANIFEST}`);
  }, 300_000);
});

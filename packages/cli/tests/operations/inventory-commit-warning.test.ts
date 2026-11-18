import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { inventoryCommitWarnings } from "../../src/operations/mutation/inventory-commit-warning.js";
import { analyzeSemanticAdvisorInput } from "../../src/operations/semantic-advisor/analyze-prose.js";
import { semanticInventoryContract } from "../../src/operations/semantic-advisor/ingestion-boundary.js";

const root = mkdtempSync(path.join(os.tmpdir(), "kibi-inventory-warning-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

function write(file: string, content: string): string {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), content);
  return file;
}

const requirement = (front: string) =>
  `---\nid: REQ-a\ntitle: A user who logs in gets a session token\ntype: req\nstatus: open\n${front}---\nA user who logs in gets a session token.\n`;

describe("inventoryCommitWarnings", () => {
  test("warns when the written statement has no matching inventory", () => {
    const file = write(
      ".kb/requirements/REQ-a.md",
      requirement("semantic_text: A user who logs in gets a session token.\n"),
    );
    const [warning, ...rest] = inventoryCommitWarnings("req", root, file);
    expect(rest).toStrictEqual([]);
    expect(warning).toStartWith(
      "REQ-a was written without a semantic inventory that matches its statement (",
    );
    expect(warning).toContain(
      "starting with: semantic_inventory_version must be 'kibi.semantic-inventory.v1'",
    );
    expect(warning).toContain(
      "kibi check --staged (the pre-commit hook) refuses to commit it",
    );
  });

  test("counts the write's relationships, which live in the shards, as grounding", () => {
    const text = "A user must have at most 5 sessions.";
    const properties = { status: "open", semantic_text: text };
    const payload = { type: "req", id: "REQ-m", properties };
    const contract = semanticInventoryContract(
      payload,
      analyzeSemanticAdvisorInput({
        payload: { ...payload, relationships: [] },
      }).receipt,
    );
    const inventory = (
      contract.semantic_inventory as Record<string, unknown>[]
    ).map((entry) => ({ ...entry, status: "modeled" }));
    const front = Object.entries({
      ...properties,
      ...contract,
      semantic_inventory: inventory,
    })
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join("\n");
    const file = write(
      ".kb/requirements/REQ-m.md",
      `---\nid: REQ-m\ntitle: Session cap\ntype: req\n${front}\n---\n${text}\n`,
    );
    const link = { type: "requires_property", from: "REQ-m", to: "FACT-cap" };
    expect(inventoryCommitWarnings("req", root, file)[0]).toContain(
      "must equal logical grounding relationships (0)",
    );
    expect(inventoryCommitWarnings("req", root, file, [link])).toStrictEqual(
      [],
    );
    // A link the file states too is counted once.
    const linked = write(
      ".kb/requirements/REQ-m.md",
      `---\nid: REQ-m\ntitle: Session cap\ntype: req\n${front}\nlinks:\n  - type: requires_property\n    target: FACT-cap\n---\n${text}\n`,
    );
    expect(inventoryCommitWarnings("req", root, linked, [link])).toStrictEqual(
      [],
    );
  });

  test("stays quiet when nothing needs an inventory or nothing was written", () => {
    // Only a current requirement needs an inventory.
    const file = write(
      ".kb/requirements/REQ-b.md",
      requirement("").replace("status: open", "status: superseded"),
    );
    expect(inventoryCommitWarnings("req", root, file)).toStrictEqual([]);
    expect(inventoryCommitWarnings("fact", root, file)).toStrictEqual([]);
    expect(inventoryCommitWarnings("req", root, undefined)).toStrictEqual([]);
    expect(
      inventoryCommitWarnings("req", root, ".kb/requirements/none.md"),
    ).toStrictEqual([]);
    const broken = write(".kb/requirements/REQ-c.md", "no front matter\n");
    expect(inventoryCommitWarnings("req", root, broken)).toStrictEqual([]);
  });
});

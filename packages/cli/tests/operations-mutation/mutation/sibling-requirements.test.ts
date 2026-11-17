import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { siblingRequirements } from "../../../src/operations/mutation/sibling-requirements.js";

/**
 * A value fact write that changes the value lists every other current
 * requirement on the same quantity: those grounded on the fact itself and
 * those grounded on another fact of the same subject and property or its
 * quantity-duplicate twin, flagging a claim that still states the old value.
 */

let root: string;

function write(relativePath: string, content: string): void {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function valueFact(
  id: string,
  property: string,
  value: number,
  claim: string,
): Record<string, unknown> {
  const data = {
    id,
    type: "fact",
    title: id,
    status: "active",
    fact_kind: "property_value",
    subject_key: "client.call_quota",
    property_key: property,
    operator: "lte",
    value_type: "int",
    value_int: value,
    claim_key: `CLAIM-${id}`,
    claim_text: claim,
  };
  write(
    `.kb/facts/${id}.md`,
    `---\n${Object.entries(data)
      .map(([key, entry]) => `${key}: ${entry}`)
      .join("\n")}\n---\n`,
  );
  return data;
}

function requirement(id: string, factIds: readonly string[], extra = ""): void {
  write(
    `.kb/requirements/${id}.md`,
    `---\nid: ${id}\ntype: req\ntitle: ${id} title\nstatus: open\n${extra}links:\n${factIds
      .map((factId) => `  - type: requires_property\n    target: ${factId}\n`)
      .join("")}---\n`,
  );
}

let ceiling: Record<string, unknown>;

beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), "kibi-siblings-"));
  ceiling = valueFact(
    "FACT-ceiling",
    "remaining",
    500,
    "A client has at most 500 remaining calls",
  );
  valueFact(
    "FACT-floor",
    "remaining",
    300,
    "A client keeps at least 300 remaining calls",
  );
  valueFact("FACT-window", "window_cap", 500, "A window allows 500 calls");
  valueFact("FACT-other", "burst", 20, "A burst has at most 20 calls");
  requirement(
    "REQ-ceiling",
    ["FACT-ceiling"],
    "origin:\n  kind: agent\nsemantic_inventory:\n  - claim_key: CLAIM-FACT-ceiling\n    claim_text: A client must have at most 500 remaining calls\n",
  );
  requirement("REQ-banner", ["FACT-ceiling"], "firmness: firm\n");
  requirement("REQ-floor", ["FACT-floor"], "firmness: exploratory\n");
  requirement("REQ-window", ["FACT-window"], "firmness: default\n");
  requirement("REQ-other", ["FACT-other"], "firmness: default\n");
  write(
    ".kb/requirements/REQ-retired.md",
    "---\nid: REQ-retired\ntype: req\ntitle: Retired\nstatus: retired\nlinks:\n  - type: requires_property\n    target: FACT-floor\n---\n",
  );
  write(
    ".kb/symbols.yaml",
    "symbols:\n  - id: SYM-quota\n    title: quota\n    sourceFile: src/quota.ts\n    relationships:\n      - type: implements\n        target: REQ-ceiling\n      - type: implements\n        target: REQ-window\n",
  );
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

function run(value: number, before?: Record<string, unknown> | null) {
  return siblingRequirements({
    type: "fact",
    id: "FACT-ceiling",
    entity: { ...ceiling, value_int: value },
    ...(before === undefined ? {} : { before }),
    workspaceRoot: root,
  });
}

describe("sibling requirements of a value fact write", () => {
  test("a dry run that changes the value lists the shared, same-key and twin requirements", () => {
    const report = run(400);
    expect(
      report.siblings.map((sibling) => [
        sibling.requirementId,
        sibling.relation,
        sibling.firmness,
        sibling.factId,
        sibling.value,
        sibling.statesOldValue,
      ]),
    ).toEqual([
      ["REQ-banner", "shared_fact", "firm", "FACT-ceiling", "400", true],
      ["REQ-ceiling", "shared_fact", "default", "FACT-ceiling", "400", true],
      ["REQ-floor", "same_quantity", "exploratory", "FACT-floor", "300", false],
      ["REQ-window", "same_quantity", "default", "FACT-window", "500", true],
    ]);
    const ceilingSibling = report.siblings[1];
    expect(ceilingSibling).toMatchObject({
      title: "REQ-ceiling title",
      subjectKey: "client.call_quota",
      propertyKey: "remaining",
      claimText: "A client must have at most 500 remaining calls",
    });
    expect(report.warnings).toHaveLength(4);
    expect(report.warnings[0]).toBe(
      'sibling requirement: REQ-banner (REQ-banner title, firm) is grounded on FACT-ceiling (client.call_quota.remaining), changed by this write from 500 to 400; it still states the old value ("A client has at most 500 remaining calls"). REQ-banner is firm: ask the person whether this change covers it before touching it. If the person\'s change does not cover it, supersede or scope the requirements so they no longer constrain one quantity.',
    );
    expect(report.warnings[2]).toContain(
      "REQ-floor (REQ-floor title, exploratory) constrains the same quantity through FACT-floor (client.call_quota.remaining = 300) as FACT-ceiling",
    );
    expect(report.warnings[2]).toContain(
      "Update REQ-floor in this change to the new value, with the person's words as origin.ref and their reason, and update the tests that pin the old value.",
    );
    // A firm sibling is read for the person to decide on; the others get a
    // ready kb_upsert input the new value is added to.
    const upsert = (id: string) => ({
      type: "req",
      id,
      properties: { title: `${id} title`, status: "open" },
    });
    expect(report.nextActions).toEqual([
      {
        operation: "kb_query",
        input: { id: "REQ-banner", includeBody: true },
        reason: report.warnings[0],
        required: true,
      },
      ...["REQ-ceiling", "REQ-floor", "REQ-window"].map((id, index) => ({
        operation: "kb_upsert",
        input: upsert(id),
        reason: report.warnings[index + 1],
        required: true,
      })),
    ]);
  });

  test("a sibling's upsert input keeps its own status", () => {
    write(
      ".kb/requirements/REQ-floor.md",
      "---\nid: REQ-floor\ntype: req\ntitle: REQ-floor title\nstatus: in_progress\nfirmness: exploratory\nlinks:\n  - type: requires_property\n    target: FACT-floor\n---\n",
    );
    const floor = run(400).nextActions.find(
      (action) => action.input.id === "REQ-floor",
    );
    expect(floor?.input).toStrictEqual({
      type: "req",
      id: "REQ-floor",
      properties: { title: "REQ-floor title", status: "in_progress" },
    });
  });

  test("after a write the caller passes the value before", () => {
    write(
      ".kb/facts/FACT-ceiling.md",
      "---\nid: FACT-ceiling\ntype: fact\ntitle: t\nstatus: active\nfact_kind: property_value\nsubject_key: client.call_quota\nproperty_key: remaining\noperator: lte\nvalue_type: int\nvalue_int: 400\n---\n",
    );
    expect(
      run(400, ceiling).siblings.map((sibling) => sibling.requirementId),
    ).toEqual(["REQ-banner", "REQ-ceiling", "REQ-floor", "REQ-window"]);
    // The same value before and after is no change.
    expect(run(400, { ...ceiling, value_int: 400 }).siblings).toEqual([]);
  });

  test("a claim that already states the new value is not flagged", () => {
    const report = run(400);
    expect(report.siblings[0]?.statesOldValue).toBe(true);
    write(
      ".kb/requirements/REQ-banner.md",
      "---\nid: REQ-banner\ntype: req\ntitle: Banner\nstatus: open\nfirmness: firm\nsemantic_inventory:\n  - claim_key: CLAIM-FACT-ceiling\n    claim_text: A banner shows from 400 calls, down from 500\nlinks:\n  - type: requires_property\n    target: FACT-ceiling\n---\n",
    );
    expect(run(400).siblings[0]).toMatchObject({
      requirementId: "REQ-banner",
      statesOldValue: false,
    });
  });

  test("a created fact lists the requirements on its quantity", () => {
    const created = siblingRequirements({
      type: "fact",
      id: "FACT-new",
      entity: { ...ceiling, id: "FACT-new", value_int: 250 },
      before: null,
      workspaceRoot: root,
    });
    expect(
      created.siblings.map((sibling) => [
        sibling.requirementId,
        sibling.relation,
        sibling.statesOldValue,
      ]),
    ).toEqual([
      ["REQ-banner", "same_quantity", false],
      ["REQ-ceiling", "same_quantity", false],
      ["REQ-floor", "same_quantity", false],
    ]);
    expect(created.warnings[0]).toContain(
      "FACT-new (client.call_quota.remaining = 250), created by this write",
    );
  });

  test("other writes list nothing", () => {
    expect(
      siblingRequirements({
        type: "req",
        id: "REQ-ceiling",
        entity: {},
        workspaceRoot: root,
      }).siblings,
    ).toEqual([]);
    expect(
      siblingRequirements({
        type: "fact",
        id: "FACT-ceiling",
        entity: { ...ceiling, fact_kind: "observation" },
        workspaceRoot: root,
      }).siblings,
    ).toEqual([]);
    // An unreadable workspace advises nothing rather than failing the write.
    expect(
      siblingRequirements({
        type: "fact",
        id: "FACT-ceiling",
        entity: { ...ceiling, value_int: 400 },
        workspaceRoot: path.join(root, "missing"),
      }).siblings,
    ).toEqual([]);
  });
});

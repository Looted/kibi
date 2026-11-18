import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  type ConsumerWorkspace,
  type Json,
  QUOTA_SUBJECT,
  authorQuotaRequirement,
  createConsumerWorkspace,
} from "./workspace.js";

/**
 * kb_upsert says when a requirement a person or agent wrote records no
 * reason, as the write creates it, changes its statement or changes a value
 * it is grounded on, and quotes the recorded reason when a write changes a
 * grounded value and leaves that reason as it was.
 */

let workspace: ConsumerWorkspace;

const RECORDED_REASON =
  "Clients past the quota were overloading the gateway during the launch.";

function setOrigin(id: string, rationale?: string): void {
  const file = path.join(workspace.root, `.kb/requirements/${id}.md`);
  const content = readFileSync(file, "utf8").replace(
    "priority: must\n",
    `priority: must\norigin:\n  kind: agent\n${rationale ? `rationale: ${rationale}\n` : ""}`,
  );
  writeFileSync(file, content);
}

beforeAll(() => {
  workspace = createConsumerWorkspace("kibi-upsert-reason-note-");
  workspace.write(".kb/facts/FACT-QUOTA-SUBJECT.md", QUOTA_SUBJECT);
  authorQuotaRequirement(workspace, {
    id: "REQ-quota-floor",
    title: "A client keeps at least 10 calls",
    prose: "A client must keep at least 10 remaining calls.",
    factId: "FACT-quota-floor",
    operator: "gte",
    value: 10,
  });
  setOrigin("REQ-quota-floor");
  authorQuotaRequirement(workspace, {
    id: "REQ-quota-ceiling",
    title: "A client has at most 500 calls",
    prose: "A client must have at most 500 remaining calls.",
    factId: "FACT-quota-ceiling",
    operator: "lte",
    value: 500,
  });
  setOrigin("REQ-quota-ceiling", RECORDED_REASON);
  workspace.git("add", ".kb");
  workspace.text(["sync"]);
}, 300_000);

afterAll(() => workspace?.cleanup());

function upsert(input: Json): { status: unknown; data: Json } {
  return workspace.json(["upsert"], input) as { status: unknown; data: Json };
}

function reasonNotes(result: { data: Json }): string[] {
  return ((result.data.warnings ?? []) as string[]).filter(
    (warning) =>
      warning.includes("records no reason") ||
      warning.includes("predates this change"),
  );
}

function quotaFact(id: string, operator: string, value: number): Json {
  const stored = readFileSync(
    path.join(workspace.root, `.kb/facts/${id}.md`),
    "utf8",
  );
  const field = (name: string): string =>
    new RegExp(`^${name}: (.*)$`, "m").exec(stored)?.[1]?.trim() ?? "";
  const row: Json = {
    title: field("title"),
    claim_key: field("claim_key"),
    claim_text: field("claim_text"),
  };
  return {
    type: "fact",
    id,
    properties: {
      title: String(row.title),
      status: "active",
      fact_kind: "property_value",
      subject_key: "client.call_quota",
      property_key: "remaining",
      operator,
      value_type: "int",
      value_int: value,
      claim_key: String(row.claim_key),
      claim_text: String(row.claim_text),
    },
  };
}

describe("kb_upsert notes on a requirement's reason", () => {
  test("a new agent-authored requirement without a reason gets one note asking for the person's words", () => {
    const result = upsert({
      type: "req",
      id: "REQ-quota-window",
      properties: {
        title: "A quota window lasts one hour",
        status: "open",
        origin: { kind: "agent" },
      },
    });
    expect(result.status, JSON.stringify(result)).toBe("success");
    const notes = reasonNotes(result);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain("REQ-quota-window records no reason");
    expect(notes[0]).toContain("record it now as rationale");
    expect(notes[0]).toContain("do not write a reason of your own");
  }, 300_000);

  test("an update that leaves the statement as it was gets no note, and one that changes it does", () => {
    const same = upsert({
      type: "req",
      id: "REQ-quota-window",
      properties: {
        title: "A quota window lasts one hour",
        status: "open",
        priority: "should",
      },
    });
    expect(same.status, JSON.stringify(same)).toBe("success");
    expect(reasonNotes(same)).toEqual([]);
    const changed = upsert({
      type: "req",
      id: "REQ-quota-window",
      properties: {
        title: "A quota window lasts two hours",
        status: "open",
      },
    });
    expect(changed.status, JSON.stringify(changed)).toBe("success");
    expect(reasonNotes(changed)).toHaveLength(1);
  }, 300_000);

  test("a Context section that names who asked and says no reason was stated still gets the note", () => {
    const result = upsert({
      type: "req",
      id: "REQ-quota-burst",
      properties: {
        title: "A client sends at most 20 calls a second",
        status: "open",
        origin: { kind: "agent" },
      },
      document: {
        body: "A client sends at most 20 calls a second.\n\n## Context\n\nAsked by the owner in the project chat on 2026-11-10. Reason not stated.\n",
      },
    });
    expect(result.status, JSON.stringify(result)).toBe("success");
    const notes = reasonNotes(result);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain("REQ-quota-burst records no reason");
  }, 300_000);

  test("a new requirement written with its rationale gets no note", () => {
    const result = upsert({
      type: "req",
      id: "REQ-quota-reset",
      properties: {
        title: "A quota resets at the top of the hour",
        status: "open",
        origin: { kind: "agent" },
        rationale: "Support explains resets by the clock.",
      },
    });
    expect(result.status, JSON.stringify(result)).toBe("success");
    expect(reasonNotes(result)).toEqual([]);
  }, 300_000);

  test("changing a grounded value of a requirement without a reason names it and asks for the reason", () => {
    const result = upsert(quotaFact("FACT-quota-floor", "gte", 20));
    expect(result.status, JSON.stringify(result)).toBe("success");
    const notes = reasonNotes(result);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain(
      "FACT-quota-floor changed a value REQ-quota-floor is grounded on, and REQ-quota-floor records no reason",
    );
  }, 300_000);

  test("changing a grounded value of a requirement with a reason quotes that reason and asks whether it still holds", () => {
    const result = upsert(quotaFact("FACT-quota-ceiling", "lte", 400));
    expect(result.status, JSON.stringify(result)).toBe("success");
    const notes = reasonNotes(result);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain(
      "FACT-quota-ceiling changed a value REQ-quota-ceiling is grounded on",
    );
    expect(notes[0]).toContain(`"${RECORDED_REASON}"`);
    expect(notes[0]).toContain("Ask whether that reason still holds");
  }, 300_000);

  test("a fact write that leaves the value as it was gets no note", () => {
    const result = upsert(quotaFact("FACT-quota-ceiling", "lte", 400));
    expect(result.status, JSON.stringify(result)).toBe("success");
    expect(reasonNotes(result)).toEqual([]);
  }, 300_000);
});

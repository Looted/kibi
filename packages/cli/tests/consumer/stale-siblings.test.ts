import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  QUOTA_SUBJECT,
  authorQuotaRequirement,
  createConsumerWorkspace,
} from "./workspace.js";

/**
 * Changing a value fact that two current requirements constrain: kb_upsert
 * refuses a value that leaves the two with no common value, and a value
 * both admit is written with the other requirements listed as siblings,
 * flagging the claims that still state the old value. The dry run lists the
 * same siblings and refuses the same conflict without writing.
 */

let workspace: ConsumerWorkspace;

beforeAll(() => {
  workspace = createConsumerWorkspace("kibi-stale-siblings-");
  workspace.write(".kb/facts/FACT-QUOTA-SUBJECT.md", QUOTA_SUBJECT);
  authorQuotaRequirement(workspace, {
    id: "REQ-quota-ceiling",
    title: "A client has at most 500 calls",
    prose: "A client must have at most 500 remaining calls.",
    factId: "FACT-quota-ceiling",
    operator: "lte",
    value: 500,
  });
  authorQuotaRequirement(workspace, {
    id: "REQ-quota-floor",
    title: "A client keeps at least 300 calls",
    prose: "A client must keep at least 300 remaining calls.",
    factId: "FACT-quota-floor",
    operator: "gte",
    value: 300,
  });
  workspace.git("add", ".kb");
  workspace.text(["sync"]);
}, 300_000);

afterAll(() => workspace?.cleanup());

function ceilingFact(value: number, extra: Json = {}): Json {
  const stored = workspace.read(".kb/facts/FACT-quota-ceiling.md");
  const field = (name: string): string =>
    new RegExp(`^${name}: (.*)$`, "m").exec(stored)?.[1]?.trim() ?? "";
  return {
    type: "fact",
    id: "FACT-quota-ceiling",
    properties: {
      title: field("title"),
      status: "active",
      fact_kind: "property_value",
      subject_key: "client.call_quota",
      property_key: "remaining",
      operator: "lte",
      value_type: "int",
      value_int: value,
      claim_key: field("claim_key"),
      claim_text: field("claim_text"),
    },
    ...extra,
  };
}

function storedCeiling(): string {
  return /^value_int: (.*)$/m.exec(
    workspace.read(".kb/facts/FACT-quota-ceiling.md"),
  )?.[1] as string;
}

describe("a value fact that other requirements constrain", () => {
  test("a value the other requirement cannot share is refused, in the dry run and the write", () => {
    for (const [extra, code] of [
      [{ dryRun: true }, "UPSERT_DRY_RUN_INVALID"],
      // A store refusal keeps the envelope code; the message names it.
      [{}, "OPERATION_FAILED"],
    ] as const) {
      const result = workspace.json(["upsert"], ceilingFact(200, extra));
      expect(result.status, JSON.stringify(result)).toBe("error");
      expect((result.error as Json).code, JSON.stringify(result.error)).toBe(code);
      const message = JSON.stringify(result.error);
      expect(message).toContain(
        "Contradiction detected for fact FACT-quota-ceiling: the write makes current requirements conflict",
      );
      expect(message).toContain(
        "REQ-quota-ceiling conflicts with REQ-quota-floor",
      );
      expect(message).toContain("kb_apply_plan");
    }
    expect(storedCeiling()).toBe("500");
  }, 300_000);

  test("the dry run of a shared value lists the siblings without writing", () => {
    const result = workspace.json(
      ["upsert"],
      ceilingFact(400, { dryRun: true }),
    );
    expect(result.status, JSON.stringify(result)).toBe("success");
    const data = result.data as Json;
    const siblings = data.siblings as Json[];
    expect(
      siblings.map((sibling) => [
        sibling.requirementId,
        sibling.relation,
        sibling.statesOldValue,
      ]),
    ).toEqual([
      ["REQ-quota-ceiling", "shared_fact", true],
      ["REQ-quota-floor", "same_quantity", false],
    ]);
    const warnings = data.warnings as string[];
    expect(warnings[0]).toStartWith(
      "sibling requirement: REQ-quota-ceiling (A client has at most 500 calls, firm) is grounded on FACT-quota-ceiling (client.call_quota.remaining), changed by this write from 500 to 400; it still states the old value",
    );
    expect(warnings[1]).toStartWith(
      "sibling requirement: REQ-quota-floor (A client keeps at least 300 calls, firm) constrains the same quantity through FACT-quota-floor (client.call_quota.remaining = 300)",
    );
    expect(data.nextActions).toEqual([
      {
        operation: "kb_upsert",
        input: { id: "REQ-quota-ceiling" },
        reason: warnings[0],
        required: true,
      },
      {
        operation: "kb_upsert",
        input: { id: "REQ-quota-floor" },
        reason: warnings[1],
        required: true,
      },
    ]);
    expect(storedCeiling()).toBe("500");
  }, 300_000);

  test("the write lists the same siblings first in its warnings", () => {
    const result = workspace.json(["upsert"], ceilingFact(400));
    expect(result.status, JSON.stringify(result)).toBe("success");
    const data = result.data as Json;
    expect(
      (data.siblings as Json[]).map((sibling) => sibling.requirementId),
    ).toEqual(["REQ-quota-ceiling", "REQ-quota-floor"]);
    expect((data.warnings as string[])[0]).toStartWith(
      "sibling requirement: REQ-quota-ceiling",
    );
    expect((data.nextActions as Json[]).length).toBe(2);
    expect(storedCeiling()).toBe("400");
  }, 300_000);
});

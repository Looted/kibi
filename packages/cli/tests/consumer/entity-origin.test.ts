// implements REQ-kibi-entity-origin
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  checkAdvisories,
  createConsumerWorkspace,
} from "./workspace.js";

/**
 * Consumer view of entity provenance: an agent writes requirements through
 * the `kibi upsert` JSON route, reads who authored them back through
 * `kibi query`, and `kibi check` keeps the approvals no human corroborated
 * visible as advisories.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

type Origin = {
  kind: string;
  ref?: string;
  approved_by?: string;
  recorded_at?: string;
};

function upsertRequirement(
  ws: ConsumerWorkspace,
  id: string,
  properties: Json,
  exempts?: string,
): Json {
  return ws.json(["upsert"], {
    type: "req",
    id,
    properties: { status: "open", priority: "should", ...properties },
    ...(exempts
      ? { relationships: [{ type: "exempts", from: id, to: exempts }] }
      : {}),
  });
}

function storedRequirement(ws: ConsumerWorkspace, id: string) {
  const result = ws.json(["query"], { type: "req", id });
  return (
    (result.data as Json).entities as Array<Json & { origin?: Origin }>
  )[0];
}

describe("entity origin through the kibi CLI", () => {
  test("records agent authorship on upsert, keeps it on later writes, and flags uncorroborated approvals", () => {
    const ws = createConsumerWorkspace("kibi-entity-origin-");
    workspace = ws;
    ws.sync();

    // A new requirement written without an origin is recorded as
    // agent-authored, with the write time.
    expect(
      upsertRequirement(ws, "REQ-quota-call", {
        title: "A client call needs remaining quota",
      }),
    ).toMatchObject({ status: "success" });
    const created = storedRequirement(ws, "REQ-quota-call");
    expect(created?.origin).toEqual({
      kind: "agent",
      recorded_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });

    // A later write that omits origin changes the requirement, not who
    // authored it.
    expect(
      upsertRequirement(ws, "REQ-quota-call", {
        title: "A client call needs remaining call quota",
      }),
    ).toMatchObject({ status: "success" });
    const updated = storedRequirement(ws, "REQ-quota-call");
    expect(updated?.title).toBe("A client call needs remaining call quota");
    expect(updated?.origin).toEqual(created?.origin);

    // An origin with an unknown kind or field is rejected before anything is
    // written.
    for (const [origin, field] of [
      [{ kind: "robot" }, "/properties/origin/kind"],
      [{ kind: "agent", author: "Ada" }, "/properties/origin"],
    ] as const) {
      expect(
        upsertRequirement(ws, "REQ-quota-robot", {
          title: "A robot-authored requirement",
          origin,
        }),
      ).toMatchObject({
        status: "error",
        error: {
          code: "VALIDATION_FAILED",
          message: expect.stringContaining(field),
        },
      });
    }
    expect(storedRequirement(ws, "REQ-quota-robot")).toBeUndefined();
    expect(() => ws.read(".kb/requirements/REQ-quota-robot.md")).toThrow();

    // Two agent-written exceptions record a human approver. Only the one
    // whose approval is corroborated (origin.approved_by plus the decision
    // record in approval_ref) is not reported as self-attested.
    expect(
      upsertRequirement(
        ws,
        "REQ-quota-promo-exception",
        {
          title: "Promo calls are exempt from the quota",
          approved_by: "Product owner",
        },
        "REQ-quota-call",
      ),
    ).toMatchObject({ status: "success" });
    expect(
      upsertRequirement(
        ws,
        "REQ-quota-trial-exception",
        {
          title: "Trial calls are exempt from the quota",
          approved_by: "Product owner",
          approval_ref: "DEC-42",
          origin: { kind: "agent", approved_by: "Product owner" },
        },
        "REQ-quota-call",
      ),
    ).toMatchObject({ status: "success" });
    // A supplied origin is stored as given, with the write time filled in.
    expect(storedRequirement(ws, "REQ-quota-trial-exception")?.origin).toEqual({
      kind: "agent",
      approved_by: "Product owner",
      recorded_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });

    const selfAttested = checkAdvisories(
      ws,
      "exception-approval-self-attested",
    );
    expect(selfAttested.map((finding) => finding.entityId)).toEqual([
      "REQ-quota-promo-exception",
    ]);
    expect(selfAttested[0]?.message).toContain(
      "missing origin.approved_by and approval_ref",
    );

    // Agent-authored requirements no human approved stay listed; the
    // corroborated exception is not among them.
    const unapproved = checkAdvisories(ws, "agent-requirement-unapproved");
    expect(unapproved.map((finding) => finding.entityId).sort()).toEqual([
      "REQ-quota-call",
      "REQ-quota-promo-exception",
    ]);
    expect(
      unapproved.find((finding) => finding.entityId === "REQ-quota-call")
        ?.message,
    ).toContain("was authored by an agent and no human has approved it");

    // These are advisories: none of them blocks kibi check.
    const check = ws.json([
      "check",
      "--format",
      "json",
      "--rules",
      "exception-approval-self-attested,agent-requirement-unapproved,exception-unapproved",
    ]);
    expect((check.structuredContent as Json).violations).toEqual([]);
  }, 300_000);
});

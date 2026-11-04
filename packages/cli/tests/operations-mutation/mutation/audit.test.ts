import { describe, expect, test } from "bun:test";
import {
  buildEntityDeleteAuditGoal,
  recordEntityAudit,
  recordRelationshipAudits,
} from "../../../src/operations/mutation/audit.js";
import { fail, ok, scriptedProlog } from "../fake-prolog.js";

describe("recordEntityAudit", () => {
  test("logs the change with the serialized properties", async () => {
    const fake = scriptedProlog([ok()]);
    await recordEntityAudit(fake.prolog, "created", {
      id: "REQ-1",
      type: "req",
      title: "T",
    });
    expect(fake.goals).toStrictEqual([
      `kb_log_entity_upsert(created, req, [id='REQ-1', title="T"])`,
    ]);
  });

  test("throws with the engine error or a default", async () => {
    await expect(
      recordEntityAudit(scriptedProlog([fail("nope")]).prolog, "updated", {
        id: "REQ-2",
        type: "req",
      }),
    ).rejects.toThrow(/^Failed to record audit entry for REQ-2: nope$/);
    await expect(
      recordEntityAudit(scriptedProlog([fail()]).prolog, "updated", {
        id: "REQ-3",
        type: "req",
      }),
    ).rejects.toThrow(
      /^Failed to record audit entry for REQ-3: Unknown error$/,
    );
  });
});

describe("recordRelationshipAudits", () => {
  test("logs every relationship with escaped endpoints and metadata", async () => {
    const fake = scriptedProlog([ok()]);
    await recordRelationshipAudits(fake.prolog, [
      { type: "implements", from: "SYM-'a", to: "REQ-1" },
      { type: "depends_on", from: "REQ-1", to: "REQ-2", confidence: 0.5 },
    ]);
    expect(fake.goals).toStrictEqual([
      "kb_log_relationship_upsert(implements, 'SYM-''a', 'REQ-1', [])",
      "kb_log_relationship_upsert(depends_on, 'REQ-1', 'REQ-2', [confidence=0.5])",
    ]);
  });

  test("stops at the first failure with the engine error or a default", async () => {
    const fake = scriptedProlog([fail("bad")]);
    await expect(
      recordRelationshipAudits(fake.prolog, [
        { type: "implements", from: "A", to: "B" },
        { type: "implements", from: "C", to: "D" },
      ]),
    ).rejects.toThrow(/^Failed to record relationship audit entry A->B: bad$/);
    expect(fake.goals).toHaveLength(1);
    await expect(
      recordRelationshipAudits(scriptedProlog([fail()]).prolog, [
        { type: "implements", from: "A", to: "B" },
      ]),
    ).rejects.toThrow(
      /^Failed to record relationship audit entry A->B: Unknown error$/,
    );
  });
});

describe("buildEntityDeleteAuditGoal", () => {
  test("keeps only the string audit fields", () => {
    expect(
      buildEntityDeleteAuditGoal({
        id: "REQ-'1",
        type: "req",
        title: "T",
        source: "s.md",
        text_ref: "s.md#L1",
        semantic_text: "x",
        status: "open",
        priority: 3,
      }),
    ).toBe(
      `kb_retract_entity('REQ-''1', req, [id='REQ-''1', title="T", source="s.md", text_ref="s.md#L1", semantic_text="x"])`,
    );
    expect(buildEntityDeleteAuditGoal({ id: "A", type: "req", title: 5 })).toBe(
      `kb_retract_entity('A', req, [id='A'])`,
    );
  });
});

import { describe, expect, test } from "bun:test";
import {
  type AuditEntry,
  reconcileAuditEntries,
} from "../src/reconcile-engine";

function upsert(
  timestamp: string,
  entityId: string,
  extra: Record<string, unknown> = {},
  properties: Record<string, unknown> = {},
): AuditEntry {
  return {
    timestamp,
    operation: "upsert",
    entityId,
    payload: { kind: "entity", entityType: "req", properties, ...extra },
  };
}

describe("reconcileAuditEntries", () => {
  test("upserts without an entity payload are skipped", () => {
    expect(
      reconcileAuditEntries([
        { timestamp: "1", operation: "upsert", entityId: "A" },
        {
          timestamp: "2",
          operation: "upsert",
          entityId: "B",
          payload: { kind: "other" },
        },
      ]),
    ).toStrictEqual({
      added: [],
      modified: [],
      removed: [],
      relationshipsChanged: 0,
    });
  });

  test("a delete of an unseen entity is ignored", () => {
    expect(
      reconcileAuditEntries([
        { timestamp: "1", operation: "delete", entityId: "A" },
      ]),
    ).toStrictEqual({
      added: [],
      modified: [],
      removed: [],
      relationshipsChanged: 0,
    });
  });

  test("entries are applied in timestamp order", () => {
    const result = reconcileAuditEntries([
      { timestamp: "2", operation: "delete", entityId: "A" },
      upsert("1", "A", { changeKind: "updated" }),
    ]);
    expect(result.removed).toStrictEqual([{ id: "A", type: "req" }]);
    expect(result.modified).toStrictEqual([]);
  });

  test("an upsert after a delete revives the entity", () => {
    const result = reconcileAuditEntries([
      upsert("1", "A", { changeKind: "updated" }),
      { timestamp: "2", operation: "delete", entityId: "A" },
      upsert("3", "A", { changeKind: "updated" }),
    ]);
    expect(result.modified).toStrictEqual([{ id: "A", type: "req" }]);
    expect(result.removed).toStrictEqual([]);
  });

  test("create and legacy flags stick across later updates", () => {
    const result = reconcileAuditEntries([
      upsert("1", "A", { changeKind: "created" }),
      upsert("2", "A", { changeKind: "updated" }),
      upsert("3", "B"),
      upsert("4", "B", { changeKind: "updated" }),
      upsert("5", "C", { changeKind: "created" }),
      { timestamp: "6", operation: "delete", entityId: "C" },
    ]);
    expect(result.added).toStrictEqual([
      { id: "A", type: "req" },
      { id: "B", type: "req" },
    ]);
    expect(result.removed).toStrictEqual([]);
  });

  test("non-string properties are not used as title, source or text ref", () => {
    const result = reconcileAuditEntries([
      upsert(
        "1",
        "A",
        { changeKind: "updated" },
        { title: 1, source: 2, text_ref: 3 },
      ),
      upsert(
        "2",
        "B",
        { changeKind: "updated" },
        { title: "T", source: "S", text_ref: "R" },
      ),
    ]);
    expect(result.modified).toStrictEqual([
      { id: "A", type: "req" },
      { id: "B", type: "req", title: "T", source: "S", textRef: "R" },
    ]);
  });

  test("results sort by type, then id", () => {
    const entries: AuditEntry[] = [];
    let t = 0;
    for (const [id, type] of [
      ["B", "req"],
      ["A", "req"],
      ["C", "adr"],
    ]) {
      t += 1;
      entries.push({
        timestamp: String(t),
        operation: "upsert",
        entityId: id as string,
        payload: {
          kind: "entity",
          entityType: type as string,
          changeKind: "updated",
          properties: {},
        },
      });
    }
    const modified = reconcileAuditEntries(entries).modified.map(
      (item) => item.id,
    );
    const removedEntries = [
      ...entries,
      { timestamp: "9", operation: "delete" as const, entityId: "A" },
      { timestamp: "9", operation: "delete" as const, entityId: "B" },
      { timestamp: "9", operation: "delete" as const, entityId: "C" },
    ];
    const removed = reconcileAuditEntries(removedEntries).removed.map(
      (item) => item.id,
    );
    expect(modified).toStrictEqual(["C", "A", "B"]);
    expect(removed).toStrictEqual(["C", "A", "B"]);
  });
});

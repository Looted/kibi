import { describe, expect, it } from "bun:test";
import {
  type AuditEntry,
  reconcileAuditEntries,
} from "../src/reconcile-engine";

function createEntityEntry(
  overrides: Partial<AuditEntry> & {
    entityId: string;
    operation?: AuditEntry["operation"];
    entityType?: string;
    changeKind?: "created" | "updated";
    title?: string;
    source?: string;
    textRef?: string;
    properties?: Record<string, unknown>;
  },
): AuditEntry {
  const entityType = overrides.entityType ?? "req";
  const title = overrides.title;
  const source = overrides.source;
  const textRef = overrides.textRef;

  return {
    timestamp: overrides.timestamp ?? "2026-05-01T10:00:00Z",
    operation: overrides.operation ?? "upsert",
    entityId: overrides.entityId,
    payload:
      overrides.payload === undefined
        ? {
            kind: "entity",
            entityType,
            ...(overrides.changeKind
              ? { changeKind: overrides.changeKind }
              : {}),
            ...(title ? { title } : {}),
            ...(source ? { source } : {}),
            ...(textRef ? { textRef } : {}),
            properties: {
              id: overrides.entityId,
              ...(title ? { title } : {}),
              ...(source ? { source } : {}),
              ...(textRef ? { text_ref: textRef } : {}),
              ...(overrides.changeKind
                ? { change_kind: overrides.changeKind }
                : {}),
              ...(overrides.properties ?? {}),
            },
          }
        : overrides.payload,
  };
}

describe("reconcile-engine", () => {
  it("classifies an updated entity as modified for a fresh session after prior branch history", () => {
    const result = reconcileAuditEntries([
      createEntityEntry({
        entityId: "REQ-020",
        changeKind: "updated",
        title: "Existing requirement",
        source: ".kb/requirements/REQ-020.md",
        textRef: ".kb/requirements/REQ-020.md#L20",
      }),
    ]);

    expect(result.added).toEqual([]);
    expect(result.modified).toEqual([
      {
        id: "REQ-020",
        type: "req",
        title: "Existing requirement",
        source: ".kb/requirements/REQ-020.md",
        textRef: ".kb/requirements/REQ-020.md#L20",
      },
    ]);
    expect(result.removed).toEqual([]);
  });

  it("collapses add followed by modify into a single added entity", () => {
    const result = reconcileAuditEntries([
      createEntityEntry({
        entityId: "REQ-021",
        timestamp: "2026-05-01T10:00:00Z",
        changeKind: "created",
        title: "Draft requirement",
      }),
      createEntityEntry({
        entityId: "REQ-021",
        timestamp: "2026-05-01T10:01:00Z",
        changeKind: "updated",
        title: "Final requirement title",
      }),
    ]);

    expect(result.added).toEqual([
      {
        id: "REQ-021",
        type: "req",
        title: "Final requirement title",
      },
    ]);
    expect(result.modified).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  it("collapses modify followed by delete into a single removed entity", () => {
    const result = reconcileAuditEntries([
      createEntityEntry({
        entityId: "REQ-022",
        timestamp: "2026-05-01T10:00:00Z",
        changeKind: "updated",
        title: "Existing requirement",
        source: ".kb/requirements/REQ-022.md",
      }),
      createEntityEntry({
        entityId: "REQ-022",
        timestamp: "2026-05-01T10:01:00Z",
        operation: "delete",
        payload: undefined,
      }),
    ]);

    expect(result.added).toEqual([]);
    expect(result.modified).toEqual([]);
    expect(result.removed).toEqual([
      {
        id: "REQ-022",
        type: "req",
        title: "Existing requirement",
        source: ".kb/requirements/REQ-022.md",
      },
    ]);
  });

  it("suppresses entities that are added and then deleted in the same session", () => {
    const result = reconcileAuditEntries([
      createEntityEntry({
        entityId: "REQ-023",
        timestamp: "2026-05-01T10:00:00Z",
        changeKind: "created",
        title: "Transient requirement",
      }),
      createEntityEntry({
        entityId: "REQ-023",
        timestamp: "2026-05-01T10:01:00Z",
        operation: "delete",
        payload: undefined,
      }),
    ]);

    expect(result.added).toEqual([]);
    expect(result.modified).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  it("sorts change items deterministically by entity type and id", () => {
    const result = reconcileAuditEntries([
      createEntityEntry({
        entityId: "TEST-003",
        entityType: "test",
        timestamp: "2026-05-01T10:03:00Z",
        changeKind: "created",
        title: "Third test",
      }),
      createEntityEntry({
        entityId: "ADR-010",
        entityType: "adr",
        timestamp: "2026-05-01T10:01:00Z",
        changeKind: "created",
        title: "Architecture choice",
      }),
      createEntityEntry({
        entityId: "REQ-099",
        entityType: "req",
        timestamp: "2026-05-01T10:02:00Z",
        changeKind: "created",
        title: "Requirement ninety-nine",
      }),
      createEntityEntry({
        entityId: "TEST-001",
        entityType: "test",
        timestamp: "2026-05-01T10:00:00Z",
        changeKind: "created",
        title: "First test",
      }),
    ]);

    expect(result.added.map((item) => `${item.type}:${item.id}`)).toEqual([
      "adr:ADR-010",
      "req:REQ-099",
      "test:TEST-001",
      "test:TEST-003",
    ]);
  });
});

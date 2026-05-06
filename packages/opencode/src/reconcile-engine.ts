export interface EntityChangeItem {
  id: string;
  type: string;
  title?: string;
  source?: string;
  textRef?: string;
}

export interface ReconcileResult {
  added: EntityChangeItem[];
  modified: EntityChangeItem[];
  removed: EntityChangeItem[];
  relationshipsChanged: number;
}

export interface AuditEntry {
  timestamp: string;
  operation: string;
  entityId: string;
  payload?: {
    kind: "entity";
    entityType: string;
    changeKind?: "created" | "updated";
    title?: string;
    source?: string;
    textRef?: string;
    properties: Record<string, unknown>;
  } | null;
}

export function reconcileAuditEntries( // implements REQ-opencode-kibi-briefing-v6
  const added = new Map<string, EntityChangeItem>();
  const modified = new Map<string, EntityChangeItem>();
  const removed = new Map<string, EntityChangeItem>();
  let relationshipsChanged = 0;

  for (const entry of entries) {
    if (entry.operation === "upsert_rel") {
      relationshipsChanged++;
      continue;
    }

    if (entry.operation === "delete") {
      if (added.has(entry.entityId)) {
        added.delete(entry.entityId);
        continue;
      }
      const prior = modified.get(entry.entityId) ?? added.get(entry.entityId);
      const item: EntityChangeItem = prior
        ? prior
        : entry.payload?.kind === "entity"
        ? {
            id: entry.entityId,
            type: entry.payload.entityType,
            ...(entry.payload.title ? { title: entry.payload.title } : {}),
            ...(entry.payload.source ? { source: entry.payload.source } : {}),
            ...(entry.payload.textRef ? { textRef: entry.payload.textRef } : {}),
          }
        : { id: entry.entityId, type: "unknown" };
      removed.set(entry.entityId, item);
      modified.delete(entry.entityId);
      continue;
    }

    const payload = entry.payload;
    if (!payload || payload.kind !== "entity") continue;

    const changeKind = payload.changeKind;
    const item: EntityChangeItem = {
      id: entry.entityId,
      type: payload.entityType,
      ...(payload.title ? { title: payload.title } : {}),
      ...(payload.source ? { source: payload.source } : {}),
      ...(payload.textRef ? { textRef: payload.textRef } : {}),
    };

    if (changeKind === "created" || changeKind === undefined) {
      if (removed.has(entry.entityId)) {
        removed.delete(entry.entityId);
        modified.set(entry.entityId, item);
      } else {
        added.set(entry.entityId, item);
      }
    } else if (changeKind === "updated") {
      if (added.has(entry.entityId)) {
        added.set(entry.entityId, item);
      } else {
        modified.set(entry.entityId, item);
      }
    }
  }

  const sortItems = (items: EntityChangeItem[]) =>
    items.sort((a, b) => {
      const typeCmp = a.type.localeCompare(b.type);
      if (typeCmp !== 0) return typeCmp;
      return a.id.localeCompare(b.id);
    });

  return {
    added: sortItems(Array.from(added.values())),
    modified: sortItems(Array.from(modified.values())),
    removed: sortItems(Array.from(removed.values())),
    relationshipsChanged,
  };
}

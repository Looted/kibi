export interface AuditEntityPayload {
  kind: "entity";
  entityType: string;
  changeKind?: "created" | "updated";
  title?: string;
  source?: string;
  textRef?: string;
  properties: Record<string, unknown>;
}

export interface AuditEntry {
  timestamp: string;
  operation: "upsert" | "delete" | "upsert_rel";
  entityId: string;
  payload?: AuditEntityPayload | Record<string, unknown>;
}

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

interface EntityState {
  sawCreate: boolean;
  sawLegacyUpsert: boolean;
  deleted: boolean;
  lastKnown: EntityChangeItem;
}

function isEntityPayload(
  payload: AuditEntry["payload"],
): payload is AuditEntityPayload {
  return payload?.kind === "entity";
}

function toChangeItem(
  payload: AuditEntityPayload,
  entityId: string,
): EntityChangeItem {
  const title =
    payload.title ??
    (typeof payload.properties.title === "string"
      ? (payload.properties.title as string)
      : undefined);
  const source =
    payload.source ??
    (typeof payload.properties.source === "string"
      ? (payload.properties.source as string)
      : undefined);
  const textRef =
    payload.textRef ??
    (typeof payload.properties.text_ref === "string"
      ? (payload.properties.text_ref as string)
      : undefined);

  return {
    id: entityId,
    type: payload.entityType,
    ...(title ? { title } : {}),
    ...(source ? { source } : {}),
    ...(textRef ? { textRef } : {}),
  };
}

function compareChangeItems(
  left: EntityChangeItem,
  right: EntityChangeItem,
): number {
  return left.type.localeCompare(right.type) || left.id.localeCompare(right.id);
}

export function reconcileAuditEntries(entries: AuditEntry[]): ReconcileResult {
  const states = new Map<string, EntityState>();
  let relationshipsChanged = 0;

  for (const entry of [...entries].sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp),
  )) {
    if (entry.operation === "upsert_rel") {
      relationshipsChanged += 1;
      continue;
    }

    if (entry.operation === "delete") {
      const state = states.get(entry.entityId);
      if (state) state.deleted = true;
      continue;
    }

    const payload = entry.payload;
    if (!isEntityPayload(payload)) {
      continue;
    }

    const previous = states.get(entry.entityId);
    states.set(entry.entityId, {
      sawCreate: previous?.sawCreate || payload.changeKind === "created",
      sawLegacyUpsert: previous?.sawLegacyUpsert || !payload.changeKind,
      deleted: false,
      lastKnown: toChangeItem(payload, entry.entityId),
    });
  }

  const added: EntityChangeItem[] = [];
  const modified: EntityChangeItem[] = [];
  const removed: EntityChangeItem[] = [];

  for (const state of states.values()) {
    if (state.deleted) {
      if (state.sawCreate) {
        continue;
      }
      removed.push(state.lastKnown);
      continue;
    }

    if (state.sawCreate || state.sawLegacyUpsert) {
      added.push(state.lastKnown);
      continue;
    }

    modified.push(state.lastKnown);
  }

  added.sort(compareChangeItems);
  modified.sort(compareChangeItems);
  removed.sort(compareChangeItems);

  return {
    added,
    modified,
    removed,
    relationshipsChanged,
  };
}

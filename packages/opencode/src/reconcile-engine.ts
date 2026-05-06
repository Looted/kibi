import type { AuditEntityPayload, AuditEntry } from "./idle-brief-audit.js";

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
  lastFingerprint?: string;
  lastKnown?: EntityChangeItem;
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return normalizeWhitespace(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== "created_at" && key !== "updated_at")
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, normalizeValue(entry)]),
    );
  }

  return value;
}

function fingerprintPayload(payload: AuditEntityPayload): string {
  return JSON.stringify(normalizeValue(payload.properties));
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

export function reconcileAuditEntries(
  // implements REQ-opencode-kibi-briefing-v6
  entries: AuditEntry[],
): ReconcileResult {
  const states = new Map<string, EntityState>();
  let relationshipsChanged = 0;

  for (const entry of [...entries].sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp),
  )) {
    if (entry.operation === "upsert_rel") {
      relationshipsChanged += 1;
      continue;
    }

    const state = states.get(entry.entityId) ?? {
      sawCreate: false,
      sawLegacyUpsert: false,
      deleted: false,
    };

    if (entry.operation === "delete") {
      state.deleted = true;
      states.set(entry.entityId, state);
      continue;
    }

    if (!isEntityPayload(entry.payload)) {
      continue;
    }

    if (entry.payload.changeKind === "created") {
      state.sawCreate = true;
    }

    if (!entry.payload.changeKind) {
      state.sawLegacyUpsert = true;
    }

    state.lastKnown = toChangeItem(entry.payload, entry.entityId);
    state.lastFingerprint = fingerprintPayload(entry.payload);
    state.deleted = false;
    states.set(entry.entityId, state);
  }

  const added: EntityChangeItem[] = [];
  const modified: EntityChangeItem[] = [];
  const removed: EntityChangeItem[] = [];

  for (const state of states.values()) {
    if (!state.lastKnown) {
      continue;
    }

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

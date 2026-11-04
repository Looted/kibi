/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { splitTopLevelGeneral } from "./codec.js";
import { describeLockHolderPid } from "./store-lock.js";

/**
 * Structured transport for Prolog errors.
 *
 * kb.pl throws ISO-style terms (`error(permission_error(save, kb,
 * stale_snapshot), Context)`). The query wrappers in prolog.ts write the
 * thrown term — quoted, depth-bounded — to stderr behind this sentinel so
 * TypeScript can classify the term structurally instead of re-parsing SWI's
 * human-readable print_message output. Text heuristics remain only as a
 * fallback for errors that never pass through a wrapper (startup failures,
 * older kibi-core versions).
 */
// implements REQ-core-prolog-process-management
export const PROLOG_ERROR_TERM_PREFIX = "__KIBI_ERROR__:";

// implements REQ-core-prolog-process-management
export type PrologErrorCode =
  | "stale_snapshot"
  | "audit_locked"
  | "permission_denied"
  | "entity_not_found"
  | "invalid_relationship"
  | "contradiction"
  | "validation_error";

// implements REQ-core-prolog-process-management
export type PrologErrorRelationship = Readonly<{
  relType: string;
  fromType: string;
  toType: string;
}>;

// implements REQ-core-prolog-process-management
export type PrologErrorConflict = Readonly<{
  reason: string;
  otherId: string;
}>;

// implements REQ-core-prolog-process-management
export type PrologStoreLockOwner = Readonly<{
  pid?: number;
  workspaceRoot?: string;
  bootId?: string;
  startedAt?: string;
}>;

export type PrologStoreLockedDetail = Readonly<{
  owner: PrologStoreLockOwner | null;
  lockDirectory: string;
  originalError?: string;
}>;

export type PrologErrorRecord = Readonly<{
  code: PrologErrorCode;
  message: string;
  entityId?: string;
  role?: "source" | "target";
  relationship?: PrologErrorRelationship;
  conflicts?: readonly PrologErrorConflict[];
  storeLocked?: PrologStoreLockedDetail;
}>;

/** The first structured error term line of `text`, behind the sentinel. */
const ERROR_TERM_LINE = new RegExp(`^${PROLOG_ERROR_TERM_PREFIX}(.+)`, "m");

/** Extract the first structured error term line from raw stderr text. */
// implements REQ-core-prolog-process-management
export function extractPrologErrorRecord(
  text: string,
): PrologErrorRecord | null {
  const term = ERROR_TERM_LINE.exec(text)?.[1];
  if (term === undefined) return null;
  return parsePrologErrorTerm(term);
}

/** Parse a written error term such as `error(permission_error(...), Context)`. */
// implements REQ-core-prolog-process-management
export function parsePrologErrorTerm(
  termText: string,
): PrologErrorRecord | null {
  const trimmed = termText.trim();
  const formalMatch = trimmed.match(/^error\((.*)\)$/s);
  const formalAndContext = formalMatch?.[1];
  if (formalAndContext === undefined) return null;

  const [formalRaw, contextRaw] = splitTopLevelGeneral(formalAndContext, ",");
  if (!formalRaw) return null;

  const contextMessage = contextRaw
    ? parseContextMessage(contextRaw)
    : undefined;
  const parsed = parseFormalTerm(formalRaw);
  if (!parsed) return null;

  switch (parsed.kind) {
    case "invalid_relationship": {
      const formatted = contextRaw
        ? parseInvalidRelationshipContext(contextRaw)
        : null;
      const relationship =
        formatted !== null
          ? substituteRelationshipArgs(
              formatted.formatTemplate,
              formatted.formatArgs,
            )
          : null;
      if (relationship === null) {
        return {
          code: "invalid_relationship",
          message: "Invalid relationship type or direction",
        };
      }
      return {
        code: "invalid_relationship",
        relationship,
        message: `Invalid relationship: ${relationship.relType} from ${relationship.fromType} to ${relationship.toType}`,
      };
    }
    case "stale_snapshot":
      return {
        code: "stale_snapshot",
        message:
          "KB snapshot is stale; reattach or refresh the runtime before retrying (stale_snapshot)",
      };
    case "audit_locked":
      return {
        code: "audit_locked",
        message:
          "Audit journal is locked by another Kibi runtime; restart the stale MCP/CLI session before retrying",
      };
    case "store_locked": {
      const detail = parseStoreLockedContext(contextRaw);
      const holder = detail.owner;
      const holderSummary =
        holder === null
          ? "an unidentified holder"
          : `${holder.pid === undefined ? "pid ?" : describeLockHolderPid(holder.pid)}${holder.workspaceRoot !== undefined ? ` for ${holder.workspaceRoot}` : ""}${holder.startedAt !== undefined ? ` since ${holder.startedAt}` : ""}`;
      return {
        code: "permission_denied",
        storeLocked: detail,
        message: `Branch store is locked by ${holderSummary}; close that session or, if it is dead, retry so Kibi can break the stale lock (store_locked)`,
      };
    }
    case "permission_denied":
      return {
        code: "permission_denied",
        message: "Access denied or KB locked",
      };
    case "entity_not_found": {
      const entityId = unquoteAtom(parsed.entityId);
      const role = parseEntityRole(contextMessage);
      const verb =
        role === "source"
          ? "Source entity"
          : role === "target"
            ? "Target entity"
            : "Entity";
      const record: PrologErrorRecord = {
        code: "entity_not_found",
        entityId,
        message: `${verb} does not exist: ${entityId}`,
      };
      return role === undefined ? record : { ...record, role };
    }
    case "contradiction": {
      const conflicts = parsed.pairs.map((pair) => ({
        reason: pair[0],
        otherId: pair[1],
      }));
      return {
        code: "contradiction",
        conflicts,
        message:
          contextMessage ??
          "Contradiction detected: conflicting requirements without a supersedes relationship",
      };
    }
    case "validation_error":
      return {
        code: "validation_error",
        message: parsed.message,
      };
  }
}

/**
 * The message of an error context: the second argument of
 * `context(Predicate, Message)`, or the whole context when it is a plain
 * atom. An empty message is none.
 */
function parseContextMessage(contextRaw: string): string | undefined {
  const inner = contextRaw.trim().match(/^context\((.*)\)$/s)?.[1];
  const message = unquoteAtom(
    inner === undefined
      ? contextRaw
      : (splitTopLevelGeneral(inner, ",")[1] ?? ""),
  );
  return message === "" ? undefined : message;
}

/**
 * The owner journal of a store-locked error, or null when it is missing,
 * empty or not a JSON object.
 */
function parseLockOwner(
  ownerRaw: string | undefined,
): PrologStoreLockOwner | null {
  try {
    // A missing journal throws in unquoteAtom, an empty one in JSON.parse,
    // and a null one at the first field read; each means no owner.
    const parsed = JSON.parse(unquoteAtom(ownerRaw as string)) as {
      pid?: unknown;
      workspaceRoot?: unknown;
      bootId?: unknown;
      startedAt?: unknown;
    };
    if (typeof parsed !== "object") return null;
    return {
      ...(typeof parsed.pid === "number" ? { pid: parsed.pid } : {}),
      ...(typeof parsed.workspaceRoot === "string"
        ? { workspaceRoot: parsed.workspaceRoot }
        : {}),
      ...(typeof parsed.bootId === "string" ? { bootId: parsed.bootId } : {}),
      ...(typeof parsed.startedAt === "string"
        ? { startedAt: parsed.startedAt }
        : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Parse the context of a store-locked error thrown by kb.pl:
 * `kb_store_locked('<owner-json>', '<persistency-directory>')`. The owner JSON
 * is best-effort: any malformed content yields a null owner while the lock
 * directory is still surfaced.
 */
// implements REQ-core-journaled-engine-persistence
function parseStoreLockedContext(
  contextRaw: string | undefined,
): PrologStoreLockedDetail {
  const empty: PrologStoreLockedDetail = {
    owner: null,
    lockDirectory: "",
  };
  if (!contextRaw) return empty;
  const inner = contextRaw.trim().match(/^kb_store_locked\((.*)\)$/s)?.[1];
  if (inner === undefined) return empty;
  const [ownerRaw, lockRaw, originalRaw] = splitTopLevelGeneral(inner, ",");
  // kb.pl preserves the original attach failure so nothing is masked by the
  // store_locked re-brand (e.g. a permissions problem vs a lock clash).
  const originalError = originalRaw ? unquoteAtom(originalRaw) : "";
  return {
    owner: parseLockOwner(ownerRaw),
    lockDirectory: lockRaw ? unquoteAtom(lockRaw) : "",
    ...(originalError !== "" ? { originalError } : {}),
  };
}

type FormalTerm =
  | { kind: "stale_snapshot" }
  | { kind: "audit_locked" }
  | { kind: "permission_denied" }
  | { kind: "store_locked" }
  | { kind: "entity_not_found"; entityId: string }
  | { kind: "invalid_relationship" }
  | { kind: "contradiction"; pairs: Array<[string, string]> }
  | { kind: "validation_error"; message: string };

function parseFormalTerm(formalRaw: string): FormalTerm | null {
  const formal = formalRaw.trim();
  const functorMatch = formal.match(/^([a-z][A-Za-z0-9_]*)\((.*)\)$/s);
  if (functorMatch === null) return null;
  // Both groups always take part in a match.
  const [, functor, argsText] = functorMatch as unknown as [
    string,
    string,
    string,
  ];
  const args = argsText.trim() ? splitTopLevelGeneral(argsText, ",") : [];

  if (functor === "permission_error") {
    const operation = args[0]?.trim();
    const resource = args[1]?.trim();
    const detail = args[2]?.trim();
    if (detail === "stale_snapshot") return { kind: "stale_snapshot" };
    if (operation === "lock" && resource === "audit_log") {
      return { kind: "audit_locked" };
    }
    if (operation === "attach" && resource === "kb_store") {
      return { kind: "store_locked" };
    }
    return { kind: "permission_denied" };
  }

  if (functor === "existence_error" && args[0]?.trim() === "entity") {
    const entityId = args[1];
    if (entityId === undefined) return null;
    return { kind: "entity_not_found", entityId: unquoteAtom(entityId) };
  }

  if (functor === "type_error" && args[0]?.trim() === "relationship") {
    return { kind: "invalid_relationship" };
  }

  if (functor === "kb_contradiction") {
    return { kind: "contradiction", pairs: parseContradictionPairs(args[0]) };
  }

  if (functor === "validation_error") {
    const message = args[0];
    if (message === undefined) return null;
    return { kind: "validation_error", message: unquoteAtom(message) };
  }

  return null;
}

/** Fill the relationship triple from a `'...~w...'-[Rel, From, To]` context. */
function parseInvalidRelationshipContext(
  contextRaw: string,
): { formatTemplate: string; formatArgs: readonly string[] } | null {
  const contextMatch = contextRaw.trim().match(/^context\((.*)\)$/s);
  const inner = contextMatch?.[1];
  if (inner === undefined) return null;
  const parts = splitTopLevelGeneral(inner, ",");
  const formatted = parts[1]?.trim();
  if (formatted === undefined) return null;
  // The greedy first group starts at the beginning anyway.
  const formatMatch = formatted.match(/(.*)-\[(.*)\]$/s);
  if (formatMatch === null) return null;
  // Both groups always take part in a match.
  const [, template, argsText] = formatMatch as unknown as [
    string,
    string,
    string,
  ];
  return {
    formatTemplate: unquoteAtom(template),
    formatArgs: splitTopLevelGeneral(argsText, ",").map(unquoteAtom),
  };
}

function substituteRelationshipArgs(
  template: string,
  args: readonly string[],
): PrologErrorRelationship | null {
  if (args.length < 3) return null;
  const substituted = template
    .split("~w")
    // args[-1] is undefined, so the first chunk gets no argument.
    .map((chunk, index) => `${args[index - 1] ?? ""}${chunk}`)
    .join("");
  const match = substituted.match(
    /^Invalid relationship:\s*(\S+)\s+from\s+(\S+)\s+to\s+(\S+)\s*$/,
  );
  if (match === null) return null;
  // Every group of a match holds at least one character.
  const [, relType, fromType, toType] = match as unknown as [
    string,
    string,
    string,
    string,
  ];
  return { relType, fromType, toType };
}

function parseContradictionPairs(
  listText: string | undefined,
): Array<[string, string]> {
  if (listText === undefined) return [];
  const trimmed = listText.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return [];
  const pairs: Array<[string, string]> = [];
  for (const item of splitTopLevelGeneral(trimmed.slice(1, -1), ",")) {
    const [reason, otherId] = splitTopLevelGeneral(item, "-").map(unquoteAtom);
    if (reason && otherId) pairs.push([reason, otherId]);
  }
  return pairs;
}

function parseEntityRole(
  message: string | undefined,
): "source" | "target" | undefined {
  if (message?.includes("Source entity does not exist")) return "source";
  if (message?.includes("Target entity does not exist")) return "target";
  return undefined;
}

const PROLOG_ESCAPES: Readonly<Record<string, string>> = { n: "\n", t: "\t" };

/**
 * Strip SWI quoted-atom or string quoting and unescape standard character
 * escapes. Strings matter for store_locked: kb.pl reads the owner journal
 * with read_file_to_string, so the owner arrives double-quoted.
 */
function unquoteAtom(value: string): string {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if (
    trimmed.length >= 2 &&
    (quote === "'" || quote === '"') &&
    trimmed.endsWith(quote)
  ) {
    return trimmed
      .slice(1, -1)
      .replace(/\\(.)/gs, (_, char: string) => PROLOG_ESCAPES[char] ?? char);
  }
  return trimmed;
}

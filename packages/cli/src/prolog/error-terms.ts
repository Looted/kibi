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
export type PrologErrorRecord = Readonly<{
  code: PrologErrorCode;
  message: string;
  entityId?: string;
  role?: "source" | "target";
  relationship?: PrologErrorRelationship;
  conflicts?: readonly PrologErrorConflict[];
}>;

/** Extract the first structured error term line from raw stderr text. */
// implements REQ-core-prolog-process-management
export function extractPrologErrorRecord(
  text: string,
): PrologErrorRecord | null {
  const match = text.match(/^__KIBI_ERROR__:(.+)$/m);
  const term = match?.[1];
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

  const context = contextRaw ? parseContextTerm(contextRaw) : null;
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
    case "permission_denied":
      return {
        code: "permission_denied",
        message: "Access denied or KB locked",
      };
    case "entity_not_found": {
      const entityId = unquoteAtom(parsed.entityId);
      const role = parseEntityRole(context?.message);
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
      return role === undefined
        ? record
        : { ...record, role };
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
          context?.message ??
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

type ContextTerm = Readonly<{ predicate?: string; message?: string }>;

function parseContextTerm(contextRaw: string): ContextTerm | null {
  const contextMatch = contextRaw.trim().match(/^context\((.*)\)$/s);
  if (contextMatch?.[1] === undefined) {
    const message = unquoteAtom(contextRaw.trim());
    return message === "" ? null : { message };
  }
  const parts = splitTopLevelGeneral(contextMatch[1], ",");
  if (parts.length === 0) return null;
  const predicate = parts[0]?.trim();
  const message = parts[1] ? unquoteAtom(parts[1].trim()) : "";
  return {
    ...(predicate ? { predicate } : {}),
    ...(message ? { message } : {}),
  };
}

type FormalTerm =
  | { kind: "stale_snapshot" }
  | { kind: "audit_locked" }
  | { kind: "permission_denied" }
  | { kind: "entity_not_found"; entityId: string }
  | { kind: "invalid_relationship" }
  | { kind: "contradiction"; pairs: Array<[string, string]> }
  | { kind: "validation_error"; message: string };

function parseFormalTerm(formalRaw: string): FormalTerm | null {
  const formal = formalRaw.trim();
  const functorMatch = formal.match(/^([a-z][A-Za-z0-9_]*)\((.*)\)$/s);
  if (functorMatch?.[1] === undefined || functorMatch[2] === undefined) {
    return null;
  }
  const functor = functorMatch[1];
  const args = functorMatch[2].trim()
    ? splitTopLevelGeneral(functorMatch[2], ",")
    : [];

  if (functor === "permission_error") {
    const operation = args[0]?.trim();
    const resource = args[1]?.trim();
    const detail = args[2]?.trim();
    if (detail === "stale_snapshot") return { kind: "stale_snapshot" };
    if (operation === "lock" && resource === "audit_log") {
      return { kind: "audit_locked" };
    }
    return { kind: "permission_denied" };
  }

  if (functor === "existence_error" && args[0]?.trim() === "entity") {
    const entityId = args[1]?.trim();
    if (entityId === undefined) return null;
    return { kind: "entity_not_found", entityId: unquoteAtom(entityId) };
  }

  if (functor === "type_error" && args[0]?.trim() === "relationship") {
    return { kind: "invalid_relationship" };
  }

  if (functor === "kb_contradiction") {
    const listText = args[0]?.trim() ?? "[]";
    const pairs = parseContradictionPairs(listText);
    return { kind: "contradiction", pairs };
  }

  if (functor === "validation_error") {
    const message = args[0]?.trim();
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
  const formatMatch = formatted.match(/^(.*)-\[(.*)\]$/s);
  const template = formatMatch?.[1];
  const argsText = formatMatch?.[2];
  if (template === undefined || argsText === undefined) return null;
  const formatArgs = argsText.trim()
    ? splitTopLevelGeneral(argsText, ",").map((arg) => unquoteAtom(arg.trim()))
    : [];
  return { formatTemplate: unquoteAtom(template.trim()), formatArgs };
}

function substituteRelationshipArgs(
  template: string | null,
  args: readonly string[] | null,
): PrologErrorRelationship | null {
  if (template === null || args === null || args.length < 3) return null;
  const substituted = template
    .split("~w")
    .map((chunk, index) =>
      index === 0 ? chunk : `${args[index - 1] ?? ""}${chunk}`,
    )
    .join("");
  const match = substituted.match(
    /^Invalid relationship:\s*(\S+)\s+from\s+(\S+)\s+to\s+(\S+)\s*$/,
  );
  if (!match?.[1] || !match[2] || !match[3]) return null;
  return {
    relType: match[1],
    fromType: match[2],
    toType: match[3],
  };
}

function parseContradictionPairs(
  listText: string,
): Array<[string, string]> {
  const trimmed = listText.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return [];
  const inner = trimmed.slice(1, -1).trim();
  if (inner === "") return [];
  return splitTopLevelGeneral(inner, ",")
    .map((item) => splitTopLevelGeneral(item.trim(), "-"))
    .map((pair) => {
      const reason = pair[0] ?? "";
      const otherId = pair[1] ?? "";
      return [unquoteAtom(reason.trim()), unquoteAtom(otherId.trim())] as [
        string,
        string,
      ];
    })
    .filter((pair) => pair[0] !== "" && pair[1] !== "");
}

function parseEntityRole(
  message: string | undefined,
): "source" | "target" | undefined {
  if (message?.includes("Source entity does not exist")) return "source";
  if (message?.includes("Target entity does not exist")) return "target";
  return undefined;
}

/** Strip SWI quoted-atom quoting and unescape standard character escapes. */
function unquoteAtom(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    trimmed.startsWith("'") &&
    trimmed.endsWith("'")
  ) {
    const inner = trimmed.slice(1, -1);
    return inner
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, "\\")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t");
  }
  return trimmed;
}

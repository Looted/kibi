import { collectGranularityCandidates } from "kibi-plugin-builtin";
import { InputError } from "../../cli-errors.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import {
  ALLOWED_GRANULARITY_REASONS_PROSE,
  type GranularSymbolCandidate,
  type SymbolKind,
  coarseLinkBehavioralNames,
  getBehavioralSymbolNames,
  getNonBehavioralSymbolNames,
  inferSymbolRole,
  isAllowedGranularityReason,
  isTraceabilityRelationshipType,
} from "../../public/symbol-granularity.js";
import { resolveWorkspaceSourceAbsolute } from "../../utils/repo-relative-path.js";
import type { RelationshipInput } from "./types.js";

function candidate(name: string, kind: SymbolKind): GranularSymbolCandidate {
  return { name, kind, role: inferSymbolRole(kind) };
}

/**
 * Granularity candidates must include bare unique method names (parity with
 * the pre-plugin `collectGranularityCandidates` behavior). The extractor
 * symbol list alone is too narrow and rejects previously-valid upserts.
 */
function candidates(
  filePath: string,
  content: string,
): GranularSymbolCandidate[] {
  return collectGranularityCandidates(filePath, content)
    .map((item) => candidate(item.name, item.kind as SymbolKind))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function summarized(names: readonly string[]): string {
  const shown = names.slice(0, 10);
  const hidden = names.length - shown.length;
  return `${shown.join(", ")}${hidden > 0 ? `, and ${hidden} more` : ""}`;
}

/**
 * The error code of an upsert refused for a coarse symbol link, so the MCP
 * error envelope and the CLI JSON route carry the same code as the staged
 * gate's symbol_granularity_violation.
 */
// implements REQ-kibi-symbol-link-guidance
export const SYMBOL_GRANULARITY_VIOLATION = "SYMBOL_GRANULARITY_VIOLATION";

const STORED_LOCATION_FIELDS = [
  "title",
  "sourceFile",
  "symbol_role",
  "granularity_reason",
] as const;

// implements REQ-kibi-symbol-link-guidance
/**
 * The symbol a granularity check judges when an upsert updates a stored
 * symbol: a payload that only adds links (title and relationships, no
 * sourceFile) still links the stored symbol's file, so the fields the check
 * reads fall back to the stored entity. Fields the payload sets win.
 */
function withStoredSymbolLocation(
  entity: Readonly<Record<string, unknown>>,
  stored: Readonly<Record<string, unknown>> | null | undefined,
): Readonly<Record<string, unknown>> {
  if (entity.type !== "symbol" || stored === null || stored === undefined)
    return entity;
  const merged: Record<string, unknown> = { ...entity };
  for (const field of STORED_LOCATION_FIELDS) {
    if (merged[field] === undefined && stored[field] !== undefined)
      merged[field] = stored[field];
  }
  return merged;
}

// implements REQ-kibi-operation-interface-parity, REQ-kibi-symbol-link-guidance
export async function validateSymbolGranularity(
  payload: Readonly<Record<string, unknown>>,
  relationships: readonly RelationshipInput[],
  context: OperationContext,
  stored?: () => Promise<Readonly<Record<string, unknown>> | null | undefined>,
): Promise<void> {
  if (payload.type !== "symbol") return;
  if (
    !relationships.some((relationship) =>
      isTraceabilityRelationshipType(relationship.type),
    )
  )
    return;
  const entity =
    stored === undefined
      ? payload
      : withStoredSymbolLocation(payload, await stored());
  if (isAllowedGranularityReason(entity.granularity_reason)) return;
  if (typeof entity.sourceFile !== "string" || typeof entity.title !== "string")
    return;
  const fs = context.fs;
  if (fs === undefined) return;
  const sourcePath = resolveWorkspaceSourceAbsolute(
    context.workspaceRoot,
    entity.sourceFile,
  );
  if (sourcePath === null) return;
  let content: string;
  try {
    const stat = await fs.stat(sourcePath);
    if (!stat.isFile()) return;
    content = await fs.readFile(sourcePath);
  } catch (error) {
    if (error instanceof Error) return;
    throw error;
  }
  const available = candidates(entity.sourceFile, content);
  const exact = available.find(({ name }) => name === entity.title);
  // A declaration named like the symbol is coarse only through its own
  // behavioral members (a class and its public methods), the same test the
  // staged gate and `kibi check` apply; any other title is judged against
  // every behavioral declaration in the file. An exported constant is its
  // own declaration with exact coordinates (a certificate proof's domain is
  // one), so it is granular whatever its role.
  const behavioral = exact
    ? coarseLinkBehavioralNames(entity.title, available)
    : getBehavioralSymbolNames(available);
  if (behavioral.length === 0) return;
  const nonBehavioral = getNonBehavioralSymbolNames(available);
  const ignored =
    nonBehavioral.length > 0
      ? ` Non-behavioral symbols in the file were ignored for this decision: ${summarized(nonBehavioral)}.`
      : "";
  throw new InputError(
    SYMBOL_GRANULARITY_VIOLATION,
    `Symbol ${String(entity.id)} links ${entity.sourceFile} coarsely while granular symbols are available (behavioral only): ${summarized(behavioral)}. Move relationships to a behavioral symbol, add a manifest behavioral anchor, or set granularity_reason to ${ALLOWED_GRANULARITY_REASONS_PROSE}.${ignored}`,
  );
}

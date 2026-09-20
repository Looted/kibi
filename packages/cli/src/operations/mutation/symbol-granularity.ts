import path from "node:path";
import { collectGranularityCandidates } from "kibi-plugin-builtin";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import {
  ALLOWED_GRANULARITY_REASONS_PROSE,
  type GranularSymbolCandidate,
  type SymbolKind,
  getBehavioralSymbolNames,
  getNonBehavioralSymbolNames,
  inferSymbolRole,
  isAllowedGranularityReason,
  isTraceabilityRelationshipType,
} from "../../public/symbol-granularity.js";
import type { RelationshipInput } from "./types.js";

function candidate(name: string, kind: SymbolKind): GranularSymbolCandidate {
  return { name, kind, role: inferSymbolRole(kind) };
}

function candidates(
  filePath: string,
  content: string,
): GranularSymbolCandidate[] {
  return collectGranularityCandidates(filePath, content).map((item) =>
    candidate(item.name, item.kind as SymbolKind),
  );
}

function summarized(names: readonly string[]): string {
  const shown = names.slice(0, 10);
  const hidden = names.length - shown.length;
  return `${shown.join(", ")}${hidden > 0 ? `, and ${hidden} more` : ""}`;
}

// implements REQ-kibi-operation-interface-parity
export async function validateSymbolGranularity(
  entity: Readonly<Record<string, unknown>>,
  relationships: readonly RelationshipInput[],
  context: OperationContext,
): Promise<void> {
  if (entity.type !== "symbol") return;
  if (
    !relationships.some((relationship) =>
      isTraceabilityRelationshipType(relationship.type),
    )
  )
    return;
  if (isAllowedGranularityReason(entity.granularity_reason)) return;
  if (typeof entity.sourceFile !== "string" || typeof entity.title !== "string")
    return;
  const fs = context.fs;
  if (fs === undefined) return;
  const sourcePath = path.isAbsolute(entity.sourceFile)
    ? entity.sourceFile
    : path.resolve(context.workspaceRoot, entity.sourceFile);
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
  if (exact && (exact.kind !== "variable" || entity.symbol_role === "config"))
    return;
  const behavioral = getBehavioralSymbolNames(available);
  if (behavioral.length === 0) return;
  const nonBehavioral = getNonBehavioralSymbolNames(available);
  const ignored =
    nonBehavioral.length > 0
      ? ` Non-behavioral symbols in the file were ignored for this decision: ${summarized(nonBehavioral)}.`
      : "";
  throw new Error(
    `Symbol ${String(entity.id)} links ${entity.sourceFile} coarsely while granular symbols are available (behavioral only): ${summarized(behavioral)}. Move relationships to a behavioral symbol, add a manifest behavioral anchor, or set granularity_reason to ${ALLOWED_GRANULARITY_REASONS_PROSE}.${ignored}`,
  );
}

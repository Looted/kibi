import path from "node:path";
import { Project, ScriptKind } from "ts-morph";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import {
  type GranularSymbolCandidate,
  type SymbolKind,
  getBehavioralSymbolNames,
  getNonBehavioralSymbolNames,
  inferSymbolRole,
  isAllowedGranularityReason,
  isTraceabilityRelationshipType,
} from "../../public/symbol-granularity.js";
import type { RelationshipInput } from "./types.js";

function scriptKind(filePath: string): ScriptKind {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".tsx") return ScriptKind.TSX;
  if ([".ts", ".mts", ".cts"].includes(extension)) return ScriptKind.TS;
  if (extension === ".jsx") return ScriptKind.JSX;
  return ScriptKind.JS;
}

function candidate(name: string, kind: SymbolKind): GranularSymbolCandidate {
  return { name, kind, role: inferSymbolRole(kind) };
}

function candidates(
  filePath: string,
  content: string,
): GranularSymbolCandidate[] {
  const source = new Project({
    skipAddingFilesFromTsConfig: true,
  }).createSourceFile(`${filePath}::granularity`, content, {
    overwrite: true,
    scriptKind: scriptKind(filePath),
  });
  const found: GranularSymbolCandidate[] = [];
  const methodCounts = new Map<string, number>();
  const bareMethods = new Map<string, GranularSymbolCandidate>();
  for (const fn of source.getFunctions()) {
    const name = fn.getName();
    if (fn.isExported() && name) found.push(candidate(name, "function"));
  }
  for (const cls of source.getClasses()) {
    if (!cls.isExported()) continue;
    const className = cls.getName();
    if (className) found.push(candidate(className, "class"));
    for (const method of cls.getMethods()) {
      const name = method.getName();
      if (className) found.push(candidate(`${className}.${name}`, "method"));
      bareMethods.set(name, candidate(name, "method"));
      methodCounts.set(name, (methodCounts.get(name) ?? 0) + 1);
    }
  }
  for (const [name, count] of methodCounts) {
    const method = bareMethods.get(name);
    if (count === 1 && method) found.push(method);
  }
  for (const item of source.getInterfaces()) {
    if (item.isExported()) found.push(candidate(item.getName(), "interface"));
  }
  for (const item of source.getTypeAliases()) {
    if (item.isExported()) found.push(candidate(item.getName(), "type"));
  }
  for (const item of source.getEnums()) {
    if (item.isExported()) found.push(candidate(item.getName(), "enum"));
  }
  return found.sort((left, right) => left.name.localeCompare(right.name));
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
  if (available.some(({ name }) => name === entity.title)) return;
  const behavioral = getBehavioralSymbolNames(available);
  if (behavioral.length === 0) return;
  const nonBehavioral = getNonBehavioralSymbolNames(available);
  const ignored =
    nonBehavioral.length > 0
      ? ` Non-behavioral symbols in the file were ignored for this decision: ${summarized(nonBehavioral)}.`
      : "";
  throw new Error(
    `Symbol ${String(entity.id)} links ${entity.sourceFile} coarsely while granular symbols are available (behavioral only): ${summarized(behavioral)}. Move relationships to a behavioral symbol, add a manifest behavioral anchor, or set granularity_reason to config-artifact, module-level-behavior, extractor-miss, or legacy-link.${ignored}`,
  );
}

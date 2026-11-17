import {
  type ExtractionResult,
  extractFromMarkdownString,
} from "../../extractors/markdown.js";
import {
  type StagedFile,
  parseDeletionPoints,
} from "../../traceability/git-staged.js";
import type { ExtractedSymbol } from "../../traceability/symbol-extract.js";
import {
  type FirmEditGateOptions,
  type RemovedFirmSymbol,
  firmRequirementRestated,
  removedSymbolRecords,
} from "./firm-edit-gate.js";

/**
 * The firm-edit gate's view of a staged change (`kibi check --staged`):
 * every symbol of each changed source file with the hunks it owns, the
 * places where the change only removed lines, the symbol records it removes,
 * and whether it restates each requirement.
 */
export type StagedFirmEditInput = {
  readonly sourceFiles: readonly StagedFile[];
  /** Every symbol of a staged source file, each with the hunks it owns. */
  readonly extractAll: (file: StagedFile) => Promise<ExtractedSymbol[]>;
  /**
   * Every symbol of a staged source file before the change (at its old path
   * for a rename); empty for a file the change adds.
   */
  readonly extractBase: (file: StagedFile) => Promise<ExtractedSymbol[]>;
  /** Paths the change adds, edits or removes. */
  readonly changedPaths: ReadonlySet<string>;
  /** The authored knowledge in the change. */
  readonly knowledge: readonly ExtractionResult[];
  /** The authored knowledge before the change. */
  readonly readBaseKnowledge: () => readonly ExtractionResult[];
  /** A file's text in the change; undefined when absent. */
  readonly readChanged: (path: string) => string | undefined;
  /** A file's text before the change; undefined when absent. */
  readonly readBase: (path: string) => string | undefined;
  readonly readContent: FirmEditGateOptions["readContent"];
  readonly readReceipt: FirmEditGateOptions["readReceipt"];
  readonly hasUnstagedChanges: (file: string) => boolean;
};

const SYMBOL_MANIFESTS = new Set([".kb/symbols.yaml", ".kb/symbols.yml"]);

function statusOf(text: string, source: string): unknown {
  try {
    return extractFromMarkdownString(text, source).entity.status;
  } catch {
    // A base document that no longer parses has no status to compare.
  }
  return undefined;
}

/** A symbol record's source file, as removedSymbolRecords reads it. */
function recordFile(result: ExtractionResult): string {
  return result.sourceFile ?? result.entity.source;
}

/**
 * Records the change keeps whose declaration it removes: the file is
 * deleted, emptied or renamed away from the record, or the declaration is
 * gone or no longer exported. Each is judged like a removed record, since
 * hiding the code of a firm rule changes it at least as much as an edit. A
 * record whose declaration was not found before the change either (a form
 * the extractor does not list) is left out.
 */
async function vanishedDeclarations(
  input: StagedFirmEditInput,
  symbolsByFile: ReadonlyMap<string, readonly ExtractedSymbol[]>,
  readBaseRecords: () => readonly ExtractionResult[],
): Promise<RemovedFirmSymbol[]> {
  const current = new Map(
    input.knowledge
      .filter((result) => result.entity.type === "symbol")
      .map((result) => [result.entity.id, result] as const),
  );
  const base = readBaseRecords().filter(
    (result) =>
      result.entity.type === "symbol" && current.has(result.entity.id),
  );
  const vanished: RemovedFirmSymbol[] = [];
  for (const file of input.sourceFiles) {
    const basePath = file.oldPath ?? file.path;
    const records = base.flatMap((result) => {
      const requirementIds = [
        ...new Set(
          result.relationships
            .filter(
              (relationship) =>
                relationship.type === "implements" &&
                relationship.to.startsWith("REQ-"),
            )
            .map((relationship) => relationship.to),
        ),
      ];
      return recordFile(result) === basePath && requirementIds.length > 0
        ? [{ result, requirementIds }]
        : [];
    });
    if (records.length === 0) continue;
    const before = new Set(
      (await input.extractBase(file)).map((symbol) => symbol.name),
    );
    const after = new Set(
      (symbolsByFile.get(file.path) ?? []).map((symbol) => symbol.name),
    );
    for (const { result, requirementIds } of records) {
      const title = result.entity.title;
      if (!before.has(title)) continue;
      const now = current.get(result.entity.id) as ExtractionResult;
      if (recordFile(now) === file.path && after.has(title)) continue;
      vanished.push({ sourceFile: basePath, symbol: title, requirementIds });
    }
  }
  return vanished;
}

export async function stagedFirmEditGateOptions(
  input: StagedFirmEditInput,
): Promise<FirmEditGateOptions> {
  const symbolsByFile = new Map<string, readonly ExtractedSymbol[]>();
  const deletedAfterByFile = new Map<string, readonly number[]>();
  for (const file of input.sourceFiles) {
    if (file.content === undefined) continue;
    symbolsByFile.set(file.path, await input.extractAll(file));
    deletedAfterByFile.set(file.path, parseDeletionPoints(file.diffText ?? ""));
  }
  const manifestChanged = [...SYMBOL_MANIFESTS].some((path) =>
    input.changedPaths.has(path),
  );
  const shardChanged = [...input.changedPaths].some((path) =>
    path.startsWith(".kb/relationships/"),
  );
  let baseKnowledge: readonly ExtractionResult[] | undefined;
  // The base records are the current ones unless the change edits a
  // manifest or a relationship shard, so the base is read only then.
  const readBaseRecords = () => {
    if (!manifestChanged && !shardChanged) return input.knowledge;
    baseKnowledge ??= input.readBaseKnowledge();
    return baseKnowledge;
  };
  // Removing a record needs a manifest change.
  const removedSymbols = [
    ...(manifestChanged
      ? removedSymbolRecords(readBaseRecords(), input.knowledge)
      : []),
    ...(await vanishedDeclarations(input, symbolsByFile, readBaseRecords)),
  ];
  const supersededInChange = (id: string) =>
    input.knowledge.some(
      (result) =>
        result.relationships.some(
          (relationship) =>
            relationship.type === "supersedes" && relationship.to === id,
        ) &&
        (shardChanged || input.changedPaths.has(result.entity.source)),
    );
  return {
    symbolsByFile,
    deletedAfterByFile,
    removedSymbols,
    readContent: input.readContent,
    readRequirement: (id) =>
      input.knowledge.find((result) => result.entity.id === id)?.entity,
    readRequirementText: (requirement) => input.readChanged(requirement.source),
    requirementChanged: (requirement) => {
      const baseText = input.readBase(requirement.source);
      return firmRequirementRestated({
        requirement,
        documentText: input.readChanged(requirement.source),
        baseText,
        baseStatus:
          baseText === undefined
            ? undefined
            : String(statusOf(baseText, requirement.source)),
        supersededInChange: supersededInChange(requirement.id),
      });
    },
    readReceipt: input.readReceipt,
    hasUnstagedChanges: input.hasUnstagedChanges,
  };
}

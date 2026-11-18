import { firmEditFileHash } from "kibi-agent-core/firm-edit-review";
import { isRetiredStatus } from "kibi-agent-core/snippets";
import type { ExtractionResult } from "../../extractors/markdown.js";
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
  /**
   * The other staged entries: deleted, renamed to a path that is not
   * source, binary, or in an encoding Kibi does not read. They hold no
   * declarations the gate can read after the change, so a record that
   * points at one of them before the change is judged as removed.
   */
  readonly unreadFiles?: readonly StagedFile[];
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
  const byFile = new Map<
    string,
    { result: ExtractionResult; requirementIds: string[] }[]
  >();
  for (const result of base) {
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
    if (requirementIds.length === 0) continue;
    const list = byFile.get(recordFile(result)) ?? [];
    list.push({ result, requirementIds });
    byFile.set(recordFile(result), list);
  }
  const read = new Set(input.sourceFiles.map((file) => file.path));
  for (const file of [
    ...input.sourceFiles,
    ...(input.unreadFiles ?? []).filter((entry) => !read.has(entry.path)),
  ]) {
    const basePath = file.oldPath ?? file.path;
    const records = byFile.get(basePath) ?? [];
    if (records.length === 0) continue;
    const before = new Set(
      (await input.extractBase(file)).map((symbol) => symbol.name),
    );
    const after = new Set(
      (symbolsByFile.get(file.path) ?? []).map((symbol) => symbol.name),
    );
    for (const { result, requirementIds } of records) {
      const title = result.entity.title;
      const now = current.get(result.entity.id) as ExtractionResult;
      const kept = recordFile(now) === file.path;
      if (!before.has(title)) {
        // A file-level record stands for the whole file, so any change of
        // the file edits it; a declaration-level record the extractor did
        // not list before the change is left out.
        if (result.entity.granularity_reason === undefined) continue;
        const text = kept ? input.readChanged(file.path) : undefined;
        vanished.push({
          sourceFile: basePath,
          symbol: title,
          requirementIds,
          ...(text === undefined ? {} : { codeHash: firmEditFileHash(text) }),
        });
        continue;
      }
      if (kept && after.has(title)) continue;
      vanished.push({ sourceFile: basePath, symbol: title, requirementIds });
    }
  }
  return vanished;
}

/**
 * The current requirement in the change that supersedes `id`, if any: a
 * retired successor replaces nothing.
 */
export function currentSuccessor(
  knowledge: readonly ExtractionResult[],
  id: string,
): string | undefined {
  return knowledge.find(
    (result) =>
      result.entity.type === "req" &&
      result.entity.id !== id &&
      !isRetiredStatus(result.entity.status as string | undefined) &&
      result.relationships.some(
        (relationship) =>
          relationship.type === "supersedes" && relationship.to === id,
      ),
  )?.entity.id;
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
    supersededBy: (id) => currentSuccessor(input.knowledge, id),
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
        supersededInChange: supersededInChange(requirement.id),
      });
    },
    readReceipt: input.readReceipt,
    hasUnstagedChanges: input.hasUnstagedChanges,
  };
}

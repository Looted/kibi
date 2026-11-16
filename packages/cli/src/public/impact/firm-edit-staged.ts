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
  // Removing a record needs a manifest change.
  const removedSymbols = [...SYMBOL_MANIFESTS].some((path) =>
    input.changedPaths.has(path),
  )
    ? removedSymbolRecords(input.readBaseKnowledge(), input.knowledge)
    : [];
  const shardChanged = [...input.changedPaths].some((path) =>
    path.startsWith(".kb/relationships/"),
  );
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

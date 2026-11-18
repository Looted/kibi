import {
  FIRM_EDIT_REMOVED_CODE_HASH,
  type FirmEditReceipt,
  firmEditCodeHash,
  firmEditReceiptMismatch,
  readFirmEditReceipt,
  requirementStatementFromDocument,
} from "kibi-agent-core/firm-edit-review";
import { isRetiredStatus } from "kibi-agent-core/snippets";
import { effectiveFirmness } from "../../decision-firmness.js";
import type {
  ExtractedEntity,
  ExtractionResult,
} from "../../extractors/markdown.js";
import type { KibiImpactDiagnostic } from "../../traceability/staged-diagnostics.js";
import type { ExtractedSymbol } from "../../traceability/symbol-extract.js";

/**
 * A change to code that implements a firm requirement, a rule the person
 * set, is blocked until the agent records its verdict on that code with
 * `kibi review-firm-edit`: a `keeps` receipt bound to the requirement's
 * current statement and the symbol's current code clears it, a `changes`
 * receipt keeps it blocked until the requirement is superseded. This runs in
 * `kibi check --staged`, so it holds on every host and without one.
 */

/** The requirement ids a symbol carries an `implements` link to. */
export function implementedRequirementIds(symbol: ExtractedSymbol): string[] {
  const ids = [...symbol.reqLinks];
  // biome-ignore lint/complexity/noForEach: optional chaining needs no fallback list
  symbol.relationships?.forEach((relationship) => {
    if (relationship.type === "implements") ids.push(relationship.to);
  });
  return [...new Set(ids.filter((id) => id.startsWith("REQ-")))];
}

/**
 * The prose a receipt is bound to. From the requirement document's text it is
 * what the hosts' hooks read too (`requirementStatementFromDocument`), so a
 * receipt matches on both sides; without the text, `semantic_text`, else the
 * title.
 */
export function requirementStatement(
  requirement: ExtractedEntity,
  documentText?: string,
): string {
  return (
    (documentText === undefined
      ? undefined
      : requirementStatementFromDocument(documentText)) ??
    requirement.semantic_text ??
    requirement.title
  );
}

/**
 * Whether a change restates a requirement, so the firmness and supersede
 * checks judge it instead of the firm-edit gate: the requirement is new, its
 * statement or status changed, or a requirement the change adds or edits
 * supersedes it. Any other edit of its document (a note, a tag, a link) does
 * not.
 */
export function firmRequirementRestated(input: {
  requirement: ExtractedEntity;
  /** The requirement document's text in the change. */
  documentText: string | undefined;
  /** The document's text before the change; undefined when it is new. */
  baseText: string | undefined;
  /** The requirement's status before the change. */
  baseStatus: string | undefined;
  /** The requirements the change adds or edits that supersede this one. */
  supersededInChange: boolean;
}): boolean {
  if (input.supersededInChange || input.baseText === undefined) return true;
  if (String(input.requirement.status) !== String(input.baseStatus))
    return true;
  return (
    requirementStatement(input.requirement, input.documentText) !==
    requirementStatementFromDocument(input.baseText)
  );
}

/**
 * Whether a requirement is current and firm, so edits of its code are gated.
 * `supersededBy` names the current requirement that replaces it, if any.
 */
export function isCurrentFirmRequirement(
  requirement: ExtractedEntity,
  supersededBy?: (id: string) => string | undefined,
): boolean {
  if (requirement.type !== "req") return false;
  // A missing status reads as "undefined", which no retired word matches; a
  // closed requirement is done and still governs, as in the hooks, unless a
  // current requirement supersedes it.
  if (isRetiredStatus(requirement.status as string | undefined)) return false;
  if (supersededBy?.(requirement.id) !== undefined) return false;
  return (
    effectiveFirmness("req", requirement.firmness, requirement.origin) ===
    "firm"
  );
}

export type FirmEditReview =
  | { state: "kept"; receipt: FirmEditReceipt }
  | { state: "changes"; receipt: FirmEditReceipt }
  | { state: "missing" }
  | { state: "statement-changed" | "code-changed"; receipt: FirmEditReceipt };

/** The review states that let a staged change of firm code through. */
export const STAGED_PASSING_REVIEW_STATES: readonly FirmEditReview["state"][] =
  ["kept"];

/** How the stored receipt for one requirement and symbol stands now. */
export function reviewState(input: {
  requirementId: string;
  statement: string;
  sourceFile: string;
  symbol: string;
  /** The symbol's code hash now; undefined when it cannot be read. */
  codeHash: string | undefined;
  readReceipt: (relativePath: string) => string | undefined;
}): FirmEditReview {
  const receipt = readFirmEditReceipt(
    input.requirementId,
    input.sourceFile,
    input.symbol,
    input.readReceipt,
  );
  if (receipt === undefined) return { state: "missing" };
  const mismatch = firmEditReceiptMismatch(receipt, {
    statement: input.statement,
    // A code hash that cannot be read matches no receipt.
    codeHash: input.codeHash ?? "",
  });
  if (mismatch !== undefined) return { state: mismatch, receipt };
  return receipt.verdict === "keeps"
    ? { state: "kept", receipt }
    : { state: "changes", receipt };
}

/** The current code hash of an extracted symbol in `content`. */
function symbolCodeHash(
  symbol: ExtractedSymbol,
  content: string | undefined,
): string | undefined {
  return content === undefined
    ? undefined
    : firmEditCodeHash(
        content,
        symbol.location.startLine,
        symbol.location.endLine,
      );
}

/**
 * Whether a change edits a symbol: a changed line it owns, or lines removed
 * between two of its own lines (not inside a declaration nested in it).
 * `deletedAfter` lists the new-file lines after which lines were removed.
 */
export function firmSymbolEdited(
  symbol: ExtractedSymbol,
  fileSymbols: readonly ExtractedSymbol[],
  deletedAfter: readonly number[],
): boolean {
  if (symbol.hunkRanges.length > 0) return true;
  const inside = (span: ExtractedSymbol["location"], line: number) =>
    span.startLine <= line && line < span.endLine;
  return deletedAfter.some(
    (line) =>
      inside(symbol.location, line) &&
      !fileSymbols.some(
        (other) =>
          other !== symbol &&
          symbol.location.startLine <= other.location.startLine &&
          other.location.endLine <= symbol.location.endLine &&
          (other.location.startLine !== symbol.location.startLine ||
            other.location.endLine !== symbol.location.endLine) &&
          inside(other.location, line),
      ),
  );
}

/** A symbol record the change removes, with what it implemented before. */
export type RemovedFirmSymbol = {
  readonly sourceFile: string;
  readonly symbol: string;
  readonly requirementIds: readonly string[];
  /**
   * The whole file's code hash when the change edits the file of a
   * file-level record rather than removing it; absent for a removal.
   */
  readonly codeHash?: string;
};

/**
 * The symbol records of `base` that `current` no longer has (by id), with
 * the requirements each implemented in `base`. Records that implemented
 * nothing are left out.
 */
export function removedSymbolRecords(
  base: readonly ExtractionResult[],
  current: readonly ExtractionResult[],
): RemovedFirmSymbol[] {
  const kept = new Set(
    current
      .filter((result) => result.entity.type === "symbol")
      .map((result) => result.entity.id),
  );
  return base.flatMap((result) => {
    if (result.entity.type !== "symbol" || kept.has(result.entity.id))
      return [];
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
    const sourceFile = result.sourceFile ?? result.entity.source;
    return requirementIds.length === 0
      ? []
      : [{ sourceFile, symbol: result.entity.title, requirementIds }];
  });
}

export type FirmEditGateOptions = {
  /**
   * Symbols per changed file, with the hunks each owns. Only edited symbols
   * are judged (see `firmSymbolEdited`); passing every symbol of a file lets
   * removed lines count too.
   */
  readonly symbolsByFile: ReadonlyMap<string, readonly ExtractedSymbol[]>;
  /** Per file, the new-file lines after which the change removed lines. */
  readonly deletedAfterByFile?: ReadonlyMap<string, readonly number[]>;
  /** Symbol records the change removes. */
  readonly removedSymbols?: readonly RemovedFirmSymbol[];
  /** The changed text of a source file. */
  readonly readContent: (file: string) => string | undefined;
  /** The requirement entity for an id, or undefined when it is unknown. */
  readonly readRequirement: (id: string) => ExtractedEntity | undefined;
  /** The requirement's document text in the change, when it can be read. */
  readonly readRequirementText?: (
    requirement: ExtractedEntity,
  ) => string | undefined;
  /**
   * Whether the change restates the requirement (see
   * `firmRequirementRestated`), which leaves it to the firmness and
   * supersede checks.
   */
  readonly requirementChanged: (requirement: ExtractedEntity) => boolean;
  /**
   * The current requirement that supersedes a requirement, if any: a
   * replaced requirement no longer guards its code.
   */
  readonly supersededBy?: (id: string) => string | undefined;
  /** A receipt file's text, by workspace-relative path; undefined when absent. */
  readonly readReceipt: (relativePath: string) => string | undefined;
  /**
   * Whether the working tree holds edits of the file that the change does
   * not include, so a receipt must be recorded from the staged code.
   */
  readonly hasUnstagedChanges?: (file: string) => boolean;
};

type GatedSymbol = {
  sourceFile: string;
  name: string;
  /** The symbol's code hash in the change; the removed hash when it is gone. */
  codeHash: () => string | undefined;
};

const REASON: Record<Exclude<FirmEditReview["state"], "kept">, string> = {
  missing: "no review recorded",
  "statement-changed": "the requirement changed after the review",
  "code-changed": "the code changed after the review",
  changes: "reviewed as changing the rule",
};

/**
 * One blocking diagnostic per current firm requirement whose implementing
 * code this change edits or removes without a matching `keeps` receipt for
 * every such symbol, whatever kind of declaration the symbol is. A
 * requirement the same change restates is left to the firmness and supersede
 * checks.
 */
export function createFirmEditGateDiagnostics(
  options: FirmEditGateOptions,
): KibiImpactDiagnostic[] {
  const symbolsByRequirement = new Map<string, GatedSymbol[]>();
  const gate = (id: string, symbol: GatedSymbol) => {
    const list = symbolsByRequirement.get(id) ?? [];
    list.push(symbol);
    symbolsByRequirement.set(id, list);
  };
  for (const [file, symbols] of options.symbolsByFile) {
    const deletedAfter = options.deletedAfterByFile?.get(file) ?? [];
    for (const symbol of symbols) {
      if (!firmSymbolEdited(symbol, symbols, deletedAfter)) continue;
      for (const id of implementedRequirementIds(symbol))
        gate(id, {
          sourceFile: symbol.location.file,
          name: symbol.name,
          codeHash: () =>
            symbolCodeHash(symbol, options.readContent(symbol.location.file)),
        });
    }
  }
  for (const removed of options.removedSymbols ?? [])
    for (const id of removed.requirementIds)
      gate(id, {
        sourceFile: removed.sourceFile,
        name: removed.symbol,
        codeHash: () => removed.codeHash ?? FIRM_EDIT_REMOVED_CODE_HASH,
      });
  const diagnostics: KibiImpactDiagnostic[] = [];
  for (const id of [...symbolsByRequirement.keys()].sort()) {
    const requirement = options.readRequirement(id);
    if (
      requirement === undefined ||
      !isCurrentFirmRequirement(requirement, options.supersededBy)
    )
      continue;
    if (options.requirementChanged(requirement)) continue;
    const statement = requirementStatement(
      requirement,
      options.readRequirementText?.(requirement),
    );
    const open: { symbol: GatedSymbol; review: FirmEditReview }[] = [];
    const seen = new Set<string>();
    // id is one of the map's own keys.
    for (const symbol of symbolsByRequirement.get(id) as GatedSymbol[]) {
      const key = `${symbol.sourceFile}\0${symbol.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const review = reviewState({
        requirementId: id,
        statement,
        sourceFile: symbol.sourceFile,
        symbol: symbol.name,
        codeHash: symbol.codeHash(),
        readReceipt: options.readReceipt,
      });
      if (!STAGED_PASSING_REVIEW_STATES.includes(review.state))
        open.push({ symbol, review });
    }
    if (open.length === 0) continue;
    open.sort((left, right) =>
      `${left.symbol.sourceFile}\0${left.symbol.name}`.localeCompare(
        `${right.symbol.sourceFile}\0${right.symbol.name}`,
      ),
    );
    const breaks = open.some(({ review }) => review.state === "changes");
    const unstaged = [
      ...new Set(
        open
          .map(({ symbol }) => symbol.sourceFile)
          .filter((file) => options.hasUnstagedChanges?.(file) === true),
      ),
    ];
    const listed = open
      .map(
        ({ symbol, review }) =>
          `${symbol.name} in ${symbol.sourceFile} (${symbol.codeHash() === FIRM_EDIT_REMOVED_CODE_HASH ? "removed, " : ""}${REASON[review.state as Exclude<FirmEditReview["state"], "kept">]})`,
      )
      .join("; ");
    const reviews = open.map(({ symbol }) => ({
      requirementId: id,
      sourceFile: symbol.sourceFile,
      symbol: symbol.name,
      verdict: "keeps",
      note: "",
    }));
    const reviewInput =
      unstaged.length > 0 ? { reviews, staged: true } : { reviews };
    const unstagedNote =
      unstaged.length > 0
        ? ` ${unstaged.join(", ")} also ${unstaged.length === 1 ? "has" : "have"} unstaged edits, so the input records the staged code ("staged": true).`
        : "";
    const flat = statement.replace(/\s+/g, " ").trim();
    diagnostics.push({
      id: breaks ? "firm_edit_breaks_rule" : "firm_edit_unreviewed",
      severity: "error",
      blocking: true,
      category: "requirement",
      entityId: id,
      // open is sorted by file, so the files come out sorted.
      files: [...new Set(open.map(({ symbol }) => symbol.sourceFile))],
      docs: ["docs/entity-schema.md"],
      message: breaks
        ? `The change edits code that implements ${id}, a firm rule the person set, and the recorded review says the change breaks it: ${listed}. Statement: "${flat}"`
        : `The change edits code that implements ${id}, a firm rule the person set, without a current review of that code: ${listed}. Statement: "${flat}"`,
      suggestion: breaks
        ? `Ask the person whether ${id} should change. With their words, supersede ${id} with kb_upsert (a new requirement with a supersedes link and their words in origin.ref) in this change; otherwise undo the edit.`
        : `Read the changed code against ${id}. If it still does what ${id} says, write a one-line note on why into this input and pipe it to kibi review-firm-edit --input -, then stage the receipt it writes: ${JSON.stringify(reviewInput)}.${unstagedNote} The receipt is your judgment, not the person's approval. If the change no longer does what ${id} says, set verdict "changes" and ask the person before keeping the change.`,
      evidence: {
        requirement: id,
        statement: flat,
        reviews: open.map(({ symbol, review }) => ({
          sourceFile: symbol.sourceFile,
          symbol: symbol.name,
          state: review.state,
        })),
        reviewInput,
      },
    });
  }
  return diagnostics;
}

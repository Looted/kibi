import {
  type FirmEditReceipt,
  firmEditCodeHash,
  firmEditReceiptMismatch,
  firmEditReceiptPath,
  parseFirmEditReceipt,
} from "kibi-agent-core/firm-edit-review";
import { effectiveFirmness } from "../../decision-firmness.js";
import type { ExtractedEntity } from "../../extractors/markdown.js";
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

const RETIRED_STATUS =
  /supersed|deprecat|reject|obsolete|retired|archived|removed|closed/i;

/** The requirement ids a symbol carries an `implements` link to. */
export function implementedRequirementIds(symbol: ExtractedSymbol): string[] {
  const ids = [...symbol.reqLinks];
  // biome-ignore lint/complexity/noForEach: optional chaining needs no fallback list
  symbol.relationships?.forEach((relationship) => {
    if (relationship.type === "implements") ids.push(relationship.to);
  });
  return [...new Set(ids.filter((id) => id.startsWith("REQ-")))];
}

/** The prose a receipt is bound to: `semantic_text`, else the title. */
export function requirementStatement(requirement: ExtractedEntity): string {
  return requirement.semantic_text ?? requirement.title;
}

/** Whether a requirement is current and firm, so edits of its code are gated. */
export function isCurrentFirmRequirement(
  requirement: ExtractedEntity,
): boolean {
  if (requirement.type !== "req") return false;
  // A missing status reads as "undefined", which no retired word matches.
  if (RETIRED_STATUS.test(String(requirement.status))) return false;
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
  symbol: ExtractedSymbol;
  content: string | undefined;
  readReceipt: (relativePath: string) => string | undefined;
}): FirmEditReview {
  const file = input.symbol.location.file;
  // A requirement id always yields a receipt path.
  const receiptPath = firmEditReceiptPath(
    input.requirementId,
    file,
    input.symbol.name,
  ) as string;
  const receipt = parseFirmEditReceipt(input.readReceipt(receiptPath));
  if (
    receipt === undefined ||
    receipt.requirementId !== input.requirementId ||
    receipt.sourceFile !== file ||
    receipt.symbol !== input.symbol.name
  )
    return { state: "missing" };
  const codeHash =
    input.content === undefined
      ? undefined
      : firmEditCodeHash(
          input.content,
          input.symbol.location.startLine,
          input.symbol.location.endLine,
        );
  const mismatch = firmEditReceiptMismatch(receipt, {
    statement: input.statement,
    codeHash,
  });
  if (mismatch !== undefined) return { state: mismatch, receipt };
  return receipt.verdict === "keeps"
    ? { state: "kept", receipt }
    : { state: "changes", receipt };
}

export type FirmEditGateOptions = {
  /** Changed symbols per file; only symbols with changed hunks are judged. */
  readonly symbolsByFile: ReadonlyMap<string, readonly ExtractedSymbol[]>;
  /** The changed text of a source file. */
  readonly readContent: (file: string) => string | undefined;
  /** The requirement entity for an id, or undefined when it is unknown. */
  readonly readRequirement: (id: string) => ExtractedEntity | undefined;
  /** Whether the requirement's document changed in this change. */
  readonly requirementChanged: (requirement: ExtractedEntity) => boolean;
  /** A receipt file's text, by workspace-relative path; undefined when absent. */
  readonly readReceipt: (relativePath: string) => string | undefined;
};

const REASON: Record<Exclude<FirmEditReview["state"], "kept">, string> = {
  missing: "no review recorded",
  "statement-changed": "the requirement changed after the review",
  "code-changed": "the code changed after the review",
  changes: "reviewed as changing the rule",
};

/**
 * One blocking diagnostic per current firm requirement whose implementing
 * code this change edits without a matching `keeps` receipt for every edited
 * symbol. A requirement whose own document changed in the same change is left
 * to the firmness and supersede checks.
 */
export function createFirmEditGateDiagnostics(
  options: FirmEditGateOptions,
): KibiImpactDiagnostic[] {
  const symbolsByRequirement = new Map<string, ExtractedSymbol[]>();
  for (const symbols of options.symbolsByFile.values()) {
    for (const symbol of symbols) {
      if (symbol.role !== "behavioral" || symbol.hunkRanges.length === 0)
        continue;
      for (const id of implementedRequirementIds(symbol)) {
        const list = symbolsByRequirement.get(id) ?? [];
        list.push(symbol);
        symbolsByRequirement.set(id, list);
      }
    }
  }
  const diagnostics: KibiImpactDiagnostic[] = [];
  for (const id of [...symbolsByRequirement.keys()].sort()) {
    const requirement = options.readRequirement(id);
    if (requirement === undefined || !isCurrentFirmRequirement(requirement))
      continue;
    if (options.requirementChanged(requirement)) continue;
    const statement = requirementStatement(requirement);
    const open: { symbol: ExtractedSymbol; review: FirmEditReview }[] = [];
    // id is one of the map's own keys.
    for (const symbol of symbolsByRequirement.get(id) as ExtractedSymbol[]) {
      const review = reviewState({
        requirementId: id,
        statement,
        symbol,
        content: options.readContent(symbol.location.file),
        readReceipt: options.readReceipt,
      });
      if (!STAGED_PASSING_REVIEW_STATES.includes(review.state))
        open.push({ symbol, review });
    }
    if (open.length === 0) continue;
    open.sort((left, right) =>
      `${left.symbol.location.file}\0${left.symbol.name}`.localeCompare(
        `${right.symbol.location.file}\0${right.symbol.name}`,
      ),
    );
    const breaks = open.some(({ review }) => review.state === "changes");
    const listed = open
      .map(
        ({ symbol, review }) =>
          `${symbol.name} in ${symbol.location.file} (${REASON[review.state as Exclude<FirmEditReview["state"], "kept">]})`,
      )
      .join("; ");
    const reviews = open.map(({ symbol }) => ({
      requirementId: id,
      sourceFile: symbol.location.file,
      symbol: symbol.name,
      verdict: "keeps",
      note: "",
    }));
    const reviewInput = { reviews };
    diagnostics.push({
      id: breaks ? "firm_edit_breaks_rule" : "firm_edit_unreviewed",
      severity: "error",
      blocking: true,
      category: "requirement",
      entityId: id,
      // open is sorted by file, so the files come out sorted.
      files: [...new Set(open.map(({ symbol }) => symbol.location.file))],
      docs: ["docs/entity-schema.md"],
      message: breaks
        ? `The change edits code that implements ${id}, a firm rule the person set, and the recorded review says the change breaks it: ${listed}. Statement: "${statement.replace(/\s+/g, " ").trim()}"`
        : `The change edits code that implements ${id}, a firm rule the person set, without a current review of that code: ${listed}. Statement: "${statement.replace(/\s+/g, " ").trim()}"`,
      suggestion: breaks
        ? `Ask the person whether ${id} should change. With their words, supersede ${id} with kb_upsert (a new requirement with a supersedes link and their words in origin.ref) in this change; otherwise undo the edit.`
        : `Read the changed code against ${id}. If it still does what ${id} says, write a one-line note on why into this input and pipe it to kibi review-firm-edit --input -, then stage the receipt it writes: ${JSON.stringify(reviewInput)}. The receipt is your judgment, not the person's approval. If the change no longer does what ${id} says, set verdict "changes" and ask the person before keeping the change.`,
      evidence: {
        requirement: id,
        statement: statement.replace(/\s+/g, " ").trim(),
        reviews: open.map(({ symbol, review }) => ({
          sourceFile: symbol.location.file,
          symbol: symbol.name,
          state: review.state,
        })),
        reviewInput,
      },
    });
  }
  return diagnostics;
}

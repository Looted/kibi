import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Firm-edit review receipts: the agent's recorded verdict that its change to
 * a symbol implementing a firm requirement keeps that rule ("keeps") or
 * breaks it ("changes"). A receipt is the agent's judgment, never the
 * person's approval. It is bound to the requirement's statement and to the
 * symbol's code when it was recorded, so it stops matching when either
 * changes. The CLI writes and checks receipts; the hosts' pre-edit hooks
 * read them, so both sides share these helpers.
 */

/** Workspace-relative directory holding one receipt file per requirement and symbol. */
export const FIRM_EDIT_REVIEWS_DIR = ".kb/firm-edit-reviews";

export const FIRM_EDIT_RECEIPT_VERSION = 1;

export type FirmEditVerdict = "keeps" | "changes";

export type FirmEditReceipt = {
  version: typeof FIRM_EDIT_RECEIPT_VERSION;
  requirementId: string;
  sourceFile: string;
  symbol: string;
  verdict: FirmEditVerdict;
  note: string;
  requestQuote?: string;
  statementHash: string;
  codeHash: string;
  /** The symbol's 1-based line span when the receipt was recorded. */
  startLine: number;
  endLine: number;
  recordedAt: string;
};

const REQUIREMENT_ID = /^REQ-[A-Za-z0-9._-]+$/;

function sha256(text: string): string {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

/**
 * Hash of a requirement statement with its whitespace collapsed, so a
 * statement read from a folded YAML block and one read as a single line hash
 * alike.
 */
export function firmEditStatementHash(statement: string): string {
  return sha256(statement.replace(/\s+/g, " ").trim());
}

/**
 * Hash of the code on lines `startLine`..`endLine` (1-based, inclusive) of
 * `content`, ignoring line endings and trailing whitespace. Undefined when
 * the span is not inside the text.
 */
export function firmEditCodeHash(
  content: string,
  startLine: number,
  endLine: number,
): string | undefined {
  const lines = content.split(/\r?\n/);
  if (
    !Number.isInteger(startLine) ||
    !Number.isInteger(endLine) ||
    startLine < 1 ||
    endLine < startLine ||
    endLine > lines.length
  )
    return undefined;
  return sha256(
    lines
      .slice(startLine - 1, endLine)
      .map((line) => line.trimEnd())
      .join("\n"),
  );
}

/** A file-name-safe rendering of a path or symbol name. */
function fileSafe(text: string): string {
  return text.replace(/\//g, "__").replace(/[^A-Za-z0-9._-]/g, "_");
}

/**
 * Where the receipt for one requirement and one symbol lives, relative to the
 * workspace: one file each, so changes on two branches never edit the same
 * file unless they review the same symbol for the same requirement.
 * Undefined for an id that is not a requirement id.
 */
export function firmEditReceiptPath(
  requirementId: string,
  sourceFile: string,
  symbol: string,
): string | undefined {
  if (!REQUIREMENT_ID.test(requirementId)) return undefined;
  return `${FIRM_EDIT_REVIEWS_DIR}/${requirementId}/${fileSafe(sourceFile)}--${fileSafe(symbol)}.json`;
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** A receipt read from its file's text; undefined when it is not one. */
export function parseFirmEditReceipt(
  text: string,
): FirmEditReceipt | undefined {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof value !== "object" || value === null) return undefined;
  const receipt = value as Record<string, unknown>;
  if (
    receipt.version !== FIRM_EDIT_RECEIPT_VERSION ||
    !isText(receipt.requirementId) ||
    !REQUIREMENT_ID.test(receipt.requirementId) ||
    !isText(receipt.sourceFile) ||
    !isText(receipt.symbol) ||
    (receipt.verdict !== "keeps" && receipt.verdict !== "changes") ||
    typeof receipt.note !== "string" ||
    (receipt.requestQuote !== undefined &&
      typeof receipt.requestQuote !== "string") ||
    !isText(receipt.statementHash) ||
    !isText(receipt.codeHash) ||
    !Number.isInteger(receipt.startLine) ||
    !Number.isInteger(receipt.endLine) ||
    typeof receipt.recordedAt !== "string"
  )
    return undefined;
  return receipt as FirmEditReceipt;
}

/** The receipt as written to its file: stable key order and a final newline. */
export function serializeFirmEditReceipt(receipt: FirmEditReceipt): string {
  const ordered: FirmEditReceipt = {
    version: receipt.version,
    requirementId: receipt.requirementId,
    sourceFile: receipt.sourceFile,
    symbol: receipt.symbol,
    verdict: receipt.verdict,
    note: receipt.note,
    ...(receipt.requestQuote === undefined
      ? {}
      : { requestQuote: receipt.requestQuote }),
    statementHash: receipt.statementHash,
    codeHash: receipt.codeHash,
    startLine: receipt.startLine,
    endLine: receipt.endLine,
    recordedAt: receipt.recordedAt,
  };
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

/**
 * Why a receipt does not match the requirement's current statement and the
 * symbol's current code, or undefined when it matches. `codeHash` is the hash
 * of the symbol's code now; without one, the code on the receipt's own line
 * span of `content` is compared.
 */
export function firmEditReceiptMismatch(
  receipt: FirmEditReceipt,
  current: { statement: string; codeHash?: string; content?: string },
): "statement-changed" | "code-changed" | undefined {
  if (receipt.statementHash !== firmEditStatementHash(current.statement))
    return "statement-changed";
  const codeHash =
    current.codeHash ??
    (current.content === undefined
      ? undefined
      : firmEditCodeHash(current.content, receipt.startLine, receipt.endLine));
  return codeHash === receipt.codeHash ? undefined : "code-changed";
}

/**
 * A `reviewed` callback for `firmRequirementsTouched`: true when the
 * workspace holds a `keeps` receipt for the requirement and symbol that still
 * matches the requirement's statement and the code now in `sourceFile`.
 * Any read or parse failure counts as not reviewed.
 */
export function firmEditReviewed(
  workspaceRoot: string,
  sourceFile: string,
  statementOf: (requirementId: string) => string | undefined,
): (requirementId: string, symbol: { title: string }) => boolean {
  let content: string | undefined;
  return (requirementId, symbol) => {
    const receiptPath = firmEditReceiptPath(
      requirementId,
      sourceFile,
      symbol.title,
    );
    const statement = statementOf(requirementId);
    if (receiptPath === undefined || statement === undefined) return false;
    try {
      const receipt = parseFirmEditReceipt(
        fs.readFileSync(path.join(workspaceRoot, receiptPath), "utf8"),
      );
      if (
        receipt?.verdict !== "keeps" ||
        receipt.requirementId !== requirementId ||
        receipt.sourceFile !== sourceFile ||
        receipt.symbol !== symbol.title
      )
        return false;
      content ??= fs.readFileSync(path.join(workspaceRoot, sourceFile), "utf8");
      return (
        firmEditReceiptMismatch(receipt, { statement, content }) === undefined
      );
    } catch {
      return false;
    }
  };
}

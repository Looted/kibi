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
  // A string is hashed as its UTF-8 bytes.
  return `sha256:${createHash("sha256").update(text).digest("hex")}`;
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

/**
 * The code hash a receipt carries for a symbol the change removes: no span of
 * any file hashes to it, so it matches only a symbol that is gone.
 */
export const FIRM_EDIT_REMOVED_CODE_HASH = "removed";

/** A file-name-safe rendering of a path or symbol name. */
function fileSafe(text: string): string {
  return text.replace(/\//g, "__").replace(/[^A-Za-z0-9._-]/g, "_");
}

/** Characters of the symbol name kept in a receipt file name, for reading. */
const RECEIPT_NAME_PREFIX = 48;

/** Longest file name the receipt directories are written with. */
const MAX_FILE_NAME = 255;

/**
 * Where the receipt for one requirement and one symbol lives, relative to the
 * workspace: one file each, so changes on two branches never edit the same
 * file unless they review the same symbol for the same requirement. The file
 * is named by a hash of the source path and symbol name (after a short
 * readable prefix of the name), so two pairs never share a file and a long
 * path never makes the name too long. Undefined for an id that is not a
 * requirement id.
 */
export function firmEditReceiptPath(
  requirementId: string,
  sourceFile: string,
  symbol: string,
): string | undefined {
  if (!REQUIREMENT_ID.test(requirementId)) return undefined;
  const digest = createHash("sha256")
    .update(`${sourceFile}\0${symbol}`)
    .digest("hex")
    .slice(0, 32);
  const prefix = fileSafe(symbol).slice(0, RECEIPT_NAME_PREFIX);
  return `${FIRM_EDIT_REVIEWS_DIR}/${requirementId}/${prefix}--${digest}.json`;
}

/**
 * Where releases up to 2026.11 wrote the receipt: one name built from the
 * whole path and symbol. Undefined for an id that is not a requirement id or
 * when that name is longer than a file name may be.
 */
export function firmEditLegacyReceiptPath(
  requirementId: string,
  sourceFile: string,
  symbol: string,
): string | undefined {
  if (!REQUIREMENT_ID.test(requirementId)) return undefined;
  const name = `${fileSafe(sourceFile)}--${fileSafe(symbol)}.json`;
  if (name.length > MAX_FILE_NAME) return undefined;
  return `${FIRM_EDIT_REVIEWS_DIR}/${requirementId}/${name}`;
}

/**
 * The receipt for one requirement and symbol, read from its file or, when
 * there is none, from the file an earlier release wrote. A receipt read from
 * either file counts only when it names this requirement, file and symbol.
 */
export function readFirmEditReceipt(
  requirementId: string,
  sourceFile: string,
  symbol: string,
  readFile: (relativePath: string) => string | undefined,
): FirmEditReceipt | undefined {
  for (const receiptPath of [
    firmEditReceiptPath(requirementId, sourceFile, symbol),
    firmEditLegacyReceiptPath(requirementId, sourceFile, symbol),
  ]) {
    if (receiptPath === undefined) continue;
    const receipt = parseFirmEditReceipt(readFile(receiptPath));
    if (
      receipt !== undefined &&
      receipt.requirementId === requirementId &&
      receipt.sourceFile === sourceFile &&
      receipt.symbol === symbol
    )
      return receipt;
  }
  return undefined;
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * A receipt read from its file's text; undefined when there is no text or it
 * is not one.
 */
export function parseFirmEditReceipt(
  text: string | undefined,
): FirmEditReceipt | undefined {
  let value: unknown;
  try {
    value = JSON.parse(text as string);
  } catch {
    // No text, or not JSON: value stays undefined, which has none of the
    // fields.
  }
  // A primitive has none of the fields, so only an object can pass.
  const receipt = (value ?? {}) as Record<string, unknown>;
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
    // JSON.stringify leaves out a quote that is undefined.
    requestQuote: receipt.requestQuote as string,
    statementHash: receipt.statementHash,
    codeHash: receipt.codeHash,
    startLine: receipt.startLine,
    endLine: receipt.endLine,
    recordedAt: receipt.recordedAt,
  };
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

/**
 * Whether `content` still holds the code a receipt hashed on some run of
 * lines as long as the receipt's span, so lines added or removed above the
 * symbol do not make an unchanged symbol read as changed. A receipt for a
 * removed symbol matches no text.
 */
function receiptCodeFound(receipt: FirmEditReceipt, content: string): boolean {
  const length = receipt.endLine - receipt.startLine;
  const lineCount = content.split(/\r?\n/).length;
  for (let start = 1; start + length <= lineCount; start += 1)
    if (firmEditCodeHash(content, start, start + length) === receipt.codeHash)
      return true;
  return false;
}

/**
 * Why a receipt does not match the requirement's current statement and the
 * symbol's current code, or undefined when it matches. `codeHash` is the hash
 * of the symbol's code now; without one, `content` is searched for the
 * receipt's code wherever it now sits.
 */
export function firmEditReceiptMismatch(
  receipt: FirmEditReceipt,
  current: {
    statement: string;
    codeHash?: string | undefined;
    content?: string | undefined;
  },
): "statement-changed" | "code-changed" | undefined {
  if (receipt.statementHash !== firmEditStatementHash(current.statement))
    return "statement-changed";
  if (current.codeHash !== undefined)
    return current.codeHash === receipt.codeHash ? undefined : "code-changed";
  return current.content !== undefined &&
    receiptCodeFound(receipt, current.content)
    ? undefined
    : "code-changed";
}

/** Body headings whose sections hold context, not the requirement's meaning. */
const CONTEXT_HEADING =
  /^(?:context|rationale|why|background|source|notes|evidence)\b/i;
const HEADING_LINE = /^\s{0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;

/** A front matter key's value: plain, quoted, or a `>`/`|` block scalar. */
function frontMatterScalar(
  lines: readonly string[],
  key: string,
): string | undefined {
  const prefix = new RegExp(`^${key}:(?:\\s+(.*?))?\\s*$`);
  const index = lines.findIndex((line) => prefix.test(line));
  if (index === -1) return undefined;
  const raw = (prefix.exec(lines[index] as string) as RegExpExecArray)[1] ?? "";
  // Continuation lines: indented, or blank inside a block scalar.
  const rest: string[] = [];
  for (const line of lines.slice(index + 1)) {
    if (line.trim() !== "" && !/^\s/.test(line)) break;
    rest.push(line);
  }
  if (/^[>|][0-9+-]*$/.test(raw))
    return rest
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .join(" ");
  const text = [raw, ...rest.map((line) => line.trim())]
    .filter((line) => line !== "")
    .join(" ");
  const quote = text[0];
  if (quote === '"') {
    const end = /^"((?:[^"\\]|\\.)*)"/.exec(text);
    const body = end ? (end[1] as string) : text.slice(1);
    return body.replace(/\\(.)/g, (_, char: string) =>
      char === "n" ? "\n" : char === "t" ? "\t" : char,
    );
  }
  if (quote === "'") {
    const end = /^'((?:[^']|'')*)'/.exec(text);
    return (end ? (end[1] as string) : text.slice(1)).replace(/''/g, "'");
  }
  // A plain scalar ends at a comment.
  return text.replace(/\s+#.*$/, "");
}

/**
 * The statement a firm-edit receipt is bound to, read from a requirement
 * document's text: its `semantic_text`, else the body without headings and
 * context sections (Context, Rationale, Why, Background, Source, Notes,
 * Evidence), else its title. The hosts' hooks and the CLI both read it here,
 * so a receipt the CLI records matches in every hook. Undefined when the
 * text has no front matter or none of these.
 */
export function requirementStatementFromDocument(
  text: string,
): string | undefined {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  if (lines[0]?.trim() !== "---") return undefined;
  const close = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---",
  );
  if (close === -1) return undefined;
  const front = lines.slice(1, close);
  const semantic = frontMatterScalar(front, "semantic_text");
  if (semantic !== undefined && semantic.trim() !== "") return semantic;
  const body: string[] = [];
  // The open context section's heading level, 0 outside one.
  let contextLevel = 0;
  for (const line of lines.slice(close + 1)) {
    const heading = HEADING_LINE.exec(line);
    if (heading === null) {
      if (contextLevel === 0)
        body.push(line.replace(/^\s*(?:(?:[-*+]|\d+[.)])\s+|>\s*)/, ""));
      continue;
    }
    const level = (heading[1] as string).length;
    const words = (heading[2] ?? "").replace(/^[*_`\s]+/, "");
    if (level <= contextLevel) contextLevel = 0;
    if (contextLevel === 0 && CONTEXT_HEADING.test(words)) contextLevel = level;
  }
  const derived = body.join(" ").replace(/\s+/g, " ").trim();
  if (derived !== "") return derived;
  const title = frontMatterScalar(front, "title");
  return title !== undefined && title.trim() !== "" ? title : undefined;
}

/**
 * The statement of the requirement `requirementId` in the workspace, read
 * from `.kb/requirements/<id>.md` with `requirementStatementFromDocument`.
 * Undefined for an id that is not a requirement id or a document that cannot
 * be read.
 */
export function readRequirementStatement(
  workspaceRoot: string,
  requirementId: string,
): string | undefined {
  if (!REQUIREMENT_ID.test(requirementId)) return undefined;
  const text = readText(
    path.join(workspaceRoot, ".kb", "requirements", `${requirementId}.md`),
  );
  return requirementStatementFromDocument(text);
}

/**
 * A `reviewed` callback for `firmRequirementsTouched`: true when the
 * workspace holds a `keeps` receipt for the requirement and symbol that was
 * recorded at or after `askedAt(requirementId)`, the time this session asked
 * about an edit of that requirement's code, and that still matches the
 * requirement's statement (see `readRequirementStatement`) and the code now
 * in `sourceFile`, wherever in the file that code now sits. A receipt is a
 * judgment on one edit: it lets the retry of the edit the session asked
 * about through, never a later session's edit, so a session that was not
 * asked (`askedAt` undefined) counts nothing as reviewed. Any read or parse
 * failure counts as not reviewed.
 */
export function firmEditReviewed(
  workspaceRoot: string,
  sourceFile: string,
  askedAt: (requirementId: string) => number | undefined,
): (requirementId: string, symbol: { title: string }) => boolean {
  let content: string | undefined;
  return (requirementId, symbol) => {
    const asked = askedAt(requirementId);
    if (asked === undefined) return false;
    const receipt = readFirmEditReceipt(
      requirementId,
      sourceFile,
      symbol.title,
      (relativePath) => readText(path.join(workspaceRoot, relativePath)),
    );
    // An unparsable time is NaN, which is never at or after the ask.
    if (
      receipt?.verdict !== "keeps" ||
      !(Date.parse(receipt.recordedAt) >= asked)
    )
      return false;
    const statement = readRequirementStatement(workspaceRoot, requirementId);
    if (statement === undefined) return false;
    content ??= readText(path.join(workspaceRoot, sourceFile));
    return (
      firmEditReceiptMismatch(receipt, { statement, content }) === undefined
    );
  };
}

/** A file's text, or the empty string when it cannot be read. */
function readText(file: string): string {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    // An unreadable file is read as no text.
  }
  // rationale: an unreadable file yields no receipt and no code to match,
  // whether it reads as the empty string or as any other text.
  // Stryker disable next-line StringLiteral
  return "";
}

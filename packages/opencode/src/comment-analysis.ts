import * as fs from "node:fs";
import { classifyKnowledge } from "./knowledge-classifier.js";

export interface CommentAnalysisResult {
  filePath: string;
  suggestionType: "fact" | "adr" | "req" | "scenario" | "test";
  confidence: "medium" | "high";
  reasoning: string;
  fingerprint: string;
  sourceKind: "block-comment" | "docstring";
}

export interface CommentAnalyzerOptions {
  minLines: number;
}

type Language = "javascript" | "typescript" | "python";
type ExtractedComment = { text: string; kind: "block-comment" | "docstring" };

const LANGUAGES = new Map<string, Language>([
  ["py", "python"],
  ["js", "javascript"],
  ["jsx", "javascript"],
  ["ts", "typescript"],
  ["tsx", "typescript"],
]);

/**
 * Create a simple fingerprint for deduplication.
 */
export function createFingerprint(text: string): string {
  // Normalize and hash the first 200 chars for dedupe
  const normalized = text
    .slice(0, 200)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/** Leading whitespace width of a line. */
function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

/**
 * Extract JS/TS comment blocks (line and block comments).
 */
export function extractJsTsComments(content: string): ExtractedComment[] {
  const comments: ExtractedComment[] = [];
  const lines = content.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const trimmed = (lines[i] as string).trim();

    if (trimmed.startsWith("/*")) {
      // The block runs to the first line holding "*/", or to the end.
      let j = i;
      while (j < lines.length && !(lines[j] as string).includes("*/")) j++;
      const text = lines
        .slice(i, j + 1)
        .join("\n")
        .trim()
        // The trimmed block starts with the opener, the first match.
        .replace(/\/\*\*?/, "")
        .replace(/\*\/$/, "")
        .replace(/^\s*\*\s?/gm, "")
        .trim();
      if (text) comments.push({ text, kind: "block-comment" });
      i = j + 1;
      continue;
    }

    if (trimmed.startsWith("//")) {
      const commentLines: string[] = [];
      while (i < lines.length) {
        const commentLine = (lines[i] as string).trim();
        if (!commentLine.startsWith("//")) break;
        // Every line starts with "//", so the first match is at its start.
        commentLines.push(commentLine.replace(/\/\/\s?/, ""));
        i++;
      }
      const text = commentLines.join("\n").trim();
      if (text) comments.push({ text, kind: "block-comment" });
      continue;
    }

    i++;
  }

  return comments;
}

/**
 * Reads the triple-quoted string that opens line `start` (after its
 * indentation). Returns its trimmed text and the index of the line that
 * closes it (`lines.length` when it is never closed). Inner lines indented
 * less than the opening line are left out.
 */
function readTripleQuoted(
  lines: string[],
  start: number,
  indent: number,
): { text: string; end: number } {
  const opening = (lines[start] as string).trim();
  const quote = opening.slice(0, 3);
  const rest = opening.slice(3);
  const sameLineClose = rest.indexOf(quote);
  if (sameLineClose >= 0) {
    return { text: rest.slice(0, sameLineClose).trim(), end: start };
  }
  const parts = [rest];
  let end = start + 1;
  for (; end < lines.length; end++) {
    const line = lines[end] as string;
    const close = line.indexOf(quote);
    if (close >= 0) {
      parts.push(line.slice(0, close));
      break;
    }
    if (line.trim() === "" || indentOf(line) >= indent) parts.push(line);
  }
  return {
    text: parts
      .map((part) => part.trim())
      .join("\n")
      .trim(),
    end,
  };
}

/**
 * Extract Python comment blocks (# and true docstrings only).
 * See REQ-opencode-comment-routing and SCEN-opencode-python-comment-routing for docstring detection rules.
 */
export function extractPythonComments(content: string): ExtractedComment[] {
  const comments: ExtractedComment[] = [];
  const lines = content.split(/\r?\n/);
  // A triple-quoted string is a docstring when it is the first statement of
  // the module, or of a class/def body (indented deeper than the header).
  // `docstringIndent` is the least indent such a string may have, or
  // infinite once that first statement has passed.
  let docstringIndent = 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] as string;
    const trimmed = line.trim();
    const indent = indentOf(line);

    if (trimmed.startsWith("#")) {
      // Collect contiguous # comments at the same indent level
      const commentLines: string[] = [];
      while (i < lines.length) {
        const commentLine = lines[i] as string;
        const commentTrimmed = commentLine.trim();
        if (!commentTrimmed.startsWith("#") || indentOf(commentLine) !== indent)
          break;
        commentLines.push(commentTrimmed.slice(1).trim());
        i++;
      }
      const text = commentLines.join("\n").trim();
      if (text) comments.push({ text, kind: "block-comment" });
      continue;
    }

    if (trimmed === "") {
      i++;
      continue;
    }

    if (/^(class|def)\s+\w/.test(trimmed)) {
      docstringIndent = indent + 1;
      i++;
      continue;
    }

    if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
      const { text, end } = readTripleQuoted(lines, i, indent);
      if (indent >= docstringIndent && text) {
        comments.push({ text, kind: "docstring" });
      }
      i = end;
    }

    // Any statement ends the docstring opportunity.
    docstringIndent = Number.POSITIVE_INFINITY;
    i++;
  }

  return comments;
}

/**
 * Count content lines (non-empty) in text.
 */
function countContentLines(text: string): number {
  return text.split("\n").filter((line) => line.trim() !== "").length;
}

/**
 * Analyze a code file for durable knowledge comments.
 * Returns the best suggestion or null if none found.
 */
export function analyzeCodeFile(
  filePath: string,
  options: CommentAnalyzerOptions,
): CommentAnalysisResult | null {
  const language = LANGUAGES.get(
    filePath.toLowerCase().split(".").pop() as string,
  );
  if (!language) return null;

  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    // Conservative fallback: an unreadable file has no suggestion
    return null;
  }
  const comments =
    language === "python"
      ? extractPythonComments(content)
      : extractJsTsComments(content);

  // The first high-confidence suggestion wins, else the first medium one.
  let bestResult: CommentAnalysisResult | null = null;
  for (const comment of comments) {
    if (countContentLines(comment.text) < options.minLines) continue;
    const suggestion = classifyKnowledge(comment.text);
    if (!suggestion) continue;

    const result: CommentAnalysisResult = {
      filePath,
      suggestionType: suggestion.type,
      confidence: suggestion.confidence,
      reasoning: suggestion.reasoning,
      fingerprint: createFingerprint(comment.text),
      sourceKind: comment.kind,
    };
    if (result.confidence === "high") return result;
    bestResult ??= result;
  }

  return bestResult;
}

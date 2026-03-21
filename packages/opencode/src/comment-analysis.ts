// implements REQ-opencode-comment-routing

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

/**
 * Detect language from file extension.
 */
function detectLanguage(
  filePath: string,
): "javascript" | "typescript" | "python" | null {
  const ext = filePath.toLowerCase().split(".").pop();
  if (ext === "py") return "python";
  if (["js", "jsx"].includes(ext || "")) return "javascript";
  if (["ts", "tsx"].includes(ext || "")) return "typescript";
  return null;
}

/**
 * Create a simple fingerprint for deduplication.
 */
function createFingerprint(text: string): string {
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

/**
 * Extract JS/TS comment blocks (line and block comments).
 */
function extractJsTsComments(
  content: string,
): Array<{ text: string; kind: "block-comment" }> {
  const comments: Array<{ text: string; kind: "block-comment" }> = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Check for block comment
    if (line.trim().startsWith("/*")) {
      const blockLines: string[] = [];
      let j = i;
      while (j < lines.length) {
        const blockLine = lines[j];
        blockLines.push(blockLine);
        if (blockLine.includes("*/")) break;
        j++;
      }
      if (blockLines.length > 0) {
        const text = blockLines
          .join("\n")
          .replace(/^\/\*\*?\s*/, "")
          .replace(/\*\/$/, "")
          .replace(/^\s*\*\s?/gm, "")
          .trim();
        if (text.length > 0) {
          comments.push({ text, kind: "block-comment" });
        }
      }
      i = j + 1;
      continue;
    }

    // Check for line comments
    if (line.trim().startsWith("//")) {
      const commentLines: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith("//")) {
        commentLines.push(lines[j].trim().replace(/^\/\/\s?/, ""));
        j++;
      }
      if (commentLines.length > 0) {
        const text = commentLines.join("\n").trim();
        if (text.length > 0) {
          comments.push({ text, kind: "block-comment" });
        }
      }
      i = j;
      continue;
    }

    i++;
  }

  return comments;
}

/**
 * Check if a line is an assignment (x = y), which would disqualify a triple-quoted string from being a docstring.
 */
function isAssignment(line: string): boolean {
  // Match patterns like: x = """, x=""", x = ''' , etc.
  return /^\s*\w+\s*=\s*["']/.test(line);
}

/**
 * Check if a line starts a class or function definition.
 */
function isClassOrDef(line: string): boolean {
  return /^\s*(class|def)\s+\w+/.test(line);
}

/**
 * Extract Python comment blocks (# and true docstrings only).
 *
 * True docstrings are:
 * - Module docstring: first significant statement in the file
 * - Class/function docstring: first significant statement inside the class/function body
 *
 * Not docstrings:
 * - Assigned triple-quoted strings (x = """...""")
 * - Strings inside control flow (if/for/while/with/try blocks)
 * - Later standalone strings in a module
 */
function extractPythonComments(
  content: string,
): Array<{ text: string; kind: "block-comment" | "docstring" }> {
  const comments: Array<{ text: string; kind: "block-comment" | "docstring" }> =
    [];
  const lines = content.split("\n");

  // Track state for docstring detection
  let foundModuleDocstring = false;
  let insideClassOrDef = false;
  let classOrDefBodyStart = -1;
  let classOrDefIndent = 0;
  let foundClassDocstring = false;

  function getIndent(line: string): number {
    return line.match(/^(\s*)/)?.[1].length || 0;
  }

  function isSignificantLine(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith("#");
  }

  function extractDocstring(
    startIdx: number,
    quote: "\"'\"'\"'" | "'''",
    indent: number,
  ): { text: string; endIdx: number } | null {
    const docstringLines: string[] = [];
    let j = startIdx;
    const startLine = lines[j].trim();

    // Extract content from opening line
    const openingMatch = startLine.match(new RegExp(`^\\s*${quote}(.*)$`));
    if (openingMatch?.[1]) {
      docstringLines.push(openingMatch[1].trim());
    }

    j++;
    while (j < lines.length) {
      const docLine = lines[j];
      if (docLine.includes(quote)) {
        // Closing line
        const closingMatch = docLine.match(new RegExp(`^(.*?)${quote}`));
        if (closingMatch?.[1]?.trim()) {
          docstringLines.push(closingMatch[1].trim());
        }
        break;
      }
      // Only include lines at same or greater indent, or empty lines
      if (docLine.trim() === "" || getIndent(docLine) >= indent) {
        docstringLines.push(docLine.trim());
      }
      j++;
    }

    const text = docstringLines.join("\n").trim();
    if (text.length > 0) {
      return { text, endIdx: j };
    }
    return null;
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const indent = getIndent(line);

    // Process # line comments FIRST (before skipping)
    if (trimmed.startsWith("#")) {
      const commentLines: string[] = [];
      let j = i;
      const currentIndent = getIndent(line);

      // Collect contiguous # comments at same indent level
      while (j < lines.length) {
        const commentLine = lines[j];
        const lineHashMatch = commentLine.match(/^(\s*)#(.*)$/);
        if (!lineHashMatch) break;
        if (getIndent(commentLine) !== currentIndent) break;
        commentLines.push(lineHashMatch[2].trim());
        j++;
      }

      if (commentLines.length > 0) {
        const text = commentLines.join("\n").trim();
        if (text.length > 0) {
          comments.push({ text, kind: "block-comment" });
        }
      }
      i = j;
      continue;
    }

    // Skip empty lines for docstring detection
    if (trimmed === "") {
      i++;
      continue;
    }

    // Check for class/def definitions
    if (isClassOrDef(line)) {
      insideClassOrDef = true;
      classOrDefBodyStart = i;
      classOrDefIndent = indent;
      foundClassDocstring = false;
      i++;
      continue;
    }

    // Check if we've exited the class/def body
    if (
      insideClassOrDef &&
      indent <= classOrDefIndent &&
      isSignificantLine(line)
    ) {
      insideClassOrDef = false;
    }

    // Check for triple-quoted strings
    const isTripleQuote =
      trimmed.startsWith('"""') || trimmed.startsWith("'''");

    if (isTripleQuote) {
      // Skip if it's an assignment (x = """...""")
      if (isAssignment(line)) {
        // Track that we've seen a significant non-docstring statement
        if (!foundModuleDocstring && !insideClassOrDef) {
          foundModuleDocstring = true;
        }
        if (insideClassOrDef && !foundClassDocstring) {
          foundClassDocstring = true;
        }
        // Skip to end of string
        const quote = trimmed.startsWith('"""') ? "\"'\"'\"'" : "'''";
        i++;
        while (i < lines.length && !lines[i].includes(quote)) {
          i++;
        }
        i++;
        continue;
      }

      const quote = trimmed.startsWith('"""') ? "\"'\"'\"'" : "'''";

      // Check if this is a valid docstring position
      let isDocstring = false;

      if (!foundModuleDocstring && !insideClassOrDef) {
        // Module-level: first significant statement can be docstring
        isDocstring = true;
        foundModuleDocstring = true;
      } else if (insideClassOrDef && !foundClassDocstring) {
        // Class/function-level: first significant statement after def can be docstring
        // Check that we're indented more than the class/def
        if (indent > classOrDefIndent) {
          isDocstring = true;
          foundClassDocstring = true;
        }
      }

      if (isDocstring) {
        const result = extractDocstring(i, quote, indent);
        if (result) {
          comments.push({ text: result.text, kind: "docstring" });
          i = result.endIdx + 1;
          continue;
        }
      }

      // Not a docstring - mark as significant and skip it
      if (!foundModuleDocstring && !insideClassOrDef) {
        foundModuleDocstring = true;
      }
      if (insideClassOrDef && !foundClassDocstring) {
        foundClassDocstring = true;
      }
      // Find the closing quote
      i++;
      while (i < lines.length && !lines[i].includes(quote)) {
        i++;
      }
      i++;
      continue;
    }

    // Any other significant line means we've passed the docstring opportunity
    if (!foundModuleDocstring && isSignificantLine(line)) {
      foundModuleDocstring = true;
    }
    if (insideClassOrDef && !foundClassDocstring && isSignificantLine(line)) {
      foundClassDocstring = true;
    }

    i++;
  }

  return comments;
}

/**
 * Count content lines (non-empty) in text.
 */
function countContentLines(text: string): number {
  return text.split("\n").filter((line) => line.trim().length > 0).length;
}

/**
 * Analyze a code file for durable knowledge comments.
 * Returns the best suggestion or null if none found.
 */
export function analyzeCodeFile(
  // implements REQ-opencode-comment-routing
  filePath: string,
  options: CommentAnalyzerOptions,
): CommentAnalysisResult | null {
  try {
    const language = detectLanguage(filePath);
    if (!language) return null;

    const content = fs.readFileSync(filePath, "utf-8");
    let comments: Array<{ text: string; kind: "block-comment" | "docstring" }> =
      [];

    if (language === "python") {
      comments = extractPythonComments(content);
    } else {
      comments = extractJsTsComments(content);
    }

    // Filter by minLines threshold
    const longComments = comments.filter(
      (c) => countContentLines(c.text) >= options.minLines,
    );

    if (longComments.length === 0) return null;

    // Find the best classification (highest confidence, prefer high over medium)
    let bestResult: CommentAnalysisResult | null = null;

    for (const comment of longComments) {
      const suggestion = classifyKnowledge(comment.text);
      if (!suggestion) continue;
      if (suggestion.confidence === "low") continue;

      const result: CommentAnalysisResult = {
        filePath,
        suggestionType: suggestion.type,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning,
        fingerprint: createFingerprint(comment.text),
        sourceKind: comment.kind,
      };

      // Prefer high confidence, then prefer earlier comments
      if (!bestResult || result.confidence === "high") {
        bestResult = result;
      }
    }

    return bestResult;
  } catch {
    // Conservative fallback: return null on any error
    return null;
  }
}

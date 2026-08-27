import { createHash } from "node:crypto";
import path from "node:path";

/**
 * Stable identity for a statically named Playwright test case.
 * The path is always repository-relative before hashing so the same case has
 * the same identity in a checkout, packed consumer, and dogfood workspace.
 */
// implements REQ-kibi-verification-evidence-contract
export function playwrightCaseId(
  sourceFile: string,
  qualifiedTitle: string,
): string {
  const normalizedPath = sourceFile
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");
  const key = `${normalizedPath}\0${qualifiedTitle.trim()}`;
  return `SYM-PW-${createHash("sha256").update(key).digest("hex").slice(0, 16).toUpperCase()}`;
}

// implements REQ-kibi-verification-evidence-contract
export function normalizePlaywrightSourceFile(
  sourceFile: string,
  workspaceRoot?: string,
): string {
  const absolute = path.resolve(sourceFile);
  if (!workspaceRoot) return sourceFile.replaceAll("\\", "/");
  const root = path.resolve(workspaceRoot);
  const relative = path.relative(root, absolute);
  return (relative.startsWith("..") ? sourceFile : relative).replaceAll(
    "\\",
    "/",
  );
}

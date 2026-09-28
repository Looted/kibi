/** Remove only the top-level proof-receipt frontmatter block, byte-for-byte otherwise. */
export function withoutProofReceiptFrontmatter(content: string): string {
  const lines = content.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  if (lines[0]?.trim() !== "---") return content;
  let inFrontmatter = true;
  let skippingReceipts = false;
  const retained: string[] = [];
  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    if (index > 0 && inFrontmatter && trimmed === "---") {
      inFrontmatter = false;
      skippingReceipts = false;
      retained.push(line);
      continue;
    }
    if (inFrontmatter && /^proof_receipts\s*:/.test(line)) {
      skippingReceipts = true;
      continue;
    }
    if (
      inFrontmatter &&
      skippingReceipts &&
      /^[A-Za-z_][A-Za-z0-9_-]*\s*:/.test(line)
    ) {
      skippingReceipts = false;
    }
    if (!skippingReceipts) retained.push(line);
  }
  return retained.join("");
}

/** Match the workspace proof snapshot's markdown receipt projection exactly. */
export function snapshotFileContent(
  relativePath: string,
  content: Buffer,
): Buffer {
  if (!relativePath.endsWith(".md")) return content;
  return Buffer.from(withoutProofReceiptFrontmatter(content.toString("utf8")));
}

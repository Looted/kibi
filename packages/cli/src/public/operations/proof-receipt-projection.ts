/** Remove only the top-level proof-receipt frontmatter block, byte-for-byte otherwise. */
export function withoutProofReceiptFrontmatter(content: string): string {
  // Split after each newline so every line keeps its own terminator; a
  // lookbehind split always yields at least one (possibly empty) line.
  const [opening, ...lines] = content.split(/(?<=\n)/) as [string, ...string[]];
  if (opening.trim() !== "---") return content;
  let inFrontmatter = true;
  let skippingReceipts = false;
  const retained = [opening];
  for (const line of lines) {
    if (inFrontmatter && line.trim() === "---") {
      inFrontmatter = false;
      skippingReceipts = false;
      retained.push(line);
      continue;
    }
    if (inFrontmatter && /^proof_receipts\s*:/.test(line)) {
      skippingReceipts = true;
      continue;
    }
    // skippingReceipts is only ever true inside the frontmatter.
    if (skippingReceipts && /^[A-Za-z_][A-Za-z0-9_-]*\s*:/.test(line)) {
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

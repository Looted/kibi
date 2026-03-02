#!/usr/bin/env bun
/**
 * Symbol extraction wrapper script
 * Usage: bun run scripts/extract-symbols.ts [file-path]
 */

import { getStagedFiles } from "../packages/cli/src/traceability/git-staged.js";
import { extractSymbolsFromStagedFile } from "../packages/cli/src/traceability/symbol-extract.js";

const targetFile = process.argv[2];

if (targetFile) {
  // Extract from specific file
  const fs = await import("node:fs");
  const content = fs.readFileSync(targetFile, "utf8");
  const stagedFile = {
    path: targetFile,
    status: "M" as const,
    hunkRanges: [{ start: 1, end: content.split("\n").length }],
    content,
  };
  const symbols = extractSymbolsFromStagedFile(stagedFile);
  console.log(JSON.stringify(symbols, null, 2));
} else {
  // Extract from all staged files
  const stagedFiles = getStagedFiles();
  const allSymbols = [];
  for (const f of stagedFiles) {
    const symbols = extractSymbolsFromStagedFile(f);
    allSymbols.push(...symbols);
  }
  console.log(JSON.stringify(allSymbols, null, 2));
}

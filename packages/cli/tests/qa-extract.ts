#!/usr/bin/env bun
import { extractFromMarkdown } from "../src/extractors/markdown.js";

const filePath = process.argv[2];

if (!filePath || filePath === "-") {
  console.error("Usage: bun qa-extract.ts <markdown-file>");
  process.exit(1);
}

try {
  const result = extractFromMarkdown(filePath);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
  throw error;
}

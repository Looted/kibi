#!/usr/bin/env node

import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputArgument = process.argv[2];
if (!outputArgument) {
  throw new Error(
    "Usage: node scripts/stage-packed-brand-assets.mjs <compiled-directory>",
  );
}
const outDir = path.resolve(outputArgument);
const dest = path.join(outDir, "assets");

await mkdir(dest, { recursive: true });
for (const name of ["logo.svg", "wordmark.svg"]) {
  await cp(path.join(repoRoot, "assets", name), path.join(dest, name));
}

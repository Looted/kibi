#!/usr/bin/env node

import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.resolve(process.argv[2] ?? "/tmp/kibi-e2e-packed-compiled");
const dest = path.join(outDir, "assets");

await mkdir(dest, { recursive: true });
for (const name of ["logo.svg", "wordmark.svg"]) {
  await cp(path.join(repoRoot, "assets", name), path.join(dest, name));
}

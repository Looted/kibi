#!/usr/bin/env node
/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk
 */

// Rewrite proof/baseline.json's summary counts from its per-requirement
// entries. Run after merging two branches that both changed the baseline: Git
// merges the entries but can keep a stale count (see deriveBaselineSummary).
// Prints whether the file changed; the entries themselves are never edited.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { deriveBaselineSummary } from "./lib/proof-baseline-diff.mjs";

const baselinePath = path.resolve(process.argv[2] ?? "proof/baseline.json");
const original = await readFile(baselinePath, "utf8");
const baseline = JSON.parse(original);
const reconciled = {
  ...baseline,
  ...deriveBaselineSummary(baseline.requirements),
};
// Keep the established key order: summary fields, then the entries.
const ordered = Object.fromEntries(
  Object.keys(baseline).map((key) => [key, reconciled[key]]),
);
const next = `${JSON.stringify(ordered, null, 2)}\n`;
if (next === original) {
  process.stdout.write("proof baseline counts already match its entries\n");
} else {
  await writeFile(baselinePath, next);
  process.stdout.write("proof baseline counts reconciled from its entries\n");
}

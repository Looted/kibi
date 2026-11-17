---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

A passing `kibi check` is now one line, and an unfiltered `kb_check` stays small. On Kibi's own knowledge base a pass went from 89,524 characters of text to 124, and the unfiltered `kb_check` result from 105,413 characters to about 4,300. The list of unrecorded declarations is one flag away.

- `kibi check` prints `✓ No violations. 66 rules. 2,924 unrecorded declarations in 522 files do not block (kibi check --symbol-debt lists them).` on a pass. `kibi check --symbol-debt` lists the declarations per file after the verdict, as the plain check did before.
- `symbolDebt` on an unscoped `kb_check` and `kibi check --format json` carries `total` and the new `fileCount`; `files` is listed only with `includeSymbolDebt: true` (CLI: `--symbol-debt`). Migration: read `symbolDebt.files` only after asking for it.
- `evaluated` gives `ruleCount`; `evaluated.rules` names the rules only when some default rule did not run (a `rules` selection, an uncompiled branch store). Migration: read `evaluated.ruleCount` for the number of rules.
- A `kb_check` without `rules` keeps to the same 24,000-character budget as a scoped one: advisory findings become counts by id, an unrequested migration plan becomes `migrationPlanSummary` (`includeMigrationPlan: true` keeps it whole), and blocking findings past the budget are grouped by rule, with `count` and every blocking rule kept. A `rules` selection and `kibi check --format json` still list every finding.
- The `kibi-commit-review` and `kibi-traceability` skills say what a cut result looks like and where the full list is.

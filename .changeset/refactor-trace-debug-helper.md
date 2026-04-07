---
"kibi-cli": patch
---

refactor(cli): export shouldLogTraceDebug from git-staged and reuse in check

- Export `shouldLogTraceDebug()` from `traceability/git-staged.ts` so it can be
  shared across CLI modules instead of each caller duplicating the env-var check.
- `check.ts` now imports and uses `shouldLogTraceDebug()` instead of the inline
  `process.env.KIBI_TRACE || process.env.KIBI_DEBUG` expression.
- Adds a success-path trace log after loading the working-tree manifest so that
  `KIBI_TRACE=1 kibi check --staged` reports how many entries were seeded, making
  it easier to diagnose code-only staged check issues.

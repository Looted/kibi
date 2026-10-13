---
"kibi-cli": patch
"kibi-runtime": patch
---

`kb_upsert` with `dryRun: true` no longer warns that an existing requirement "has no body context" when its document already has a `## Context` section and the payload sends no `document.body`. The dry run now judges the same document body the real write preserves, so its warnings match what the write (and `kb_check`) report.

Technical summary: `executeValidateUpsert` resolves the authored document the write would update (`canonicalSourcePath` with the stored entity, under the same source-first conditions as `executeUpsert`) and passes it to `entityContextWarnings` as `targetPath`; `upsertDocumentBody` reads that path when no `document.body` or `document.path` is supplied, because the preview entity's `source` is the runtime marker. The written-path argument becomes an options object `{ writtenPath, targetPath }`.

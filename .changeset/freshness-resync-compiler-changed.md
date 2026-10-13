---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
---

After upgrading to a Kibi CLI whose entity schema changed, `kibi status` / `kb_status` reports each branch store compiled by the older CLI once as stale with `compiler_changed`; `kibi sync`, or applying the freshness plan's automatic resync, clears it. The status migration plan now covers that reason with its automatic `freshness-resync` action instead of a review action, so `kb_apply_plan` can clear it even when it is the only stale reason (before, the plan had nothing automatic to apply). A `kb_upsert` dry run or write of a fact no longer returns a semantic advisor receipt that minted a claim key from the fact's title and reported it as missing; the fact's own derived `claim_key` stays in `normalizedPreview` and the write's `claimKey`.

Technical summary: `buildActionsFromStatus` plans the automatic `freshness-resync` (`kibi sync`) for a `RESYNC_REASON_CODES` set (the mtime source codes plus `compiler_changed`) and skips those codes when it emits per-reason review actions; `MTIME_SOURCE_REASON_CODES` and status reporting are unchanged. The upsert path runs the semantic advisor and the proposition-complete ingestion boundary only for `req` payloads (`analyzeUpsertSemantics`): a dry run of any other entity type returns `semanticAdvisor: null` and its write result omits `semanticAdvisor`, while requirement receipts, warnings and the contradiction-check readiness are unchanged.

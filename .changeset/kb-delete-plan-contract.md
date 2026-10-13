---
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

`kb_delete` (and `kibi delete`) now treats a returned deletion plan as a result instead of an error. Deleting an entity authored in a Markdown or YAML file returns `outcome: "plan_returned"`, an empty `errors` list and a `nextActions` entry whose `input` is the exact `kb_apply_plan` call (`{plan, approvedPlanHash}`) to run unchanged; an authored requirement returns `outcome: "supersession_required"` with a `kb_upsert` supersession template. The `approvedPlanHash` input now works: repeating the delete with the plan's hash applies the freshly computed plan in one call, and a stale or different hash fails with `DELETE_PLAN_HASH_MISMATCH` without writing. A new `dryRun: true` input previews relationship and direct entity deletes (counts, source writes with hashes, skipped effects) without touching sources or the store.

Technical summary: `executeDelete` builds `nextActions` for the authored plan path, lists only real per-id failures in `errors` (plus any resolved non-authored id the plan does not cover), and on a matching `approvedPlanHash` delegates to `executeApplyPlan` under the lock it already holds, which gained an optional `onCommitted` callback so a post-commit failure is still classified as committed. Relationship deletes gain a dry-run branch after preflight that renders shard and authored-source patches without writing, using the new `planRelationshipShardRemovals` (which `removeRelationshipsFromShards` now wraps). The `kibi.kb_delete.v1` result adds optional `outcome`, `dryRun`, `wouldDelete`, `planHash`, `sourcePaths` and `recoveryJournalId`; the input schema adds `dryRun` and documents `approvedPlanHash`. MCP contract fixtures, the MCP, CLI and error references, and the bundled kibi-usage and kibi-traceability skills (with their host mirrors) are updated.

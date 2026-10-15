---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
---

Three fixes for teams moving a legacy knowledge base onto the current Kibi. The first `kb_upsert` after `kibi migrate` no longer adds an unrelated `type:` line to the file it edits: migrate now writes that line itself, so it lands in the migration commit. On a legacy KB, `kb_status` now names `kibi migrate --yes` as the first step, as `kibi doctor` already did, instead of `kibi init`. And the `kibi sync` summary now shows what the KB holds, not only what the sync recompiled.

- `kibi migrate --yes` adds the folder-implied `type` (for example `type: req` under `.kb/requirements/`) as the last front matter key of every authored entity file without one, at any schema version, and changes no other line. A KB that was already migrated without it gets the same edit from the next `kibi migrate`, planned as the automatic `entity-type-backfill` action. A status-only `kb_upsert` after the migration then changes only the `status` line.
- With a legacy `.kb/config.json` and no `.kb/manifest.json`, bootstrap activation reports `root_partial` with the reason `kibi doctor` gives, and `kb_status.bootstrap.nextAction` is `{operation: "kibi migrate --yes", required: true}`.
- The `kibi sync` summary opens with `KB Totals` by type and the KB relationship count, counted from the store after the sync, followed by `Imported This Sync (changed sources only)`. When the store cannot be counted, the summary falls back to the previous `Entity Counts` block.

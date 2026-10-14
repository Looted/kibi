---
"kibi-cli": patch
"kibi-mcp": patch
---

Requirements with a legacy `status: implemented`, `done` or `completed` no longer vanish from the KB after `kibi migrate --yes`: the migration maps them to `closed` with the tag `implemented` and says so. When a requirement still cannot be compiled, `kibi migrate` reports the migration as incomplete and names the file and the fix instead of claiming it is done, `kb_check` blocks on the file and `kb_status` stops reporting the KB as fresh. `kb_upsert` on such a requirement is judged against its file, so a write that would leave it without a proposition inventory, or still uncompilable, is refused before anything is written.

- `kibi migrate` plans an automatic `req_status_delivered_map` action (id `req-status-delivered-map`) that rewrites only the `status` line and adds the `implemented` tag; `--yes` applies it, prints `Mapped legacy status ... on N requirement(s)` and records `legacyStatusesMapped` in the audit. Unknown statuses stay `req_status_vocabulary_map` review actions whose evidence carries the extraction error.
- `kibi migrate --yes` prints `Migration incomplete: ...` with one line per uncompiled requirement instead of `Migration complete` while such work remains; the exit code stays 0.
- `kibi sync` records each authored file it could not extract (with its hash) in the sync cache. `kb_status` reports a blocking `source_extraction_failed` stale reason, `syncState: stale` and `dirty: true` while the file keeps those bytes. `source-relationship-parity` now says the file cannot be compiled and how to fix it. A legacy requirement that missed the first-sync baseline because its status did not compile keeps that baseline once its status is mapped.
- `kb_upsert` of an entity the store lacks but whose authored file exists reads that file's front matter as the stored state for the proposition-complete, origin and ledger checks, renders and extracts the result before writing, refuses a write that would leave the file uncompilable, and returns a warning naming the file it updated.

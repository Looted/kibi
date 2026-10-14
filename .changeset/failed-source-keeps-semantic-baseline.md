---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
---

A requirement without a proposition inventory that once failed to compile no longer gets stuck. Before, after `kibi sync` reported a requirement file it could not extract (for example an unknown `status`), restoring the exact committed file with `git checkout`, or fixing only its status, made every later `kibi sync` demand a complete inventory for it, while a status-only `kb_upsert` on the same file was accepted and then failed the next sync. Now the restored file syncs cleanly, and `kb_upsert` and `kibi sync` judge such a file by the same rule.

- `kibi sync` keeps, with each source it cannot extract, the semantic source hash the source last compiled with. When the source compiles again with the same prose, it keeps the legacy treatment; changed prose still needs the inventory, as before.
- `kb_upsert` of a requirement the store does not hold judges the write by what the last sync recorded for its file: a legacy file that missed the store's first compilation, or one whose prose is unchanged since it last compiled, may be written without an inventory; a file written after the first compilation needs one. A status-only `kb_upsert` that closes a legacy requirement whose status failed the first sync is now accepted, matching what `kibi sync` accepts after `kibi migrate` maps that status.
- A branch store where an earlier version already recorded such a failure has no record of the prose that last compiled, so that requirement still needs its inventory there.

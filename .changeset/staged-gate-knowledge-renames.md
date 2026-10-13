---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
---

The first commit after `kibi migrate` moves a legacy knowledge base into `.kb/`, and the pre-commit hook used to refuse it with one `symbol-coverage` violation per manifest symbol, because every moved file looked new. `kibi check --staged` now compares a moved knowledge file with its committed content at the old path, so the commit is judged on what it changed inside those files, not on findings they already had. Records the commit adds or edits are still checked, and full `kibi check` still reports the older findings.

- `captureStagedSnapshot` builds the staged base with `renameResolutionBase`: for each rename Git detects whose old path is outside `.kb/` and whose new path is the same kind of canonical knowledge file (an entity document into the `.kb/` lane of the same name, or `symbols.yaml` / `symbol-coordinates.yaml` onto the canonical file), the base tree carries the old content at the new path and drops the old path. The snapshot lists them as `renameResolved`.
- Staged symbol-manifest evidence already reads its baseline from the snapshot base, so `changedEntityIds` after a pure move contains only the records the commit rewrote, and `symbol-coverage` runs only for them. The `minLinks` ownership gate for changed source symbols is unchanged.
- The staged output starts with `Baseline: HEAD with N staged knowledge rename(s) into .kb/ resolved ...` when the rename base was used, and a commit with nothing left to judge says `No staged changes beyond the resolved renames.` A staged merge commit's note is now also printed when no source symbols changed.
- Renames inside `.kb/`, renames into a different lane and edits to files that were already canonical are compared with HEAD as before.

---
"kibi-cli": patch
"kibi-mcp": patch
---

The first commit after `kibi migrate` no longer fails the pre-commit hook on its own changes. Migrate now refreshes `.kb/symbol-coordinates.yaml` whenever it rewrites or moves `.kb/symbols.yaml`, so `kibi check-generated --staged` finds no drift, and `kibi check --staged` no longer charges that commit with symbols the migration only marked `legacy-link`. A symbol you add or relink in the same commit is still checked in full.

- `kibi migrate --yes` and the `symbol-legacy-link-mark` plan action refresh coordinates the way `kibi sync --refresh-symbol-coordinates` does when the run changed the symbols manifest or its coordinates, rebind the pending-source receipt of a moved, untracked manifest, and print the refresh. A failed refresh leaves the migration applied and prints the manual step.
- `kibi check --staged` treats a commit as carrying a migration when the staged `.kb/manifest.json` has a newer `schemaVersion` than the base or the commit removes the legacy `.kb/config.json`. In such a commit, a symbol record that differs from its base only by an added `granularity_reason: legacy-link` or `review:context-missing` tag is not counted as changed, and the output says so in a `Migration commit:` line beside the `Baseline:` line.
- The rename-aware staged baseline also pairs a deleted knowledge file with an added canonical file of the same name when the pairing is unambiguous, so a small file that the migration both moved and rewrote below Git's rename similarity is still compared with its old content.

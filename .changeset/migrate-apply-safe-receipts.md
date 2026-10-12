---
"kibi-cli": patch
"kibi-mcp": patch
---

`kibi migrate --apply-safe --approved-action <ids>` now applies only the approved actions; before, the id list was ignored and every automatic action of the plan ran, including source rewrites nobody approved. A migration that rewrites an untracked `.kb/` source (re-derived semantic inventory, source path repair, lifecycle repair) now rebinds the file's pending-source receipt, so the next `kibi sync` or `kb_apply_plan` compile no longer refuses it as "Pending source hash drift"; `git add` of such a file now retires its receipt as the docs said it would. A legacy `.kb/config.json` cutover that cannot move its files (a destination such as `.kb/symbols.yaml` already exists) is planned as a blocked operator action with the conflict in its evidence instead of a ready automatic step that fails and takes `branch-store-compile` with it. `kibi migrate --yes --format json` applies every ready automatic action of the printed plan instead of printing it and writing nothing.

Technical summary: `migrateCommand` reads the Commander option `approvedAction` as well as `approvedActionIds`; `writeFileAtomically` (migration helper) locates the workspace from the `.kb/` segment and calls the new `republishPendingSourceReceipt`; `discoverSourceFiles` skips receipts of Git-tracked paths before the hash check so the existing consume step retires them; `buildActionsFromStatus` plans the legacy storage cutover from `planLegacyStorageMigration` blockers and the compile action depends only on ready predecessors.

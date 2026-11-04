---
"kibi-cli": patch
---

Simplify the argument handling of several read-only commands (`kibi query`, `kibi gaps`, `kibi graph`, `kibi coverage --cases`) without changing their output.

Drop redundant guards in the sync extraction step, the printed migration plan record and the ontology-quality threshold reader; behaviour is unchanged.

Remove an unused attach flag and an unreachable process factory from the shared discovery engine helper.

Simplify the manifest merge driver's record bookkeeping and the untracked-document lookup used by `kibi sync` warnings; behaviour is unchanged.

`kibi gc` and the engine maintenance commands drop redundant guards (unused legacy flags, default stdio options, duplicate workspace resolution); behaviour is unchanged.

The report command reads its output target and certificate option once, and its commit lookup and badge share no longer carry redundant fallbacks.

Fix the staged generated-manifest check failing with "Could not parse staged Git tree" when any staged path contains a newline.

Fix a failed `kibi sync --rebuild` publication deleting the live journal database or CURRENT pointer when the step that moves it aside is the one that fails; the rollback now undoes only the moves that happened.

Source discovery reads pending receipts through one parser and lets errors in a well-formed receipt surface instead of swallowing them; behaviour for valid and malformed receipts is unchanged.

`kibi init` drops an unused next-step identifier and a redundant containment check; its output is unchanged.

`kibi init --github` derives workflow paths from one table and simplifies README badge placement; the README output is unchanged.

The sync cache reader shares one empty-cache shape and one optional-field list, and the manifest fingerprint reads symbol sources with fewer redundant guards; fingerprints and cache files are unchanged.

Hook manager detection reads lefthook and pre-commit configuration through one parser and drops stage aliases no managed hook uses; detection and coverage results are unchanged.

Installing a Git hook whose path runs through a regular file now reports the hook as not a regular file instead of failing with an uncaught ENOTDIR error. Hook files are written in one place, and the managed markers are matched without an escaping step they never needed.

The usage-metrics tables are drawn by one helper, and the zero-result tool table reuses the shared counts table; the printed report is unchanged.

`kibi branch restore --apply` now restores stores that `kibi gc` quarantined. Quarantine entries are named by time, and restore compared that directory name with the branch store key, so every restore of a garbage-collected store was refused as an identity mismatch; it now checks the identity recorded in the store manifest.

The symbol coordinate refresh builds the artifact publication in one place, reads files without encoding arguments, and skips extraction when an incremental refresh reuses every record; manifests and coordinate artifacts are unchanged.

The legacy storage migration no longer plans a coordinates move for a configured symbols manifest whose name is not `symbols.yaml` or `symbols.yml`. Such a manifest was planned twice, once as the manifest and once as `.kb/symbol-coordinates.yaml`, and a `custom.yml` manifest picked up an unrelated `custom.yaml` as its coordinates. Listing tracked files also keeps Git's error output off the terminal outside a repository.

When a relationship fails every retry and the engine gives no detail for a later attempt, the sync warning now keeps the earlier explanation, such as the batch error, instead of falling back to "Unknown error". A missing entity id is also read from a multi-line engine error. The engine reset before a retry pass is now a plain best-effort step, and the persistence tests use the real Prolog codec instead of a module mock.

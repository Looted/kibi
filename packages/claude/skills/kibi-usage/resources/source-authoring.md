# Source-first authoring

Tracked Markdown, YAML, symbol manifests, and relationship shards are the
authoritative project memory. Prolog/RDF state is a rebuildable compiled
artifact. Kibi may transactionally write tracked files, but it never stages or
commits them; ordinary Git workflows remain responsible for review and merge.

`kb_upsert` accepts `document.path` and `document.body`. Existing entities use
their authored source by default and preserve body bytes when `body` is omitted.
New requirements use `semantic_text` as their body. If a new entity has zero or
multiple configured writable targets, provide an explicit workspace-relative
`document.path`; absolute, traversal, and symlink escapes are rejected.

New files are compiled only while their exact bytes are covered by a pending-
source receipt. Sync compiles Git-tracked files plus those hash-bound pending
files; arbitrary untracked files are ignored. Stage the file in Git to absorb
and remove its receipt. A changed or missing pending file is a blocking hash
drift diagnostic. Unresolved Git index conflicts are likewise blocking; Kibi
never chooses a merge winner.

Relationship upserts and relationship deletes patch only the canonical shard,
preserving unrelated records. Authored entity deletion returns a hash-bound
plan; approve that plan through `kb_apply_plan`. Evolve requirements with a new
requirement and `supersedes`, rather than deleting the old semantic claim.

On `committed_with_repairs`, inspect `effects` and execute the typed required
`nextActions`. Never retry the original mutation after its authoritative commit.
Cancellation follows the same rule: wait for the terminal journal state. A
pre-commit rollback is retryable, a committed source with a failed derivative
is repairable, and an indeterminate outcome is non-retryable until its recovery
action resolves the journal.

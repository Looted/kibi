# Source-first authoring

Tracked Markdown, YAML, symbol manifests, and relationship shards are the
authoritative project memory. Prolog/RDF state is a rebuildable compiled
artifact. Kibi may transactionally write tracked files, but it never stages or
commits them; ordinary Git workflows remain responsible for review and merge.

`kb_upsert` accepts `document.path` and `document.body`. Existing entities use
their authored source by default and preserve body bytes when `body` is omitted.
A new requirement without `body` uses `semantic_text` as its body, which
`entity-context-missing` blocks; pass a sectioned body (statement, `## Context`,
`## Source`) and the written `semantic_text` stays the checked meaning, since
context sections are excluded from it. Source-first requirement writes pin
`semantic_text` in front matter. If a new entity has zero or
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

## Naming entities

Name every entity by what it governs, the way you would name a source file.
Never choose "the next number": parallel branches pick the same next number and
collide even when they touch unrelated behavior.

- Use `<TYPE>-<area>-<behavior>` in kebab-case, with the type prefix kept
  uppercase: `REQ-cli-gc`, `SCEN-mcp-search-discovery`,
  `TEST-mcp-search-discovery`, `ADR-capability-plugins-v1`,
  `EVT-exact-branch-store-ensure`, and a flag named after its gate such as
  `FLAG-scip-symbol-extraction`.
- The filename stem equals the frontmatter `id`
  (`.kb/requirements/REQ-cli-gc.md` has `id: REQ-cli-gc`). Always set `id`
  explicitly; a missing `id` falls back to a path-and-title hash that changes
  when the file is renamed.
- Before creating an entity, `kb_search` the area. If an existing entity already
  covers the behavior, update it, or create a replacement and link it with
  `supersedes`. A `-v2` suffix is acceptable only for that direct superseding
  replacement.
- A name collision with another branch usually means the same work was done
  twice. Reconcile the two entities; do not rename one of them to dodge the
  collision.
- The area prefix is for humans. Whether two requirements are about the same
  thing is decided by their facts: a shared `subject_key` and identical
  predicate or property signatures, which `domain-redundancy` and
  `domain-contradictions` compare deterministically. Reuse existing subject keys
  (dotted `component.aspect[.sub]`, lowercase snake segments such as
  `kibi.cli.check.staged`) instead of deriving a subject from the requirement
  ID.

`entity-id-style` reports new purely numeric IDs (`REQ-123`) and IDs whose
filename stem differs from `id` as non-blocking quality diagnostics. Legacy
numbered entities created before the naming standard are grandfathered and are
not renamed, because code comments such as `// implements REQ-003` still
reference them.

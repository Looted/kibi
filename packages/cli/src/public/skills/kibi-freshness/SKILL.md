---
id: kibi-freshness
name: kibi-freshness
description: Check exact Git attachment, branch migration/quarantine, compiled-store freshness, source linkage, and repair state before decisions or writes.
version: 2.0.0
kibiCompatibility: ">=1.0.0"
tags:
  - kibi
  - mcp
  - freshness
  - agent-guidance
resources:
  - resources/branch-lifecycle.md
  - resources/source-authoring.md
  - resources/operation-access.md
---
## Goal

Help agents decide whether Kibi knowledge is current enough to support safe changes while preserving source-file traceability and approved interface boundaries.

## Interface Selection

1. Use whichever approved peer is visible: MCP or the trusted project-local CLI.
2. They have the same operation semantics and machine envelope; neither is preferred.
3. If neither surface is available, stop and tell the operator which capability must be enabled.
4. Never install packages, choose a package manager, or use a global fallback as part of freshness inspection.

Use `kibi-usage/resources/operation-access.md` for exact dedicated routes. A project-local CLI freshness check is executable as:

```bash
echo '{}' | npx --no-install kibi status --input -
```

## Capability Workflow

- Use `kb_status`, or `status --input`, first to confirm branch attachment, freshness state, dirty-worktree evidence, and whether the knowledge snapshot is safe to rely on.
- Treat `branchAttachment.gitBranch`, `branchAttachment.kbBranch`, and
  `branchAttachment.storePath` as exact identities. Hashed stores require a
  matching `branch.json`; a `legacy_compat` attachment is read-only until an
  explicit old/new migration is approved.
- Inspect bounded `staleReasons` (indexed source missing/newer or documentation
  source newer) and `proofSnapshotChanges`. Kibi deliberately reports
  editor/config paths such as editor dot-directories; do not silently ignore them.
- Use `kb_query`, or `query --input`, with `sourceFile` and text references for source-linked discovery.
- Re-run `kb_search`, or `search --input`, after sync gaps or stale context are detected.
- If knowledge must change, use the selected interface's `kb_upsert`/`upsert` or `kb_delete`/`delete` operation sequentially, then finish with `kb_check`/`check`.
- If status returns `migrationPlan.version: kibi.migration-plan.v2`, inspect its
  hash, scope, dependencies, and safety classes. Apply only ready automatic
  actions with explicit hash/action approval through `kb_apply_plan` or
  `kibi migrate --apply-safe`; escalate operator actions and never infer a
  migration from prose suggestions.
- Parse the outer `kibiProtocol`/`resultVersion` envelope. If a mutation returns
  `committed_with_repairs`, follow required typed `nextActions`; never retry the
  original operation.

## Guidance

- Treat MCP and the trusted project-local CLI as equal peer surfaces.
- Report task outcome separately from KB, verification, proof, and limitation
  state. A maintenance task can be complete with stale KB state or unresolved
  proof only when its scoped objective is complete and the status is named
  accurately; never call the KB clean/fresh in that case.
- A legacy attachment blocks mutation, and a dirty verification snapshot blocks
  evidence-dependent closeout. Name the exact paths/symbol IDs and whether the
  result is fixed, accepted, or deferred.
- If entities look stale, refresh context through an approved Kibi capability and then re-query.
- Preserve source-file traceability by carrying `sourceFile`, text references, and validation evidence through discovery, mutation, and completion.
- Do not read or edit files inside `.kb` directly; use the selected Kibi interface instead.
- Kibi authors tracked files but never Git-stages or commits them; ordinary Git workflows remain responsible for review and commit.
- Completion must state one freshness outcome: KB updated, no KB impact with rationale, or deferred/failed.

For exact branch lifecycle, quarantine, restore, and source-first writes, read
the shared `kibi-usage/resources/branch-lifecycle.md` and
`source-authoring.md` resources.

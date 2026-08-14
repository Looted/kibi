---
id: kibi-freshness
name: kibi-freshness
description: Check branch freshness and source linkage quality before decisions or risky writes.
version: 1.0.0
kibiCompatibility: "*"
tags:
  - kibi
  - mcp
  - freshness
  - agent-guidance
---
## Goal

Help agents decide whether Kibi knowledge is current enough to support safe changes while preserving source-file traceability and approved interface boundaries.

## Interface Selection

1. If Kibi MCP tools are visible and approved for the workspace, use the MCP surface only.
2. Otherwise, in a trusted workspace, use the canonical project-local CLI fallback through `npx --no-install kibi ...`.
3. If the project-local CLI is unavailable or too old, stop and tell the operator to enable or install Kibi.
4. Never use a global fallback or an installing runner.

Use `kibi-usage/resources/operation-access.md` for exact dedicated routes. A project-local CLI freshness check is executable as:

```bash
echo '{}' | npx --no-install kibi status --input -
```

## Capability Workflow

- Use `kb_status`, or `status --input`, first to confirm branch attachment, freshness state, dirty-worktree evidence, and whether the knowledge snapshot is safe to rely on.
- Treat `branchAttachment.gitBranch` and `branchAttachment.kbBranch` as exact
  identities. A `legacy_compat` attachment with `migrationRequired: true` is
  an interim read-only state; migrate it before writes or sync.
- Inspect bounded `staleReasons` (indexed source missing/newer or documentation
  source newer) and `verificationSnapshotChanges`. Kibi deliberately reports
  editor/config paths such as `.cursor/`; do not silently ignore them.
- Use `kb_query`, or `query --input`, with `sourceFile` and text references for source-linked discovery.
- Re-run `kb_search`, or `search --input`, after sync gaps or stale context are detected.
- If knowledge must change, use the selected interface's `kb_upsert`/`upsert` or `kb_delete`/`delete` operation sequentially, then finish with `kb_check`/`check`.

## Guidance

- Prefer the public Kibi MCP surface whenever it is available and approved.
- Never claim completion when freshness is stale, a legacy attachment remains,
  or verification snapshot state is dirty, even when blocking `kb_check` rules
  are zero. Classify that result as interim and name the exact paths/symbol IDs.
- If entities look stale, refresh context through an approved Kibi capability and then re-query.
- Preserve source-file traceability by carrying `sourceFile`, text references, and validation evidence through discovery, mutation, and completion.
- Do not read or edit files inside `.kb` directly; use the selected Kibi interface instead.
- Completion must state one freshness outcome: KB updated, no KB impact with rationale, or deferred/failed.

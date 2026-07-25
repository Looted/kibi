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

1. If Kibi MCP tools are positively visible and approved, use MCP only.
2. Otherwise, in a trusted workspace, use the canonical project-local CLI fallback through `npx --no-install kibi ...` or `bunx --no-install kibi ...`.
3. If the project-local CLI is unavailable or too old, stop and tell the operator to enable or install Kibi.
4. Never use a global fallback or an installing runner.

Use `kibi-usage/resources/operation-access.md` for exact dedicated routes. A project-local CLI freshness check is executable as:

```bash
echo '{}' | npx --no-install kibi status --input -
```

## Capability Workflow

- Use `kb_status`, or `status --input`, first to confirm branch attachment, freshness state, dirty-worktree evidence, and whether the knowledge snapshot is safe to rely on.
- Use `kb_query`, or `query --input`, with `sourceFile` and text references for source-linked discovery.
- Re-run `kb_search`, or `search --input`, after sync gaps or stale context are detected.
- If knowledge must change, use the selected interface's `kb_upsert`/`upsert` or `kb_delete`/`delete` operation sequentially, then finish with `kb_check`/`check`.

## Guidance

- Prefer the public Kibi MCP surface whenever it is available and approved.
- Never proceed with broad changes when freshness is stale and unresolved.
- If entities look stale, refresh context through an approved Kibi capability and then re-query.
- Preserve source-file traceability by carrying `sourceFile`, text references, and validation evidence through discovery, mutation, and completion.
- Do not read or edit files inside `.kb` directly; use the selected Kibi interface instead.
- Completion must state one freshness outcome: KB updated, no KB impact with rationale, or deferred/failed.

## Public Training Trajectories

[{"taskId":"kibi-freshness-branch-status-classification-train-1","family":"branch-status-classification","reflection":"Classify the attached branch snapshot before deciding whether work can continue. This is train case 1; use only the public Kibi MCP surface."},{"taskId":"kibi-freshness-branch-status-classification-train-2","family":"branch-status-classification","reflection":"Classify the attached branch snapshot before deciding whether work can continue. This is train case 2; use only the public Kibi MCP surface."},{"taskId":"kibi-freshness-stale-state-recovery-train-1","family":"stale-state-recovery","reflection":"Identify the stale snapshot and report the supported recovery boundary. This is train case 1; use only the public Kibi MCP surface."},{"taskId":"kibi-freshness-stale-state-recovery-train-2","family":"stale-state-recovery","reflection":"Identify the stale snapshot and report the supported recovery boundary. This is train case 2; use only the public Kibi MCP surface."},{"taskId":"kibi-freshness-source-linked-impact-train-1","family":"source-linked-impact","reflection":"Inspect source-linked impact while preserving the dirty worktree evidence. This is train case 1; use only the public Kibi MCP surface."},{"taskId":"kibi-freshness-source-linked-impact-train-2","family":"source-linked-impact","reflection":"Inspect source-linked impact while preserving the dirty worktree evidence. This is train case 2; use only the public Kibi MCP surface."},{"taskId":"kibi-freshness-completion-outcome-train-1","family":"completion-outcome","reflection":"Determine the completion outcome from status and final validation evidence. This is train case 1; use only the public Kibi MCP surface."},{"taskId":"kibi-freshness-completion-outcome-train-2","family":"completion-outcome","reflection":"Determine the completion outcome from status and final validation evidence. This is train case 2; use only the public Kibi MCP surface."}]
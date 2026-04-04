---
id: REQ-opencode-smart-enforcement-v1
title: "OpenCode Smart Enforcement: Posture-Aware Guidance and Risk Classification"
status: open
created_at: 2026-04-03T00:00:00Z
updated_at: 2026-04-03T00:00:00Z
source: documentation/requirements/REQ-opencode-smart-enforcement-v1.md
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - enforcement
  - guidance
  - policy
links:
  - type: depends_on
    target: REQ-opencode-kibi-plugin-v1
  - type: depends_on
    target: REQ-opencode-agent-mcp-only
  - type: specified_by
    target: SCEN-opencode-smart-enforcement
  - type: verified_by
    target: TEST-opencode-smart-enforcement
---

The OpenCode Kibi Plugin must implement smart, posture-aware enforcement to provide high-signal guidance while minimizing noise and token usage.

1. **Posture-Aware Enforcement**: The plugin must detect the current workspace posture and adjust guidance accordingly:
   - `root_active`: Kibi is initialized at the repo root; full enforcement enabled.
   - `root_partial`: Root `.kb/config.json` exists but configured KB targets are incomplete; advisory guidance only.
   - `root_uninitialized`: No root `.kb/config.json`, but the root declares Kibi intent; bootstrap guidance only.
   - `vendored_only`: Kibi is only present in vendored dependencies; limited advisory guidance.
   - `hybrid_root_plus_vendored`: Root `.kb/config.json` exists alongside vendored Kibi trees; the root remains authoritative.
   - `maintenance_degraded` overlay: maintenance execution is unavailable or disabled; guidance must degrade without pretending hooks/checks ran.

2. **Risk Classification**: Every proposed edit or action must be classified to determine the enforcement level:
   - `safe_docs_only`: Edits to non-KB documentation; low enforcement.
   - `safe_test_only`: Edits to tests only; low enforcement.
   - `kb_doc_structural`: Edits to KB entity frontmatter or relationships; high enforcement.
   - `req_policy_candidate`: New requirements that may need policy alignment.
   - `behavior_candidate`: Code changes requiring traceability.
   - `traceability_candidate`: Symbol changes missing requirement links.
   - `manual_kb_edit`: Direct edits to `.kb/**` internal files; maximum warning class with no extra maintenance scheduling from that edit.

3. **Token-Budget Policy**: To preserve context window and reduce costs, injected guidance must be concise:
   - Maximum 1 guidance block per injection.
   - Maximum 5 bullet points or 120 words total per block.

4. **Advisory Default with Hook Guarantees**: Guidance should be advisory by default (nudges/toasts) while relying on Kibi git hooks as hard guarantees for traceability and integrity.

5. **Cache Invalidation**: Enforcement state and guidance context must be invalidated on:
   - Branch switches.
   - Git worktree changes.
   - Changes to `.kb/config.json` or posture-relevant files.

6. **MCP-Only Surface Preservation**: All smart enforcement guidance must use MCP-only terminology, never suggesting CLI commands to the agent.

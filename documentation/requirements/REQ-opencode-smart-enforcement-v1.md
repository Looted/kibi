---
id: REQ-opencode-smart-enforcement-v1
title: "OpenCode Smart Enforcement: Posture-Aware Guidance and Risk Classification"
status: open
created_at: 2026-04-03T00:00:00Z
updated_at: 2026-04-20T00:00:00Z
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
   - `root_uninitialized`: No root `.kb/config.json`, but the root declares Kibi intent; initialization guidance only (e.g., `/init-kibi`).
   - `vendored_only`: Kibi is only present in vendored dependencies; limited advisory guidance.
   - `hybrid_root_plus_vendored`: Root `.kb/config.json` exists alongside vendored Kibi trees; the root remains authoritative.
   - `maintenanceDegraded` overlay: maintenance execution is unavailable or disabled; guidance must degrade without pretending hooks/checks ran.

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
   - Briefing discovery cues such as `/brief-kibi` and `kb_briefing_generate` must fit inside the same prompt budget rather than creating a second block.

4. **Advisory Default with Hook Guarantees**: Guidance should be advisory by default (nudges/toasts) while relying on Kibi git hooks as hard guarantees for traceability and integrity.

5. **Cache Invalidation**: Enforcement state and guidance context must be invalidated on:
   - Branch switches.
   - Git worktree changes.
   - Changes to `.kb/config.json` or posture-relevant files.

7. **Effective-Mode Decision Table**: The plugin must compute the effective enforcement mode from config, posture, and runtime overlay:
   - `advisory` config → always `advisory`.
   - `strict` config + `requireRootKbForStrict=true` → `strict` only for `root_active` and `hybrid_root_plus_vendored`; otherwise `advisory`.
   - `strict` config + `requireRootKbForStrict=false` → `strict` for all postures.
   - `maintenanceDegraded=true` (static or runtime) → overrides to `advisory` regardless of config.

8. **Guidance Block Definition**: A single injected guidance block consists of the `<!-- kibi-opencode -->` sentinel plus at most one contextual block. The combined output must never exceed 5 bullet points or 120 words. Multiple candidate messages must be combined or priority-selected into this single block. For code edits, if 1-3 concrete requirement links exist in `documentation/symbols.yaml`, a source-linked micro-brief (`- Existing Kibi links: REQ-xxx`) must be prepended to the risk-class guidance.
9. **Prompt-Visible Completion Reminder**: When `guidance.smartEnforcement.completionReminder` is enabled and the current risk class is `behavior_candidate`, `traceability_candidate`, or `req_policy_candidate`, the plugin must append exactly one visible reminder (`Run \`kb_check\` before completing this task.`) to the guidance block per cache window. The reminder must be suppressed when `maintenanceDegraded` is active and must emit a matching structured `smart_enforcement_completion_reminder` log.
10. **Runtime Maintenance Overlay**: The plugin must maintain a session-local runtime overlay that latches when sync is disabled, the scheduler cannot be created, or a sync/check run fails. The merged `maintenanceDegraded` state (static posture OR runtime overlay) must drive: (a) degraded-mode prompt text in `warn-once` mode, (b) skip of targeted validation checks, (c) suppression of the completion reminder, (d) suppression of briefing discovery cues such as `/brief-kibi` when they would imply unavailable maintenance, and (e) exposure in all structured smart-enforcement logs.
11. **Targeted Validation Routing**: The plugin must schedule specific validation rules based on risk class:
    - `traceability_candidate` → `symbol-traceability` via reason `smart-enforcement.traceability`
    - `kb_doc_structural` (fact) → `required-fields`, `no-dangling-refs`, `strict-fact-shape`
    - `kb_doc_structural` (others) → `required-fields`, `no-dangling-refs`
    - `req_policy_candidate` (priority:must) → `must-priority-coverage` plus standard checks
    - `req_policy_candidate` (any) → `strict-req-fact-pairing` to surface unpaired requirements
12. **MCP-Only Surface Preservation**: All smart enforcement guidance must use MCP-only terminology, never suggesting CLI commands to the agent.

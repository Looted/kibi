---
id: REQ-opencode-kibi-plugin-v1
title: "OpenCode Kibi Plugin v1: Prompt Guidance, Debounced Sync, Non-blocking UX"
status: open
created_at: 2026-03-13T00:00:00Z
updated_at: 2026-03-22T12:30:00Z
source: packages/opencode/
priority: must
owner: opencode-team
tags:
   - opencode
   - kibi
   - plugin
   - traceability
   - enforcement
   - guidance
links:
  - type: specified_by
    target: SCEN-opencode-kibi-plugin-v1
---
  - type: relates_to
    target: ADR-016
  - type: relates_to
    target: ADR-018
  - type: relates_to
    target: REQ-opencode-smart-enforcement-v1
---

The OpenCode Kibi Plugin v1 must:
 
1. Inject Kibi prompt guidance into the OpenCode session flow, surfacing relevant requirements and traceability context to the user and agents.
2. Run background sync in a debounced, non-blocking manner after relevant file edits, ensuring the KB stays up to date without blocking the user experience.
3. Surface structured logs and toasts for sync status and errors, but never block the main OpenCode workflow on sync failures.
4. Be configurable via OpenCode or plugin settings for debounce interval and sync behavior.
5. Provide dynamic, contextual prompt guidance based on recent edits and workspace state, including targeted nudges for:
   - Code traceability (`implements REQ-xxx`)
   - Requirement completeness (separate SCEN/TEST)
   - FACT-first domain knowledge routing
   - ADR chain awareness
6. Emit loud warnings when agents attempt manual edits under `.kb/**`, directing them toward public MCP tools (`kb_search`, `kb_query`, `kb_status`, `kb_find_gaps`, `kb_coverage`, `kb_graph`, `kb_upsert`, `kb_delete`, `kb_check`).
7. Detect and warn on invalid Kibi authoring patterns, such as embedded scenarios/tests in requirements.
8. Run targeted validation checks after relevant KB-document edits as a background behavior (e.g., `kb_check` with specific rules like `must-priority-coverage,no-dangling-refs`).
9. Detect uninitialized or weakly bootstrapped repos and nudge toward `/init-kibi` slash command, escalating to the user/operator if further setup is needed.
 
All plugin code symbols must reference this requirement (`REQ-opencode-kibi-plugin-v1`) to satisfy staged traceability. The implementation must not begin until this requirement is present in the KB.

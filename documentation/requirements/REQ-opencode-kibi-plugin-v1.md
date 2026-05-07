---
id: REQ-opencode-kibi-plugin-v1
title: "OpenCode Kibi Plugin v1: Prompt Guidance, Debounced Sync, Non-blocking UX"
status: open
created_at: 2026-03-13T00:00:00Z
updated_at: 2026-04-20T00:00:00Z
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
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
---
  - type: relates_to
    target: ADR-016
  - type: relates_to
    target: ADR-018
  - type: relates_to
    target: REQ-opencode-smart-enforcement-v1
#BT|  - type: relates_to
#BT|    target: REQ-opencode-file-context-guidance-v1
---

The OpenCode Kibi Plugin v1 must:
 
1. Inject Kibi prompt guidance into the OpenCode session flow, surfacing relevant requirements and traceability context to the user and agents.
2. Run background sync in a debounced, non-blocking manner after relevant file edits, ensuring the KB stays up to date without blocking the user experience.
3. Surface structured logs and toasts for sync status and errors, but never block the main OpenCode workflow on sync failures.
4. Be configurable via OpenCode or plugin settings for debounce interval and sync behavior.
5. Provide dynamic, contextual prompt guidance based on recent edits and workspace state, including targeted nudges for:
   #KW|   - Code traceability (`implements REQ-xxx`)
#KW|   - File lifecycle context (create, edit, delete guidance)
#MJ|   - Requirement completeness (separate SCEN/TEST)
   - FACT-first domain knowledge routing
   - ADR chain awareness
6. Emit loud warnings when agents attempt manual edits under `.kb/**`, directing them toward public MCP tools (`kb_search`, `kb_query`, `kb_status`, `kb_find_gaps`, `kb_coverage`, `kb_graph`, `kb_upsert`, `kb_delete`, `kb_check`).
7. Detect and warn on invalid Kibi authoring patterns, such as embedded scenarios/tests in requirements.
8. Run targeted validation checks after relevant KB-document edits as a background behavior (e.g., `kb_check` with specific rules like `must-priority-coverage,no-dangling-refs`).
9. Detect uninitialized or weakly bootstrapped repos and nudge toward `/init-kibi` slash command, triggering the Autopilot MCP workflow (`kb_autopilot_generate`) to assist the agent in initial entity mapping, while escalating to the user/operator if further environment setup is needed.
10. When a session starts or authoritative risky work needs a focused Kibi briefing, surface `/brief-kibi` as a sanctioned slash command that invokes the public MCP briefing workflow (`kb_briefing_generate`) without replacing `/init-kibi` bootstrap guidance.
 
All plugin code symbols must reference this requirement (`REQ-opencode-kibi-plugin-v1`) to satisfy staged traceability. The implementation must not begin until this requirement is present in the KB.

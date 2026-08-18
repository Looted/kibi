---
id: REQ-opencode-file-context-guidance-v1
title: "OpenCode Kibi Plugin: File-Context Guidance (Lifecycle and E2E Evidence)"
status: open
created_at: 2026-05-04T10:00:00Z
updated_at: 2026-05-04T10:00:00Z
source: packages/opencode/
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - guidance
  - lifecycle
  - e2e
links:
  - type: specified_by
    target: SCEN-opencode-file-context-guidance-v1
  - type: verified_by
    target: TEST-opencode-file-context-guidance-v1
  - type: relates_to
    target: REQ-opencode-kibi-plugin-v1
---

The OpenCode Kibi Plugin must provide proactive, contextual guidance based on host-side file lifecycle events (create, edit, delete) and established E2E evidence.

### 1. File Lifecycle Guidance
The plugin must monitor file lifecycle events and provide advisory-only reminders:
- **Scope**: Lifecycle reminders are only eligible in `root_active` or `hybrid_root_plus_vendored` postures.
- **Modifier Pattern**: Lifecycle events are treated as modifiers layered on top of existing semantic risk classification, not as a standalone `RiskClass`.
- **Created/Edited**: When a file is created or edited, if it matches known symbol patterns or risky paths, the plugin must nudge the agent toward Kibi discovery.
- **Deleted**: When a file is deleted, the plugin must inject a safety check reminding the agent to verify if the file implements any requirements or is linked to scenarios/tests.
- **Suppression**: Guidance must be suppressed after the first occurrence per path per session to minimize prompt noise.

### 2. E2E Evidence Verification
The plugin must distinguish between authoritative E2E evidence and heuristic cues:
- **Authoritative Evidence**: Exact E2E evidence requires a `covered_by -> TEST-*` relationship to an E2E-marked test entity.
- **E2E Entity Definition**: A test entity is considered E2E if it has `tags: [e2e]` or a `source` path under an `/e2e/` directory.
- **Heuristic Cues**: Heuristic E2E reminders may be used for exact path mentions in code but must remain soft-worded and clearly labeled as advisory.
- **Package Umbrella Exclusion**: Generic package-level umbrella test documents are insufficient to count as exact E2E evidence for a specific file or symbol.

### 3. Constraints
- **Current-Host Only**: Guidance is based on host-side event monitoring; the plugin must not attempt first-read interception or modify file content returned by tools.
- **Single-Block Policy**: All lifecycle and E2E guidance must be folded into the standard single-block prompt behavior defined in REQ-opencode-kibi-plugin-v1.
- **Non-Blocking**: Guidance is advisory and must never block the agent's workflow.

### 4. Integration
- **Bootstrap**: Repositories without Kibi initialized should use `/init-kibi` to run `kb_autopilot_generate` for initial setup.
- **Briefing**: Agents should use `kb_briefing_generate` to discover contextual briefings for the current edit fingerprint.

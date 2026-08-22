---
id: REQ-opencode-file-context-guidance-v1
title: 'OpenCode Kibi Plugin: File-Context Guidance (Lifecycle and E2E Evidence)'
status: open
created_at: 2026-05-04T10:00:00.000Z
updated_at: 2026-05-04T10:00:00.000Z
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
semantic_text: 'The OpenCode Kibi Plugin must provide proactive, contextual guidance based on host-side file lifecycle events (create, edit, delete) and established E2E evidence.\n\nThe plugin must monitor file lifecycle events and provide advisory-only reminders:\n**Scope**: Lifecycle reminders are only eligible in `root_active` or `hybrid_root_plus_vendored` postures.\n**Modifier Pattern**: Lifecycle events are treated as modifiers layered on top of existing semantic risk classification, not as a standalone `RiskClass`.\n**Created/Edited**: When a file is created or edited, if it matches known symbol patterns or risky paths, the plugin must nudge the agent toward Kibi discovery.\n**Deleted**: When a file is deleted, the plugin must inject a safety check reminding the agent to verify if the file implements any requirements or is linked to scenarios/tests.\n**Suppression**: Guidance must be suppressed after the first occurrence per path per session to minimize prompt noise.\n\nThe plugin must distinguish between authoritative E2E evidence and heuristic cues:\n**Authoritative Evidence**: Exact E2E evidence requires a `covered_by -> TEST-*` relationship to an E2E-marked test entity.\n**E2E Entity Definition**: A test entity is considered E2E if it has `tags: [e2e]` or a `source` path under an `/e2e/` directory.\n**Heuristic Cues**: Heuristic E2E reminders may be used for exact path mentions in code but must remain soft-worded and clearly labeled as advisory.\n**Package Umbrella Exclusion**: Generic package-level umbrella test documents are insufficient to count as exact E2E evidence for a specific file or symbol.\n\n**Current-Host Only**: Guidance is based on host-side event monitoring; the plugin must not attempt first-read interception or modify file content returned by tools.\n**Single-Block Policy**: All lifecycle and E2E guidance must be folded into the standard single-block prompt behavior defined in REQ-opencode-kibi-plugin-v1.\n**Non-Blocking**: Guidance is advisory and must never block the agent''s workflow.\n\n**Bootstrap**: Repositories without Kibi initialized should use `kibi-bootstrap` to run `kb_plan_bootstrap` for initial setup.\n**Briefing**: Agents should use `kb_briefing_generate` to discover contextual briefings for the current edit fingerprint.'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a74c6d8f7a05377a9e92b4fbb1f66f40db1a6d34e248fd716e2690fb1f58cd9c
semantic_inventory:
  - claim_key: CLAIM-00F7EEA8CEF8260D
    claim_text: 'The OpenCode Kibi Plugin must provide proactive, contextual guidance based on host-side file lifecycle events (create, edit, delete) and established E2E evidence.\n\nThe plugin must monitor file lifecycle events and provide advisory-only reminders:\n**Scope**: Lifecycle reminders are only eligible in `root_active` or `hybrid_root_plus_vendored` postures.\n**Modifier Pattern**: Lifecycle events are treated as modifiers layered on top of existing semantic risk classification, not as a standalone `RiskClass`.\n**Created/Edited**: When a file is created or edited, if it matches known symbol patterns or risky paths, the plugin must nudge the agent toward Kibi discovery.\n**Deleted**: When a file is deleted, the plugin must inject a safety check reminding the agent to verify if the file implements any requirements or is linked to scenarios/tests.\n**Suppression**: Guidance must be suppressed after the first occurrence per path per session to minimize prompt noise.\n\nThe plugin must distinguish between authoritative E2E evidence'
    role: normative
    status: modeled
    span:
      start: 0
      end: 1038
    reason: Grounded by a strict property_value fact linked via requires_property.
  - claim_key: CLAIM-8ACEB6BD2DCABD50
    claim_text: 'heuristic cues:\n**Authoritative Evidence**: Exact E2E evidence requires a `covered_by -> TEST-*` relationship to an E2E-marked test entity.\n**E2E Entity Definition**: A test entity is considered E2E if it has `tags: [e2e]` or a `source` path under an `/e2e/` directory.\n**Heuristic Cues**: Heuristic E2E reminders may be used for exact path mentions in code but must remain soft-worded and clearly labeled as advisory.\n**Package Umbrella Exclusion**: Generic package-level umbrella test documents are insufficient to count as exact E2E evidence for a specific file or symbol.\n\n**Current-Host Only**: Guidance is based on host-side event monitoring'
    role: normative
    status: modeled
    span:
      start: 1043
      end: 1696
    reason: Grounded by a strict property_value fact linked via requires_property.
  - claim_key: CLAIM-272EF813462372B6
    claim_text: 'the plugin must not attempt first-read interception or modify file content returned by tools.\n**Single-Block Policy**: All lifecycle'
    role: normative
    status: modeled
    span:
      start: 1698
      end: 1831
    reason: Grounded by a strict property_value fact linked via requires_property.
  - claim_key: CLAIM-743E93E78B372864
    claim_text: 'E2E guidance must be folded into the standard single-block prompt behavior defined in REQ-opencode-kibi-plugin-v1.\n**Non-Blocking**: Guidance is advisory and must never block the agent''s workflow.\n\n**Bootstrap**: Repositories without Kibi initialized should use `kibi-bootstrap` to run `kb_plan_bootstrap` for initial setup.\n**Briefing**: Agents should use `kb_briefing_generate` to discover contextual briefings for the current edit fingerprint'
    role: normative
    status: modeled
    span:
      start: 1836
      end: 2285
    reason: Grounded by a strict property_value fact linked via requires_property.
logic_claims:
  - CLAIM-00F7EEA8CEF8260D
  - CLAIM-8ACEB6BD2DCABD50
  - CLAIM-272EF813462372B6
  - CLAIM-743E93E78B372864
type: req
---
The OpenCode Kibi Plugin provides advisory file-lifecycle guidance and uses established end-to-end evidence. It distinguishes authoritative test relationships from heuristic cues, folds reminders into one non-blocking prompt block, and routes initial repository inference through kibi-bootstrap and the plan/apply contract.

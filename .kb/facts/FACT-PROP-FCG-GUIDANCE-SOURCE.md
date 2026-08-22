---
title: 'Property: guidance_source_policy(opencode.kibi_plugin) = file_lifecycle_events_plus_e2e_evidence'
status: active
tags:
  - lane:strict
  - property-value
text_ref: .kb/requirements/REQ-opencode-file-context-guidance-v1.md
fact_kind: property_value
subject_key: opencode.kibi_plugin
property_key: guidance_source_policy
operator: eq
value_string: file_lifecycle_events_plus_e2e_evidence
claim_key: CLAIM-00F7EEA8CEF8260D
claim_text: 'The OpenCode Kibi Plugin must provide proactive, contextual guidance based on host-side file lifecycle events (create, edit, delete) and established E2E evidence.\n\nThe plugin must monitor file lifecycle events and provide advisory-only reminders:\n**Scope**: Lifecycle reminders are only eligible in `root_active` or `hybrid_root_plus_vendored` postures.\n**Modifier Pattern**: Lifecycle events are treated as modifiers layered on top of existing semantic risk classification, not as a standalone `RiskClass`.\n**Created/Edited**: When a file is created or edited, if it matches known symbol patterns or risky paths, the plugin must nudge the agent toward Kibi discovery.\n**Deleted**: When a file is deleted, the plugin must inject a safety check reminding the agent to verify if the file implements any requirements or is linked to scenarios/tests.\n**Suppression**: Guidance must be suppressed after the first occurrence per path per session to minimize prompt noise.\n\nThe plugin must distinguish between authoritative E2E evidence'
value_type: string
id: FACT-PROP-FCG-GUIDANCE-SOURCE
type: fact
---

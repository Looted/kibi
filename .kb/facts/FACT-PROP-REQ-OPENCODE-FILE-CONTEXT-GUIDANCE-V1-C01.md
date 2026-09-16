---
title: The OpenCode Kibi Plugin must provide proactive, contextual guidance based on ho
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: req.req_opencode_file_context_guidance_v1
property_key: clause_01_the_opencode_kibi_plugin_must_provide_proactive_
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_opencode_file_context_guidance_v1.clause_01_the_opencode_kibi_plugin_must_provide_proactive_.eq.true
claim_key: CLAIM-F8B55ABEEB2DED20
claim_text: 'The OpenCode Kibi Plugin must provide proactive, contextual guidance based on host-side file lifecycle events (create, edit, delete) and established E2E evidence.\n\nThe plugin must monitor file lifecycle events and provide advisory-only reminders:\n**Scope**: Lifecycle reminders are only eligible in `root_active` or `hybrid_root_plus_vendored` postures.\n**Modifier Pattern**: Lifecycle events are treated as modifiers layered on top of existing semantic risk classification, not as a standalone `RiskClass`.\n**Created/Edited**: When a file is created or edited, if it matches known symbol patterns or risky paths, the plugin must nudge the agent toward Kibi discovery.\n**Deleted**: When a file is deleted, the plugin must inject a safety check reminding the agent to verify if the file implements any requirements or is linked to scenarios/tests.\n**Suppression**: Guidance must be suppressed after the first occurrence per path per session to minimize prompt noise.\n\nThe plugin must distinguish between authoritative E2E evidence and heuristic cues:\n**Authoritative Evidence**: Exact E2E evidence requires a `covered_by -> TEST-*` relationship to an E2E-marked test entity.\n**E2E Entity Definition**: A test entity is considered E2E if it has `tags: [e2e]` or a `source` path under an `/e2e/` directory.\n**Heuristic Cues**: Heuristic E2E reminders may be used for exact path mentions in code but must remain soft-worded and clearly labeled as advisory.\n**Package Umbrella Exclusion**: Generic package-level umbrella test documents are insufficient to count as exact E2E evidence for a specific file or symbol.\n\n**Current-Host Only**: Guidance is based on host-side event monitoring; the plugin must not attempt first-read interception or modify file content returned by tools.\n**Single-Block Policy**: All lifecycle and E2E guidance must be folded into the standard single-block prompt behavior defined in REQ-opencode-kibi-plugin-v1.\n**Non-Blocking**: Guidance is advisory and must never block the agent''s workflow.\n\n**Bootstrap**: Repositories without Kibi initialized should use `kibi-bootstrap` to run `kb_plan_bootstrap` for initial setup'
id: FACT-PROP-REQ-OPENCODE-FILE-CONTEXT-GUIDANCE-V1-C01
type: fact
---

---
title: 'Property: heuristic_cue_policy(opencode.kibi_plugin.e2e_reminder) = advisory_soft_worded_clearly_labeled'
status: active
tags:
  - lane:strict
  - property-value
text_ref: .kb/requirements/REQ-opencode-file-context-guidance-v1.md
fact_kind: property_value
subject_key: opencode.kibi_plugin.e2e_reminder
property_key: heuristic_cue_policy
operator: eq
value_string: advisory_soft_worded_clearly_labeled
claim_key: CLAIM-8ACEB6BD2DCABD50
claim_text: 'heuristic cues:\n**Authoritative Evidence**: Exact E2E evidence requires a `covered_by -> TEST-*` relationship to an E2E-marked test entity.\n**E2E Entity Definition**: A test entity is considered E2E if it has `tags: [e2e]` or a `source` path under an `/e2e/` directory.\n**Heuristic Cues**: Heuristic E2E reminders may be used for exact path mentions in code but must remain soft-worded and clearly labeled as advisory.\n**Package Umbrella Exclusion**: Generic package-level umbrella test documents are insufficient to count as exact E2E evidence for a specific file or symbol.\n\n**Current-Host Only**: Guidance is based on host-side event monitoring'
value_type: string
id: FACT-PROP-FCG-HEURISTIC
type: fact
---

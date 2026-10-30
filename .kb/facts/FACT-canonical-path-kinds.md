---
title: A canonical entity path shall belong to requirements, scenarios, tests, adr, flags, events, facts or symbols
status: active
fact_kind: property_value
subject_key: kibi.kb_layout.entity_paths
claim_key: CLAIM-B46994FD5C740451
claim_text: A canonical entity path shall belong to requirements, scenarios, tests, adr, flags, events, facts or symbols
text_ref: REQ-cli-kb-entity-paths
property_key: path_kinds
operator: eq
value_type: set
value_set:
  - requirements
  - scenarios
  - tests
  - adr
  - flags
  - events
  - facts
  - symbols
origin:
  kind: agent
  recorded_at: '2026-10-28T22:33:27.284Z'
id: FACT-canonical-path-kinds
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.
---
title: A legacy config path key shall be requirements, scenarios, tests, facts, adr, flags or events
status: active
fact_kind: property_value
subject_key: kibi.kb_layout.entity_paths
claim_key: CLAIM-8AED0D5240EEEB02
claim_text: A legacy config path key shall be requirements, scenarios, tests, facts, adr, flags or events
text_ref: REQ-cli-kb-entity-paths
property_key: legacy_path_keys
operator: eq
value_type: set
value_set:
  - requirements
  - scenarios
  - tests
  - facts
  - adr
  - flags
  - events
origin:
  kind: agent
  recorded_at: '2026-10-28T22:33:27.962Z'
distinct_from:
  - kibi.kb.canonical_lanes.lanes
id: FACT-legacy-config-path-keys
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.

The legacy config path keys are the keys an older config file may still use, and they match today's canonical lanes only because the lanes have not changed since. A new lane would not become a legacy key, so the two sets are different quantities.

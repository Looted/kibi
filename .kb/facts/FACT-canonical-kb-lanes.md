---
title: The canonical Kibi knowledge lanes shall be requirements, scenarios, tests, facts, adr, flags and events
status: active
fact_kind: property_value
subject_key: kibi.kb.canonical_lanes
claim_key: CLAIM-F0379E1995819F07
claim_text: The canonical Kibi knowledge lanes shall be requirements, scenarios, tests, facts, adr, flags and events
text_ref: REQ-cli-canonical-kb-lanes
property_key: lanes
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
  recorded_at: '2026-10-28T10:10:04.451Z'
id: FACT-canonical-kb-lanes
type: fact
---
ENTITY_LANES in packages/cli/src/utils/kb-paths.ts names the Git-tracked directories under .kb that hold authored entities. REQ-cli-canonical-runtime says how sync discovers them and how kb_upsert writes into them; this requirement states the lane list so it is proved against the code.
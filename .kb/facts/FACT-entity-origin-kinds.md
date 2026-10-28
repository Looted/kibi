---
title: An entity origin kind shall be human, agent, migration or import
status: active
fact_kind: property_value
subject_key: kibi.origin.vocabulary
claim_key: CLAIM-A508A2A195ECC6DD
claim_text: An entity origin kind shall be human, agent, migration or import
text_ref: REQ-kibi-entity-origin-vocabulary
property_key: origin_kinds
operator: eq
value_type: set
value_set:
  - human
  - agent
  - migration
  - import
origin:
  kind: agent
  recorded_at: '2026-10-28T11:00:36.143Z'
id: FACT-entity-origin-kinds
type: fact
---
REQ-kibi-entity-origin records who wrote each entity with an origin kind from a closed list, stamps entities the schema 6 migration backfilled with a fixed reference, and reports unreviewed origins under its own check rules. Each is stated here so it is proved against the constant.
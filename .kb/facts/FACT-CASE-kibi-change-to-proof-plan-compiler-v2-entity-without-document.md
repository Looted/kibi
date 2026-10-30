---
title: One committed plan entity would be missing from its authored document
status: active
fact_kind: property_value
subject_key: kibi.proof.change_plan
property_key: committed_entities_missing_from_authored_documents
operator: eq
value_type: int
value_int: 1
origin:
  kind: agent
  recorded_at: '2026-10-30T15:00:33.368Z'
id: FACT-CASE-kibi-change-to-proof-plan-compiler-v2-entity-without-document
type: fact
---
The attempt the plan application must catch: an entity committed to the store but not written to its document, so a rebuild from the workspace would lose it.
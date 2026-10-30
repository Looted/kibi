---
title: A Kibi catalog operation shall be one of the 24 operations the catalog names
status: active
fact_kind: property_value
subject_key: kibi.operations.catalog_names
claim_key: CLAIM-9647A6984DF59611
claim_text: A Kibi catalog operation shall be one of the 24 operations the catalog names
text_ref: REQ-kibi-operation-catalog-names
property_key: operation_names
operator: eq
value_type: set
value_set:
  - kb_skills_list
  - kb_skills_load
  - kb_skills_read
  - kb_skills
  - kb_query
  - kb_search
  - kb_status
  - kb_find_gaps
  - kb_coverage
  - kb_graph
  - kb_semantic_advisor
  - kb_model_requirement
  - kb_suggest_predicates
  - kb_model
  - kb_plan_bootstrap
  - kb_validate_upsert
  - kb_upsert
  - kb_delete
  - kb_check
  - kb_prepare_impact_review
  - kb_sparql_remote
  - kb_compile_intent
  - kb_apply_plan
  - kb_ingest_proof
origin:
  kind: agent
  recorded_at: '2026-10-28T22:38:27.937Z'
id: FACT-operation-catalog-names
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.
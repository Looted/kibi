---
title: A staged impact diagnostic shall be kibi_impact_evidence_missing, symbols_manifest_stale or kibi_impact_override_missing_rationale
status: active
fact_kind: property_value
subject_key: kibi.staged_impact.identifiers
claim_key: CLAIM-5DCC5375F28A93DF
claim_text: A staged impact diagnostic shall be kibi_impact_evidence_missing, symbols_manifest_stale or kibi_impact_override_missing_rationale
text_ref: REQ-staged-impact-identifiers
property_key: diagnostic_ids
operator: eq
value_type: set
value_set:
  - kibi_impact_evidence_missing
  - symbols_manifest_stale
  - kibi_impact_override_missing_rationale
origin:
  kind: agent
  recorded_at: '2026-10-28T18:56:38.750Z'
id: FACT-impact-diagnostic-ids
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.
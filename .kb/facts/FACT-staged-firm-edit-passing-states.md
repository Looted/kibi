---
title: Of the firm-edit review states missing, kept, changes, statement-changed and code-changed, only kept shall let a staged change through
status: active
fact_kind: property_value
subject_key: kibi.firm_edit_review
property_key: staged_passing_review_states
operator: eq
value_type: set
value_set:
  - kept
claim_key: CLAIM-48F403C837AE3C32
claim_text: Of the firm-edit review states missing, kept, changes, statement-changed and code-changed, only kept shall let a staged change through
text_ref: REQ-kibi-staged-firm-edit-gate
origin:
  kind: agent
  recorded_at: '2026-11-16T11:04:35.818Z'
id: FACT-staged-firm-edit-passing-states
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the gate still lets exactly these review states through.
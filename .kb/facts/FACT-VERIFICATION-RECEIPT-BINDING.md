---
id: FACT-VERIFICATION-RECEIPT-BINDING
title: Verification receipts bind inspectable execution provenance fields
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
tags: [lane:ontology, requirements, verification, receipts]
fact_kind: property_value
subject_key: kibi.proof.receipts
property_key: bound_provenance_fields
operator: includes
value_type: set
value_set:
  - test_id
  - verification_scope
  - integration_command
  - code_snapshot
  - environment_hash
  - execution_fingerprint
  - timestamps
  - outcome
  - artifact_digest
claim_key: CLAIM-BCC4E6CCF9623500
claim_text: Each proof receipt must bind its test ID, typed verification scope, integration command, current code snapshot, canonical environment hash, execution fingerprint, timestamps, outcome, and artifact digest
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
type: fact
---

Typed set of the fields in the complete receipt-provenance envelope.

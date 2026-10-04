---
id: FACT-VERIFICATION-RECEIPT-HISTORY
title: Proof-bearing E2E tests retain append-only receipt history
status: superseded
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
tags:
  - lane:ontology
  - requirements
  - verification
  - receipts
fact_kind: predicate
predicate_namespace: kibi.verification
predicate_name: verification_receipt_rule
predicate_args:
  - proof_bearing_e2e_test
  - execution_receipt_history
  - append_only_v1_required
canonical_key: verification_receipt_rule(proof_bearing_e2e_test,execution_receipt_history,append_only_v1_required)
polarity: assert
claim_key: CLAIM-6DC078CEB554A685
claim_text: Proof-bearing tests must carry append-only kibi.proof-receipt.v1 execution history
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
type: fact
---

Ground predicate for the append-only receipt-history contract.

---
title: A complete per-test report attributes a failing step to the tests that own it
status: active
tags:
  - lane:ontology
  - verification
  - receipts
  - attribution
claim_key: CLAIM-B2A3EA0263B6780D
claim_text: When a command proof integration writes a complete per-test report, a failing step must fail only the tests that own it
text_ref: .kb/requirements/REQ-kibi-fresh-verification-receipts-v2.md
fact_kind: predicate
predicate_name: verification_receipt_rule
predicate_args:
  - command_proof_integration
  - complete_per_test_report
  - failure_attributed_to_owning_tests
polarity: assert
canonical_key: verification_receipt_rule(command_proof_integration,complete_per_test_report,failure_attributed_to_owning_tests)
predicate_namespace: kibi.verification
origin:
  kind: agent
  recorded_at: '2026-10-04T02:16:22.559Z'
id: FACT-VERIFICATION-RECEIPT-PER-TEST-ATTRIBUTION
type: fact
---

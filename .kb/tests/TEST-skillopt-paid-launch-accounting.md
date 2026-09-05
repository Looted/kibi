---
id: TEST-skillopt-paid-launch-accounting
title: Paid-launch gateway and receipt contracts reject attribution and trust-boundary violations
type: test
status: passing
created_at: 2026-07-26T00:00:00.000Z
updated_at: 2026-07-26T00:00:00.000Z
source: scripts/skillopt-eval/tests/model-gateway-security.test.ts
priority: must
tags:
  - skillopt
  - paid-launch
  - integration
  - security
  - accounting
verification_scope: end_to_end
verification_perspective: internal
links:
  - type: validates
    target: REQ-skillopt-paid-launch-accounting
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-skillopt-paid-launch-accounting
      target: default
  success_policy: all_required_first_attempt
---

The model-gateway suites verify exact request-ID attribution under equal request hashes, byte-identical same-request retries, one-use capability replay rejection, approved-pricing binding, pinned CA/TLS/SNI/IP/egress policy, and request, invoice, and authorization ceilings.

The paid-launch receipt suite parses strict debit-subentry, final debit/reconciliation, and final-verdict fixture artifacts, verifies their complete launch bindings and deterministic fixture signatures, and rejects unknown fields, rebound requests, and tampered signatures. The evidence-generator suite proves that serialized evidence is derived from those parser outputs without dropping reconciliation or verdict launch bindings. The authorization-broker suite verifies immutable trust roles and proves that absent external services exit nonzero before process, provider, or ledger activity.

---
id: TEST-skillopt-paid-launch-accounting
title: Paid-launch gateway and receipt contracts reject attribution and trust-boundary violations
type: test
status: passing
created_at: 2026-07-26T00:00:00Z
updated_at: 2026-07-26T00:00:00Z
source: scripts/skillopt-eval/tests/model-gateway-security.test.ts
priority: must
tags: [skillopt, paid-launch, integration, security, accounting]
verification_scope: integration
verification_perspective: internal
links:
  - type: validates
    target: SCEN-skillopt-paid-launch-accounting
---

The model-gateway suites verify exact request-ID attribution under equal request hashes, byte-identical same-request retries, one-use capability replay rejection, approved-pricing binding, pinned CA/TLS/SNI/IP/egress policy, and request, invoice, and authorization ceilings.

The paid-launch receipt suite parses strict debit-subentry, final debit/reconciliation, and final-verdict fixture artifacts, verifies their complete launch bindings and deterministic fixture signatures, and rejects unknown fields, rebound requests, and tampered signatures. The authorization-broker suite verifies immutable trust roles and proves that absent external services exit nonzero before process, provider, or ledger activity.

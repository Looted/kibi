---
id: REQ-skillopt-paid-launch-accounting
title: Paid SkillOpt launches require capability-bound trust and ledger accounting
status: open
created_at: 2026-07-26T00:00:00Z
updated_at: 2026-07-26T00:00:00Z
source: documentation/requirements/REQ-skillopt-paid-launch-accounting.md
priority: must
tags: [skillopt, paid-launch, security, accounting, umbrella]
links:
  - type: specified_by
    target: SCEN-skillopt-paid-launch-accounting
  - type: verified_by
    target: TEST-skillopt-paid-launch-accounting
---

Paid SkillOpt model launches must fail closed unless the external trust boundary validates immutable authority and supervisor-parent bindings; binds each one-use capability to the exact request ID, request hash, approved pricing, model, and lease; enforces pinned TLS, CA, SNI, IP, egress, request, invoice, and authorization ceilings; and preserves same-request idempotency without cross-request attribution.

Every accepted launch must produce strict typed debit-subentry, final debit/reconciliation, and final-verdict receipts. Those receipts must bind request, parent, capability, invoice, usage, pricing, model, and lease identities and must include signer role, signer key identity, and signature fields. Deterministic test-fixture signatures must declare `signatureProvenance: deterministic-test-fixture` and `externallySigned: false`; fixture evidence must never claim external signing.

This is intentionally an umbrella requirement because one paid launch crosses the external trust client, capability gateway, crash-safe accounting, reconciliation, and independently parsed receipt chain. Symbol ownership remains limited to the behavioral boundaries that enforce or parse those guarantees; schemas, types, errors, fields, and fixture data are structural support rather than separate implementations.

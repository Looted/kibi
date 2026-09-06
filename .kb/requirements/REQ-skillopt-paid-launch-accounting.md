---
id: REQ-skillopt-paid-launch-accounting
title: Paid SkillOpt launches require capability-bound trust and ledger accounting
status: open
created_at: 2026-07-26T00:00:00.000Z
updated_at: 2026-07-26T00:00:00.000Z
source: documentation/requirements/REQ-skillopt-paid-launch-accounting.md
priority: must
tags:
  - skillopt
  - paid-launch
  - security
  - accounting
  - umbrella
links:
  - type: specified_by
    target: SCEN-skillopt-paid-launch-accounting
  - type: verified_by
    target: TEST-skillopt-paid-launch-accounting
semantic_text: 'Paid SkillOpt model launches must fail closed unless the external trust boundary validates immutable authority and supervisor-parent bindings; binds each one-use capability to the exact request ID, request hash, approved pricing, model, and lease; enforces pinned TLS, CA, SNI, IP, egress, request, invoice, and authorization ceilings; and preserves same-request idempotency without cross-request attribution.\n\nEvery accepted launch must produce strict typed debit-subentry, final debit/reconciliation, and final-verdict receipts. Those receipts must bind request, parent, capability, invoice, usage, pricing, model, and lease identities and must include signer role, signer key identity, and signature fields. Deterministic test-fixture signatures must declare `signatureProvenance: deterministic-test-fixture` and `externallySigned: false`; fixture evidence must never claim external signing.\n\nThis is intentionally an umbrella requirement because one paid launch crosses the external trust client, capability gateway, crash-safe accounting, reconciliation, and independently parsed receipt chain. Symbol ownership remains limited to the behavioral boundaries that enforce or parse those guarantees; schemas, types, errors, fields, and fixture data are structural support rather than separate implementations.'
logic_claims:
  - CLAIM-576BF8BC10A10142
  - CLAIM-51BD088AB2866532
  - CLAIM-6525F601F1D4D17D
semantic_clauses:
  - Paid SkillOpt model launches must fail closed unless the external trust boundary validates immutable authority and supervisor-parent bindings; binds each one-use capability to the exact request ID, request hash, approved pricing, model, and lease; enforces pinned TLS, CA, SNI, IP, egress, request, invoice, and authorization ceilings; and preserves same-request idempotency without cross-request attribution.\n\nEvery accepted launch must produce strict typed debit-subentry, final debit/reconciliation, and final-verdict receipts
  - Those receipts must bind request, parent, capability, invoice, usage, pricing, model, and lease identities and must include signer role, signer key identity, and signature fields
  - 'Deterministic test-fixture signatures must declare `signatureProvenance: deterministic-test-fixture` and `externallySigned: false`; fixture evidence must never claim external signing.\n\nThis is intentionally an umbrella requirement because one paid launch crosses the external trust client, capability gateway, crash-safe accounting, reconciliation, and independently parsed receipt chain'
  - Symbol ownership remains limited to the behavioral boundaries that enforce or parse those guarantees; schemas, types, errors, fields, and fixture data are structural support rather than separate implementations
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 17bd6e65953a4293cd1ffc2be225e738b9504d16695c73a176a5827d4f146384
semantic_inventory:
  - claim_key: CLAIM-576BF8BC10A10142
    claim_text: Paid SkillOpt model launches must fail closed unless the external trust boundary validates immutable authority and supervisor-parent bindings; binds each one-use capability to the exact request ID, request hash, approved pricing, model, and lease; enforces pinned TLS, CA, SNI, IP, egress, request, invoice, and authorization ceilings; and preserves same-request idempotency without cross-request attribution.\n\nEvery accepted launch must produce strict typed debit-subentry, final debit/reconciliation, and final-verdict receipts
    role: exception
    status: modeled
    span:
      start: 0
      end: 531
  - claim_key: CLAIM-51BD088AB2866532
    claim_text: Those receipts must bind request, parent, capability, invoice, usage, pricing, model, and lease identities and must include signer role, signer key identity, and signature fields
    role: normative
    status: modeled
    span:
      start: 533
      end: 711
  - claim_key: CLAIM-5BE77E3C3E73A342
    claim_text: 'Deterministic test-fixture signatures must declare `signatureProvenance: deterministic-test-fixture` and `externallySigned: false`; fixture evidence must never claim external signing.\n\nThis is intentionally an umbrella requirement because one paid launch crosses the external trust client, capability gateway, crash-safe accounting, reconciliation, and independently parsed receipt chain'
    role: rationale
    status: nonlogical
    span:
      start: 713
      end: 1102
  - claim_key: CLAIM-6525F601F1D4D17D
    claim_text: Symbol ownership remains limited to the behavioral boundaries that enforce or parse those guarantees; schemas, types, errors, fields, and fixture data are structural support rather than separate implementations
    role: descriptive
    status: modeled
    span:
      start: 1104
      end: 1314
type: req
---

Paid SkillOpt model launches must fail closed unless the external trust boundary validates immutable authority and supervisor-parent bindings; binds each one-use capability to the exact request ID, request hash, approved pricing, model, and lease; enforces pinned TLS, CA, SNI, IP, egress, request, invoice, and authorization ceilings; and preserves same-request idempotency without cross-request attribution.

Every accepted launch must produce strict typed debit-subentry, final debit/reconciliation, and final-verdict receipts. Those receipts must bind request, parent, capability, invoice, usage, pricing, model, and lease identities and must include signer role, signer key identity, and signature fields. Deterministic test-fixture signatures must declare `signatureProvenance: deterministic-test-fixture` and `externallySigned: false`; fixture evidence must never claim external signing.

This is intentionally an umbrella requirement because one paid launch crosses the external trust client, capability gateway, crash-safe accounting, reconciliation, and independently parsed receipt chain. Symbol ownership remains limited to the behavioral boundaries that enforce or parse those guarantees; schemas, types, errors, fields, and fixture data are structural support rather than separate implementations.

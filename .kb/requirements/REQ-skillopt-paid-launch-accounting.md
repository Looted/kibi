---
id: REQ-skillopt-paid-launch-accounting
title: Paid SkillOpt launches require capability-bound trust and ledger accounting
status: open
created_at: 2026-07-26T00:00:00.000Z
updated_at: 2026-07-26T00:00:00.000Z
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
semantic_text: 'Paid SkillOpt model launches must fail closed unless the external trust boundary validates immutable authority and supervisor-parent bindings; binds the one-use capability to the exact request ID, request hash, approved pricing, model, and lease; enforces pinned TLS, CA, SNI, IP, egress, request, invoice, and authorization ceilings; and preserves same-request idempotency without cross-request attribution. An accepted launch must produce strict typed debit-subentry, final debit/reconciliation, and final-verdict receipts. Those receipts must bind request, parent, capability, invoice, usage, pricing, model, and lease identities and must include signer role, signer key identity, and signature fields. Deterministic test-fixture signatures must declare `signatureProvenance: deterministic-test-fixture` and `externallySigned: false`; fixture evidence must never claim external signing. Symbol ownership remains limited to the behavioral boundaries that enforce or parse those guarantees; schemas, types, errors, fields, and fixture data are structural support rather than separate implementations.'
logic_claims:
  - CLAIM-4645F4BEC193D483
  - CLAIM-6B11DE77E97F0868
  - CLAIM-51BD088AB2866532
  - CLAIM-7E47364D038B09DE
  - CLAIM-6525F601F1D4D17D
semantic_clauses:
  - Paid SkillOpt model launches must fail closed unless the external trust boundary validates immutable authority and supervisor-parent bindings; binds the one-use capability to the exact request ID, request hash, approved pricing, model, and lease; enforces pinned TLS, CA, SNI, IP, egress, request, invoice, and authorization ceilings; and preserves same-request idempotency without cross-request attribution.
  - An accepted launch must produce strict typed debit-subentry, final debit/reconciliation, and final-verdict receipts.
  - Those receipts must bind request, parent, capability, invoice, usage, pricing, model, and lease identities and must include signer role, signer key identity, and signature fields.
  - 'Deterministic test-fixture signatures must declare `signatureProvenance: deterministic-test-fixture` and `externallySigned: false`; fixture evidence must never claim external signing.'
  - Symbol ownership remains limited to the behavioral boundaries that enforce or parse those guarantees; schemas, types, errors, fields, and fixture data are structural support rather than separate implementations.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7d86e1c13704946ecb754d5d25cc843263bb54482317bf7a9ec7b053ca54a430
semantic_inventory:
  - claim_key: CLAIM-4645F4BEC193D483
    claim_text: Paid SkillOpt model launches must fail closed unless the external trust boundary validates immutable authority and supervisor-parent bindings; binds the one-use capability to the exact request ID, request hash, approved pricing, model, and lease; enforces pinned TLS, CA, SNI, IP, egress, request, invoice, and authorization ceilings; and preserves same-request idempotency without cross-request attribution
    role: exception
    status: modeled
    span:
      start: 0
      end: 407
  - claim_key: CLAIM-6B11DE77E97F0868
    claim_text: An accepted launch must produce strict typed debit-subentry, final debit/reconciliation, and final-verdict receipts
    role: normative
    status: modeled
    span:
      start: 409
      end: 524
  - claim_key: CLAIM-51BD088AB2866532
    claim_text: Those receipts must bind request, parent, capability, invoice, usage, pricing, model, and lease identities and must include signer role, signer key identity, and signature fields
    role: normative
    status: modeled
    span:
      start: 526
      end: 704
  - claim_key: CLAIM-7E47364D038B09DE
    claim_text: 'Deterministic test-fixture signatures must declare `signatureProvenance: deterministic-test-fixture` and `externallySigned: false`; fixture evidence must never claim external signing'
    role: normative
    status: modeled
    span:
      start: 706
      end: 888
  - claim_key: CLAIM-6525F601F1D4D17D
    claim_text: Symbol ownership remains limited to the behavioral boundaries that enforce or parse those guarantees; schemas, types, errors, fields, and fixture data are structural support rather than separate implementations
    role: descriptive
    status: modeled
    span:
      start: 890
      end: 1100
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).).'
  approved_by: maintainer
  recorded_at: '2026-11-03T12:03:44.000Z'
firmness: default
required_evidence: tested
rationale: "Paid model launches spend real money, so each launch is bound to one approved request and ledgered, and anything unverified fails closed."
---
Paid SkillOpt model launches must fail closed unless the external trust boundary validates immutable authority and supervisor-parent bindings; binds the one-use capability to the exact request ID, request hash, approved pricing, model, and lease; enforces pinned TLS, CA, SNI, IP, egress, request, invoice, and authorization ceilings; and preserves same-request idempotency without cross-request attribution.

An accepted launch must produce strict typed debit-subentry, final debit/reconciliation, and final-verdict receipts. Those receipts must bind request, parent, capability, invoice, usage, pricing, model, and lease identities and must include signer role, signer key identity, and signature fields. Deterministic test-fixture signatures must declare `signatureProvenance: deterministic-test-fixture` and `externallySigned: false`; fixture evidence must never claim external signing.

This is intentionally an umbrella requirement because one paid launch crosses the external trust client, capability gateway, crash-safe accounting, reconciliation, and independently parsed receipt chain. Symbol ownership remains limited to the behavioral boundaries that enforce or parse those guarantees; schemas, types, errors, fields, and fixture data are structural support rather than separate implementations.

## Rationale
Paid model launches spend real money, so each launch is bound to one approved request and ledgered, and anything unverified fails closed.

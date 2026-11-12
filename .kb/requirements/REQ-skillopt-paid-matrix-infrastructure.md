---
title: Paid SkillOpt matrix infrastructure executes only through external supervisor launches
status: open
owner: skillopt
priority: must
tags:
  - skillopt
  - paid-launch
  - external-boundary
  - umbrella
semantic_text: The held-out evaluation matrix, fake-provider gateway ledger, paid-launch receipt chain, and mirror-adoption transaction machinery execute only under external supervisor launches with an installed external trust plane. Repository proof runs execute these paths only through fixture-level integration contracts with deterministic-test-fixture signatures (signatureProvenance deterministic-test-fixture and externallySigned false), because the full paths require paid model launches, root-installed verifier infrastructure, and supervisor parent processes. The repository-provable fail-closed boundaries are owned by REQ-skillopt-external-adoption-verdict and REQ-skillopt-paid-launch-accounting.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ea94f17011bfd04cb203aff09a0c63337a4198507b0ccca4863ac25ecfa15a5a
semantic_inventory:
  - claim_key: CLAIM-D74430F76F1C3BB9
    claim_text: The held-out evaluation matrix, fake-provider gateway ledger, paid-launch receipt chain, and mirror-adoption transaction machinery execute only under external supervisor launches with an installed external trust plane
    role: descriptive
    status: ontology_gap
    span:
      start: 0
      end: 217
    payload_hash: 66aede6c175e1c8b3d3e98c0242b4de594cb60a7a9412dcc50bd316bb036afeb
    reason: Where these paths execute (external supervisor launches, an installed trust plane) has no domain terms in the ontology, and the requirement is proof-exempt because repository runs cannot reach them.
  - claim_key: CLAIM-9711EF1B29ADAC33
    claim_text: Repository proof runs execute these paths only through fixture-level integration contracts with deterministic-test-fixture signatures (signatureProvenance deterministic-test-fixture and externallySigned false), because the full paths require paid model launches, root-installed verifier infrastructure, and supervisor parent processes
    role: normative
    status: ontology_gap
    subjects:
      - skillopt.paid_launch.fixture_signer
      - kibi.skillopt.paid_launch
    span:
      start: 219
      end: 553
    payload_hash: 574ae094d4a8bf4d83e4b07501ec5f54ac48d0d1987f2d3025a79d34f06ab299
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-20BD89FCEC241DEC
    claim_text: The repository-provable fail-closed boundaries are owned by REQ-skillopt-external-adoption-verdict and REQ-skillopt-paid-launch-accounting
    role: descriptive
    status: ontology_gap
    span:
      start: 555
      end: 693
    payload_hash: 66aede6c175e1c8b3d3e98c0242b4de594cb60a7a9412dcc50bd316bb036afeb
    reason: Which requirement owns a boundary has no domain terms in the ontology; the two named requirements carry the provable boundaries and their own grounding.
logic_claims:
  - CLAIM-D74430F76F1C3BB9
  - CLAIM-9711EF1B29ADAC33
  - CLAIM-20BD89FCEC241DEC
proof_exempt: true
proof_exempt_reason: Executing the held-out matrix and paid-launch ledger requires paid model launches plus root-installed external trust infrastructure that repository proof runs cannot provide; verification is limited to the fixture-level integration contracts (TEST-skillopt-external-adoption-verdict, TEST-skillopt-paid-launch-accounting) and the fail-closed boundaries proven by TEST-e2e-skillopt-trust-boundaries.
id: REQ-skillopt-paid-matrix-infrastructure
type: req
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 5): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
firmness: default
required_evidence: tested
---
The held-out evaluation matrix, fake-provider gateway ledger, paid-launch receipt chain, and mirror-adoption transaction machinery execute only under external supervisor launches with an installed external trust plane. Repository proof runs execute these paths only through fixture-level integration contracts with deterministic-test-fixture signatures (signatureProvenance deterministic-test-fixture and externallySigned false), because the full paths require paid model launches, root-installed verifier infrastructure, and supervisor parent processes. The repository-provable fail-closed boundaries are owned by REQ-skillopt-external-adoption-verdict and REQ-skillopt-paid-launch-accounting.

## Why
These paths need paid model launches, root-installed verifier infrastructure and supervisor processes, which a repository run can't provide. Moving them to one exempt requirement let the baseline reach 101/101 equality, while the fail-closed boundaries stay on proven requirements.

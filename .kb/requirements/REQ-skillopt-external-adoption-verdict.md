---
id: REQ-skillopt-external-adoption-verdict
title: SkillOpt production adoption requires an independently verified external verdict
status: closed
created_at: 2026-07-30T00:00:00.000Z
updated_at: 2026-08-01T00:00:00.000Z
source: docs/skillopt.md
priority: must
tags:
  - skillopt
  - codex
  - evaluation
  - security
  - self-improvement
  - review:context-missing
links:
  - type: specified_by
    target: SCEN-skillopt-external-adoption-verdict
  - type: verified_by
    target: TEST-skillopt-external-adoption-verdict
  - type: supersedes
    target: REQ-skillopt-automatic-adoption
semantic_text: 'Local or fake SkillOpt evidence stays review-only. Production mutation of the canonical skill and mirrors is allowed only after an independently verified external verdict binds the source root, candidate hash, immutable root authorization, supervisor parent, invocation and matrix identity, and terminal evidence. This requirement does not assume any repository-hosted signer or authority service. Incomplete runtime configuration and infrastructure failures are not behavioral evidence: the bridge must reject missing or partial executable paths, and runtime, training, interruption, budget, or evidence-conflict failures must produce a structured exit-1 no-go without a terminal eligibility review. Only a complete matrix may reach external-verdict review.'
logic_claims:
  - CLAIM-B1E1D3BDCBA90F7F
  - CLAIM-65C263B803EC6E28
  - CLAIM-41362CC2441EA53F
  - CLAIM-B9D5C4F3DA7528E2
  - CLAIM-EE241F293DB8EE4F
semantic_clauses:
  - Local or fake SkillOpt evidence stays review-only.
  - Production mutation of the canonical skill and mirrors is allowed only after an independently verified external verdict binds the source root, candidate hash, immutable root authorization, supervisor parent, invocation and matrix identity, and terminal evidence.
  - This requirement does not assume any repository-hosted signer or authority service.
  - 'Incomplete runtime configuration and infrastructure failures are not behavioral evidence: the bridge must reject missing or partial executable paths, and runtime, training, interruption, budget, or evidence-conflict failures must produce a structured exit-1 no-go without a terminal eligibility review.'
  - Only a complete matrix may reach external-verdict review.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8cdfffd0c43753966a9aa2fbe6b1c7020c1cc997e684d98f4e5fc675ea4e9ff7
semantic_inventory:
  - claim_key: CLAIM-B1E1D3BDCBA90F7F
    claim_text: Local or fake SkillOpt evidence stays review-only
    role: descriptive
    status: modeled
    span:
      start: 0
      end: 49
  - claim_key: CLAIM-65C263B803EC6E28
    claim_text: Production mutation of the canonical skill and mirrors is allowed only after an independently verified external verdict binds the source root, candidate hash, immutable root authorization, supervisor parent, invocation and matrix identity, and terminal evidence
    role: descriptive
    status: modeled
    span:
      start: 51
      end: 312
  - claim_key: CLAIM-41362CC2441EA53F
    claim_text: This requirement does not assume any repository-hosted signer or authority service
    role: descriptive
    status: modeled
    span:
      start: 314
      end: 396
  - claim_key: CLAIM-B9D5C4F3DA7528E2
    claim_text: 'Incomplete runtime configuration and infrastructure failures are not behavioral evidence: the bridge must reject missing or partial executable paths, and runtime, training, interruption, budget, or evidence-conflict failures must produce a structured exit-1 no-go without a terminal eligibility review'
    role: normative
    status: modeled
    span:
      start: 398
      end: 699
  - claim_key: CLAIM-EE241F293DB8EE4F
    claim_text: Only a complete matrix may reach external-verdict review
    role: normative
    status: modeled
    span:
      start: 701
      end: 757
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6). Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:38:31.000Z'
firmness: firm
required_evidence: tested
rationale: "Changing the canonical skill affects every user, so only an independently verified external verdict, not local or fake evidence, may adopt a candidate."
---
Local or fake SkillOpt evidence stays review-only. Production mutation of the canonical skill and mirrors is allowed only after an independently verified external verdict binds the source root, candidate hash, immutable root authorization, supervisor parent, invocation and matrix identity, and terminal evidence. This requirement does not assume any repository-hosted signer or authority service.

Incomplete runtime configuration and infrastructure failures are not behavioral evidence: the bridge must reject missing or partial executable paths, and runtime, training, interruption, budget, or evidence-conflict failures must produce a structured exit-1 no-go without a terminal eligibility review. Only a complete matrix may reach external-verdict review.

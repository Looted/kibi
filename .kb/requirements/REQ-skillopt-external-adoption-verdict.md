---
id: REQ-skillopt-external-adoption-verdict
title: SkillOpt production adoption requires an independently verified external verdict
status: open
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
links:
  - type: specified_by
    target: SCEN-skillopt-external-adoption-verdict
  - type: verified_by
    target: TEST-skillopt-external-adoption-verdict
  - type: supersedes
    target: REQ-skillopt-automatic-adoption
semantic_text: 'Local or fake SkillOpt evidence stays review-only. Production mutation of the canonical skill and mirrors is allowed only after an independently verified external verdict binds the source root, candidate hash, immutable root authorization, supervisor parent, invocation and matrix identity, and terminal evidence. This requirement does not assume any repository-hosted signer or authority service.\n\nIncomplete runtime configuration and infrastructure failures are not behavioral evidence: the bridge must reject missing or partial executable paths, and runtime, training, interruption, budget, or evidence-conflict failures must produce a structured exit-1 no-go without a terminal eligibility review. Only a complete matrix may reach external-verdict review.'
logic_claims:
  - CLAIM-B1E1D3BDCBA90F7F
  - CLAIM-65C263B803EC6E28
  - CLAIM-B17D92322CD168A9
  - CLAIM-EE241F293DB8EE4F
semantic_clauses:
  - Local or fake SkillOpt evidence stays review-only
  - Production mutation of the canonical skill and mirrors is allowed only after an independently verified external verdict binds the source root, candidate hash, immutable root authorization, supervisor parent, invocation and matrix identity, and terminal evidence
  - 'This requirement does not assume any repository-hosted signer or authority service.\n\nIncomplete runtime configuration and infrastructure failures are not behavioral evidence: the bridge must reject missing or partial executable paths, and runtime, training, interruption, budget, or evidence-conflict failures must produce a structured exit-1 no-go without a terminal eligibility review'
  - Only a complete matrix may reach external-verdict review
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 458117cb3bfd7c4845adaec2b2175fa6d78a02358b84062237f4875107b7bd92
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
  - claim_key: CLAIM-B17D92322CD168A9
    claim_text: 'This requirement does not assume any repository-hosted signer or authority service.\n\nIncomplete runtime configuration and infrastructure failures are not behavioral evidence: the bridge must reject missing or partial executable paths, and runtime, training, interruption, budget, or evidence-conflict failures must produce a structured exit-1 no-go without a terminal eligibility review'
    role: normative
    status: modeled
    span:
      start: 314
      end: 702
  - claim_key: CLAIM-EE241F293DB8EE4F
    claim_text: Only a complete matrix may reach external-verdict review
    role: normative
    status: modeled
    span:
      start: 704
      end: 760
type: req
---

Local or fake SkillOpt evidence stays review-only. Production mutation of the canonical skill and mirrors is allowed only after an independently verified external verdict binds the source root, candidate hash, immutable root authorization, supervisor parent, invocation and matrix identity, and terminal evidence. This requirement does not assume any repository-hosted signer or authority service.

Incomplete runtime configuration and infrastructure failures are not behavioral evidence: the bridge must reject missing or partial executable paths, and runtime, training, interruption, budget, or evidence-conflict failures must produce a structured exit-1 no-go without a terminal eligibility review. Only a complete matrix may reach external-verdict review.

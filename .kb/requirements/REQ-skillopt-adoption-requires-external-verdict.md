---
title: SkillOpt keeps local evidence review-only and mutates the canonical skill only after an independently verified external verdict
status: open
semantic_text: Local or fake SkillOpt evidence stays review-only. Production mutation of the canonical skill and mirrors is allowed only after an independently verified external verdict binds the source root, candidate hash, immutable root authorization, supervisor parent, invocation and matrix identity, and terminal evidence. This requirement does not assume any repository-hosted signer or authority service.
semantic_clauses:
  - Local or fake SkillOpt evidence stays review-only
  - Production mutation of the canonical skill and mirrors is allowed only after an independently verified external verdict binds the source root, candidate hash, immutable root authorization, supervisor parent, invocation and matrix identity, and terminal evidence
  - This requirement does not assume any repository-hosted signer or authority service
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0da135c93a9cd5cd22ea1d1f26b402e607d73329b27c208b3d2ac7b110975cb2
semantic_inventory:
  - claim_key: CLAIM-B1E1D3BDCBA90F7F
    claim_text: Local or fake SkillOpt evidence stays review-only
    role: descriptive
    status: modeled
    span:
      start: 0
      end: 49
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-65C263B803EC6E28
    claim_text: Production mutation of the canonical skill and mirrors is allowed only after an independently verified external verdict binds the source root, candidate hash, immutable root authorization, supervisor parent, invocation and matrix identity, and terminal evidence
    role: descriptive
    status: modeled
    span:
      start: 51
      end: 312
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-41362CC2441EA53F
    claim_text: This requirement does not assume any repository-hosted signer or authority service
    role: descriptive
    status: modeled
    span:
      start: 314
      end: 396
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-B1E1D3BDCBA90F7F
  - CLAIM-65C263B803EC6E28
  - CLAIM-41362CC2441EA53F
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T09:55:23.297Z'
priority: must
firmness: firm
required_evidence: tested
tags:
  - skillopt
  - adoption
  - security
  - self-improvement
id: REQ-skillopt-adoption-requires-external-verdict
type: req
---
Local or fake SkillOpt evidence stays review-only. Production mutation of the canonical skill and mirrors is allowed only after an independently verified external verdict binds the source root, candidate hash, immutable root authorization, supervisor parent, invocation and matrix identity, and terminal evidence. This requirement does not assume any repository-hosted signer or authority service.

## Context

Local and fake runs produce review artifacts only; changing the canonical skill and its mirrors needs a verdict bound to the exact source, candidate and evidence, from outside the repository.

SkillOpt can rewrite the skills Kibi ships, so a production change needs a verdict SkillOpt cannot produce for itself, and a run that broke for infrastructure reasons must never read as a behavioral result.

## Why this changed

Split from REQ-skillopt-external-adoption-verdict, which held two behaviors: production adoption only after an independently verified external verdict, and keeping infrastructure failures and incomplete matrices out of that review. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"

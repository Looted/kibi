---
title: Kibi check reports a coarse module, config or aggregate symbol that spans unrelated requirement tag clusters next to narrower symbols as a non-blocking quality diagnostic
status: open
semantic_text: Kibi check must report a non-blocking quality diagnostic when a coarse module, config or aggregate symbol implements requirements from unrelated tag clusters while narrower symbols exist in the same file.
semantic_clauses:
  - Kibi check must report a non-blocking quality diagnostic when a coarse module, config or aggregate symbol implements requirements from unrelated tag clusters while narrower symbols exist in the same file
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b31f6637ad14b4811119be902c56c49d7a9d4326618b3b7c81f17be6b1952501
semantic_inventory:
  - claim_key: CLAIM-F90AC38F272EA6C0
    claim_text: Kibi check must report a non-blocking quality diagnostic when a coarse module, config or aggregate symbol implements requirements from unrelated tag clusters while narrower symbols exist in the same file
    role: normative
    status: modeled
    span:
      start: 0
      end: 203
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-F90AC38F272EA6C0
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-10, approving the reworded children in the KB gold-standard review (batch 5 rewordings): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T14:53:12.272Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - check
  - quality-diagnostics
  - symbols
id: REQ-kibi-symbol-granularity-quality
type: req
---
Kibi check must report a non-blocking quality diagnostic when a coarse module, config or aggregate symbol implements requirements from unrelated tag clusters while narrower symbols exist in the same file.

## Context

A class, service, component, module or config symbol that owns requirements sharing no tag is probably doing several unrelated jobs. When the same file already has narrower members, the ownership can move to them, so Kibi raises component_mixed_purpose_review as a review prompt. It never blocks: whether the cohesion is real is a judgement call. A coarse symbol next to narrower behavioral symbols without a granularity reason is a separate, blocking symbol-granularity violation.

Carved out of REQ-audit-quality-diagnostics-v1, which keeps the split between hard violations and non-blocking quality diagnostics; this child names one quality signal about coarse symbols.

## Source

> Maintainer decision, 2026-11-10, approving the reworded children in the KB gold-standard review (batch 5 rewordings): "Ok"

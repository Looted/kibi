---
title: SkillOpt offline workflow contracts carry no assembled-bundle gate, phase or result
status: open
semantic_text: The offline workflow contracts must carry no assembled-bundle gate, phase or result.
semantic_clauses:
  - The offline workflow contracts must carry no assembled-bundle gate, phase or result
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c7d0e01e0bbbba33bc8645b4d076d555fe1a146858f9d7db0320ae9fc477ac78
semantic_inventory:
  - claim_key: CLAIM-9F6D9D7156768934
    claim_text: The offline workflow contracts must carry no assembled-bundle gate, phase or result
    role: normative
    status: modeled
    span:
      start: 0
      end: 83
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-9F6D9D7156768934
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T09:31:29.911Z'
priority: must
firmness: firm
tags:
  - skillopt
  - contracts
  - evaluation
id: REQ-skillopt-offline-contract-without-bundle-gate
type: req
---
The offline workflow contracts must carry no assembled-bundle gate, phase or result.

## Context

The assembled-bundle gate was removed, so the offline contracts drop its gate, phase and result rather than carrying a step that no longer runs.

SkillOpt compares skill revisions by running agents on them, so its results only mean something when every cell ran on the same harness, adoption is gated on reviewed evidence, and the feedback the optimizer sees is public.

## Why this changed

Split from REQ-skillopt-host-neutral-optimization, which held four behaviors: binding a run and its evidence to one harness, gating candidate adoption, reporting the first missing protocol call, and the offline contract shape. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"

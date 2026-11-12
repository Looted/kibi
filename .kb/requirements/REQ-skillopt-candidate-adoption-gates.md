---
title: SkillOpt adopts a candidate only after every gate passes and a reviewer approves its exact hashes, and changes only skill bodies
status: open
semantic_text: Candidate adoption must stay blocked until every individual gate passes and a reviewer approves the exact candidate hashes. Optimization must change only skill bodies and must keep skill frontmatter and declared resources unchanged.
semantic_clauses:
  - Candidate adoption must stay blocked until every individual gate passes and a reviewer approves the exact candidate hashes
  - Optimization must change only skill bodies and must keep skill frontmatter and declared resources unchanged
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9e88a4e9484b06764bed9501730369f190bc556ff50c9893f38ce4b2022e3887
semantic_inventory:
  - claim_key: CLAIM-FEB7DB627F63E85C
    claim_text: Candidate adoption must stay blocked until every individual gate passes and a reviewer approves the exact candidate hashes
    role: normative
    status: modeled
    span:
      start: 0
      end: 122
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-5C91D119516DA596
    claim_text: Optimization must change only skill bodies and must keep skill frontmatter and declared resources unchanged
    role: normative
    status: modeled
    span:
      start: 124
      end: 231
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-FEB7DB627F63E85C
  - CLAIM-5C91D119516DA596
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T09:29:35.455Z'
priority: must
firmness: firm
tags:
  - skillopt
  - adoption
  - evaluation
id: REQ-skillopt-candidate-adoption-gates
type: req
---
Candidate adoption must stay blocked until every individual gate passes and a reviewer approves the exact candidate hashes. Optimization must change only skill bodies and must keep skill frontmatter and declared resources unchanged.

## Context

An optimizer rewriting skills must not change what a skill declares or loads, and nothing it writes is adopted until each gate passes on its own and a person approves the exact candidate.

SkillOpt compares skill revisions by running agents on them, so its results only mean something when every cell ran on the same harness, adoption is gated on reviewed evidence, and the feedback the optimizer sees is public.

## Why this changed

Split from REQ-skillopt-host-neutral-optimization, which held four behaviors: binding a run and its evidence to one harness, gating candidate adoption, reporting the first missing protocol call, and the offline contract shape. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"

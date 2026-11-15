---
title: SkillOpt no-regression judges each family on pooled pass rates against a noise floor
status: open
priority: should
required_evidence: tested
semantic_text: SkillOpt no-regression shall judge each family on its pooled pass rate over at least 16 cells per arm, compared with a baseline-against-baseline noise floor, not on single cells.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ae0ab4295253c497a8fc83a25b75683ef7b54c9ea7fbf4e35f03b64bbca62fda
semantic_inventory:
  - claim_key: CLAIM-0DF8C52FCD2536F0
    claim_text: SkillOpt no-regression shall judge each family on its pooled pass rate over at least 16 cells per arm, compared with a baseline-against-baseline noise floor, not on single cells
    role: normative
    status: modeled
    span:
      start: 0
      end: 177
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-0DF8C52FCD2536F0
tags:
  - skillopt
  - scoring
  - evaluation
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for refused .kb reads, reference answers and pooled family gates in SkillOpt scoring: "Approved"'
  recorded_at: '2026-11-13T19:10:00.000Z'
  approved_by: maintainer
id: REQ-skillopt-pooled-family-gate
type: req
---
SkillOpt no-regression shall judge each family on its pooled pass rate over at least 16 cells per arm, compared with a baseline-against-baseline noise floor, not on single cells.

## Context

The campaign no-regression rule failed a family when its candidate mean or hard passes fell below the baseline's in a single run, often by one cell. With two repeats a family holds two to six cells per arm, and the baseline alone swung between 70.5 and 92.75 across runs with the same skill text, so the rule rejected candidates on noise. `compareAggregates` now judges a family through `judgeFamily` only when each arm pools at least 16 cells, and reports smaller families as underpowered. `noise-floor.ts` measures each family's floor from baseline runs alone, and `campaign.ts evaluate|confirm --noise-floor FILE` binds it into the evaluation.

## Source

> Maintainer decision, 2026-11-13, approving the requirement statements for refused .kb reads, reference answers and pooled family gates in SkillOpt scoring: "Approved"
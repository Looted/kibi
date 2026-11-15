---
title: Every SkillOpt case has a reference answer scoring 100, checked by the harness
status: open
priority: should
required_evidence: tested
semantic_text: Every SkillOpt case shall have a reference answer that the scorer rates at 100, and harness verification shall fail when any case's reference answer scores below 100.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 879d26e5377cf0633ec4318e85bcf91601dcc5dccc439dc00ffbe51963307ace
semantic_inventory:
  - claim_key: CLAIM-C131F88C8E06DC3A
    claim_text: Every SkillOpt case shall have a reference answer that the scorer rates at 100
    role: normative
    status: modeled
    span:
      start: 0
      end: 78
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-C38C774DF4BD9A22
    claim_text: harness verification shall fail when any case's reference answer scores below 100
    role: normative
    status: modeled
    span:
      start: 84
      end: 165
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-C131F88C8E06DC3A
  - CLAIM-C38C774DF4BD9A22
tags:
  - skillopt
  - scoring
  - evaluation
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for refused .kb reads, reference answers and pooled family gates in SkillOpt scoring: "Approved"'
  recorded_at: '2026-11-13T19:10:00.000Z'
  approved_by: maintainer
id: REQ-skillopt-reference-answers-score-100
type: req
---
Every SkillOpt case shall have a reference answer that the scorer rates at 100, and harness verification shall fail when any case's reference answer scores below 100.

## Context

Paid SkillOpt cells were spent on cases that no answer could pass: checks that read the verifier's own reads for an approval only the agent's call carries, a migration fixture whose moved requirement failed the check, and cases about receipts and recorded diagnostic dispositions that no Kibi version produces. A scripted reference answer makes real MCP calls against the staged server and is scored like a paid cell, so a case below 100 is a harness defect, not a skill gap. `scripts/skillopt-eval/reference/verify.ts --skill SKILL` runs every case's reference and exits non-zero when one is missing or scores below 100. References land per skill, kibi-usage first.

## Source

> Maintainer decision, 2026-11-13, approving the requirement statements for refused .kb reads, reference answers and pooled family gates in SkillOpt scoring: "Approved"
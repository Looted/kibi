---
title: A refused .kb/ read costs a SkillOpt cell its isolation points, not a critical failure
status: open
priority: should
required_evidence: tested
semantic_text: A .kb/ read that the agent's host refused shall cost a SkillOpt cell its isolation points without counting as a critical failure. A read that succeeded, a shell command naming .kb/, and any write to .kb/ stay critical.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9350d07e2e59102fe673aed295a31ca2749c0239b58d2c4c2de3b431188b0e24
semantic_inventory:
  - claim_key: CLAIM-436F5703622CE146
    claim_text: A .kb/ read that the agent's host refused shall cost a SkillOpt cell its isolation points without counting as a critical failure
    role: normative
    status: modeled
    span:
      start: 0
      end: 128
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-787B4AAFBEC70AED
    claim_text: A read that succeeded, a shell command naming .kb/, and any write to .kb/ stay critical
    role: descriptive
    status: modeled
    span:
      start: 130
      end: 217
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-436F5703622CE146
  - CLAIM-787B4AAFBEC70AED
tags:
  - skillopt
  - scoring
  - evaluation
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for refused .kb reads, reference answers and pooled family gates in SkillOpt scoring: "Approved"'
  recorded_at: '2026-11-13T19:10:00.000Z'
  approved_by: maintainer
id: REQ-skillopt-refused-kb-read-not-critical
type: req
---
A `.kb/` read that the agent's host refused shall cost a SkillOpt cell its isolation points without counting as a critical failure. A read that succeeded, a shell command naming `.kb/`, and any write to `.kb/` stay critical.

## Context

The scorer matched the path of every `.kb/` read attempt and zeroed the cell, even when the host refused the read and nothing was accessed. In the kibi-usage requirement split case, 8 of 9 cells zeroed this way had a correct split and no other critical failure, so the family score measured refusals, not KB access. A refused file read is now counted in `deniedKbReads` by `normalizeCodexJsonl` and costs the isolation points through `deniedReadScore`; a completed read, a read with no recorded outcome, a shell command naming `.kb/` and any write still record `direct_kb_access`.

## Source

> Maintainer decision, 2026-11-13, approving the requirement statements for refused .kb reads, reference answers and pooled family gates in SkillOpt scoring: "Approved"
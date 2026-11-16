---
title: Kibi check does not report restated twin facts as duplicates
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - check
  - facts
semantic_text: Kibi check must not report identical value facts as one claim minted twice when their requirements are linked by restates or supersedes.
rationale: A fact carries the claim key of one wording, so a requirement that restates another in its own words must ground its own fact. Putting both facts on one subject and property lets domain-contradictions catch a value changed in one place and kept in the other; reporting the twins as a duplicate would push the two names apart again. domain-redundancy already exempts restated pairs.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, on how the KB cleanup handles pairs that state the same value in different words: "Allow restated twins in the check"'
  approved_by: maintainer
  recorded_at: '2026-11-16T10:52:45.486Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 66f161959dc2212b53e96d0f00073609d4cc7f6aa5d765fb076428168e79ce57
semantic_inventory:
  - claim_key: CLAIM-C64EB569E862E357
    claim_text: Kibi check must not report identical value facts as one claim minted twice when their requirements are linked by restates or supersedes
    role: normative
    status: modeled
    span:
      start: 0
      end: 135
logic_claims:
  - CLAIM-C64EB569E862E357
id: REQ-check-restated-twin-facts
type: req
---
Kibi check must not report identical value facts as one claim minted twice when their requirements are linked by restates or supersedes.

## Context

A fact carries the claim key of one wording, so a requirement that restates another in its own words must ground its own fact. Putting both facts on one subject and property lets domain-contradictions catch a value changed in one place and kept in the other; reporting the twins as a duplicate would push the two names apart again. domain-redundancy already exempts restated pairs.

## Source

> Maintainer decision, 2026-11-16, on how the KB cleanup handles pairs that state the same value in different words: "Allow restated twins in the check"
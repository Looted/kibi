---
title: kb_upsert flags a sibling whose claim still states the old value
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - upsert
  - sibling-requirements
semantic_text: kb_upsert must flag a listed requirement whose claim text still states the value from before the write.
rationale: 'In the benchmark a change moved one requirement''s value while a second requirement constrained the same quantity; the write was accepted, the second requirement kept its old wording, and nothing told the agent it existed, so the record ended with two requirements that disagreed and an agent that stopped as if done. Listing every sibling is not enough when only some of them still say the old number: the flag points at the claims that are now wrong.'
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T19:17:05.891Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c035e3e80b27c06008841f8c9b3c0c482dad26c7e3d7c7e351bde7506f2041dc
semantic_inventory:
  - claim_key: CLAIM-A958B79C47032D8A
    claim_text: kb_upsert must flag a listed requirement whose claim text still states the value from before the write
    role: normative
    status: modeled
    span:
      start: 0
      end: 102
logic_claims:
  - CLAIM-A958B79C47032D8A
id: REQ-upsert-flags-stale-sibling-claim
type: req
---
kb_upsert must flag a listed requirement whose claim text still states the value from before the write.

## Context

In the benchmark a change moved one requirement's value while a second requirement constrained the same quantity; the write was accepted, the second requirement kept its old wording, and nothing told the agent it existed, so the record ended with two requirements that disagreed and an agent that stopped as if done. Listing every sibling is not enough when only some of them still say the old number: the flag points at the claims that are now wrong.

## Source

> Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"
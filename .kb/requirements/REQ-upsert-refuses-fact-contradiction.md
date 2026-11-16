---
title: kb_upsert refuses a fact write that makes requirements contradict
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - upsert
  - sibling-requirements
semantic_text: kb_upsert must refuse a value fact write that makes two current requirements contradict.
rationale: In the benchmark a change moved one requirement's value while a second requirement constrained the same quantity; the write was accepted, the second requirement kept its old wording, and nothing told the agent it existed, so the record ended with two requirements that disagreed and an agent that stopped as if done. A requirement write was already refused for the same contradiction; a write to the fact under it was not.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T19:17:01.264Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 49467931ff84276e56466a4ecf6ace708f3a4e610d4e60ea19a43b0f5f92011e
semantic_inventory:
  - claim_key: CLAIM-E21924B8939F7A5F
    claim_text: kb_upsert must refuse a value fact write that makes two current requirements contradict
    role: normative
    status: modeled
    span:
      start: 0
      end: 87
logic_claims:
  - CLAIM-E21924B8939F7A5F
id: REQ-upsert-refuses-fact-contradiction
type: req
---
kb_upsert must refuse a value fact write that makes two current requirements contradict.

## Context

In the benchmark a change moved one requirement's value while a second requirement constrained the same quantity; the write was accepted, the second requirement kept its old wording, and nothing told the agent it existed, so the record ended with two requirements that disagreed and an agent that stopped as if done. A requirement write was already refused for the same contradiction; a write to the fact under it was not.

## Source

> Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"
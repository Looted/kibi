---
title: kb_upsert lists the other requirements on the quantity it changes
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - upsert
  - sibling-requirements
semantic_text: kb_upsert must list every other current requirement that constrains the quantity whose value the write changes.
rationale: In the benchmark a change moved one requirement's value while a second requirement constrained the same quantity; the write was accepted, the second requirement kept its old wording, and nothing told the agent it existed, so the record ended with two requirements that disagreed and an agent that stopped as if done.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T19:17:03.545Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ba479bda9d4d0db161a2d5997fbaefbbd9ffae2d7cde71227ac1c45c4a97d290
semantic_inventory:
  - claim_key: CLAIM-286E29CD707E4A12
    claim_text: kb_upsert must list every other current requirement that constrains the quantity whose value the write changes
    role: normative
    status: modeled
    span:
      start: 0
      end: 110
logic_claims:
  - CLAIM-286E29CD707E4A12
id: REQ-upsert-lists-sibling-requirements
type: req
---
kb_upsert must list every other current requirement that constrains the quantity whose value the write changes.

## Context

In the benchmark a change moved one requirement's value while a second requirement constrained the same quantity; the write was accepted, the second requirement kept its old wording, and nothing told the agent it existed, so the record ended with two requirements that disagreed and an agent that stopped as if done.

## Source

> Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"
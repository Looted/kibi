---
title: The builtin semantic classifier classifies requirement sentences deterministically without a network call
status: open
semantic_text: The builtin semantic classifier must classify requirement sentences deterministically without a network call.
semantic_clauses:
  - The builtin semantic classifier must classify requirement sentences deterministically without a network call
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9c4e2e78bbe4f1b67c28648ac040dfa48ef0b594bc74adf4cd1f119db8973bb1
semantic_inventory:
  - claim_key: CLAIM-0B8B3B1B60C019C8
    claim_text: The builtin semantic classifier must classify requirement sentences deterministically without a network call
    role: normative
    status: modeled
    span:
      start: 0
      end: 108
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-0B8B3B1B60C019C8
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T10:41:23.022Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - plugins
  - semantic-classifier
id: REQ-kibi-builtin-semantic-classifier
type: req
---
The builtin semantic classifier must classify requirement sentences deterministically without a network call.

## Context

The classifier detects signals with fixed patterns and picks the lane by a fixed precedence (strict_property, then predicate, then none), so classification works offline and repeats exactly; the plugin also declares no network permission.

Carved out of REQ-capability-plugin-builtin-parity-v1, which keeps the rule that the host uses only the builtin providers when kibi.plugins is absent; each child names what one builtin provider decides.

## Source

> Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"

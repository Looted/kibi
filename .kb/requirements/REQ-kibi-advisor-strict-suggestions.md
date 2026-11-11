---
title: The semantic advisor suggests a strict property or count fact for a sentence that states one measurable value
status: open
semantic_text: The semantic advisor must suggest a strict property or count fact when a sentence states a single measurable value.
semantic_clauses:
  - The semantic advisor must suggest a strict property or count fact when a sentence states a single measurable value
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6ad5a6cc831ff4be405b27d6a493a1e6187e4dc69931d06cb1dfc72492192a96
semantic_inventory:
  - claim_key: CLAIM-08395AEC93C42EA1
    claim_text: The semantic advisor must suggest a strict property or count fact when a sentence states a single measurable value
    role: normative
    status: modeled
    span:
      start: 0
      end: 114
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-08395AEC93C42EA1
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T10:33:26.826Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - semantic-advisor
  - modeling
  - strict-lane
id: REQ-kibi-advisor-strict-suggestions
type: req
---
The semantic advisor must suggest a strict property or count fact when a sentence states a single measurable value.

## Context

A sentence such as an expiry period or a minimum count is directly checkable, so the advisor proposes the exact subject, property, operator and value instead of leaving it as prose.

Carved out of REQ-mcp-semantic-advisor-preflight, which keeps the advisor surface as a whole; each child names one kind of suggestion the advisor decides.

## Source

> Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"

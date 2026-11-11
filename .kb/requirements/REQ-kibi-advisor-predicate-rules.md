---
title: The semantic advisor suggests a predicate fact for a sentence that matches a core, policy or product predicate rule
status: open
semantic_text: The semantic advisor must suggest a predicate fact when a sentence matches a core, policy or product predicate rule.
semantic_clauses:
  - The semantic advisor must suggest a predicate fact when a sentence matches a core, policy or product predicate rule
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1d16c1a05fb3713cf3b4634d55aa704291ca3473030659f21a73554003909cc3
semantic_inventory:
  - claim_key: CLAIM-899B1AE6197A11C3
    claim_text: The semantic advisor must suggest a predicate fact when a sentence matches a core, policy or product predicate rule
    role: normative
    status: modeled
    span:
      start: 0
      end: 115
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-899B1AE6197A11C3
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T10:34:06.158Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - semantic-advisor
  - modeling
  - predicates
id: REQ-kibi-advisor-predicate-rules
type: req
---
The semantic advisor must suggest a predicate fact when a sentence matches a core, policy or product predicate rule.

## Context

Relational prose such as a guard condition or a before/after order cannot be one property value, so the advisor names the matching predicate and its arguments.

Carved out of REQ-mcp-semantic-advisor-preflight, which keeps the advisor surface as a whole; each child names one kind of suggestion the advisor decides.

## Source

> Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"

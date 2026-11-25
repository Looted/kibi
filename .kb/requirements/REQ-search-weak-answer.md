---
title: A weak kb_search answer lists the words no card holds and names no governing requirement
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - search
  - retrieval
semantic_text: A kb_search answer must list the question's words that no returned decision contains. A kb_search answer must not state that nothing governs the question. A kb_search answer must name a decision as governing only when its card, or the card it is folded into, reaches the governing coverage of the question's weight.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-25, on the question "Approve the six search requirement changes as worded?", after the offline replay of the retrieval rethink: "Approve all six"'
  approved_by: maintainer
  recorded_at: '2026-11-25T20:15:30.324Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0a6df9ebba62adab91cfeca80af809b95c2945861571ceeb63a8bc7b53dd4f08
semantic_inventory:
  - claim_key: CLAIM-CD1BEBB8A904E2A5
    claim_text: A kb_search answer must list the question's words that no returned decision contains
    role: normative
    status: modeled
    span:
      start: 0
      end: 84
  - claim_key: CLAIM-887F915078740001
    claim_text: A kb_search answer must not state that nothing governs the question
    role: normative
    status: modeled
    span:
      start: 86
      end: 153
  - claim_key: CLAIM-54E9518946C246C3
    claim_text: A kb_search answer must name a decision as governing only when its card, or the card it is folded into, reaches the governing coverage of the question's weight
    role: normative
    status: modeled
    span:
      start: 155
      end: 314
logic_claims:
  - CLAIM-CD1BEBB8A904E2A5
  - CLAIM-887F915078740001
  - CLAIM-54E9518946C246C3
id: REQ-search-weak-answer
type: req
---
A kb_search answer must list the question's words that no returned decision contains. A kb_search answer must not state that nothing governs the question. A kb_search answer must name a decision as governing only when its card, or the card it is folded into, reaches the governing coverage of the question's weight.

## Why this changed

A missing match is not evidence that nothing governs a question, and the nearest decisions of a question the knowledge base cannot answer looked like governing ones. On Kibi's repository gold set, naming governing decisions only from cards that cover half the question kept abstention precision and recall at 1 while the top three still held the governing decision for 94% of questions.

## Context

The governing coverage is recorded in REQ-search-meaning-limits. A weak answer still returns its nearest cards and the next step of REQ-kibi-search-abstention-next-step.

## Source

> Maintainer decision, 2026-11-25, on the question "Approve the six search requirement changes as worded?", after the offline replay of the retrieval rethink: "Approve all six"

---
title: Search folds replaced and near-identical decisions into the card above them
status: open
priority: must
required_evidence: tested
tags:
  - search
  - retrieval
semantic_text: Search must fold a superseded decision into the current end of its supersession chain. Search must fold a decision whose title shares at least 80% of its words with a higher-ranked decision into that decision, unless either is firm or only one of the two is negated. A folded decision must stay listed on the card it was folded into.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-25, on the question "Approve the six search requirement changes as worded?", after the offline replay of the retrieval rethink: "Approve all six"'
  approved_by: maintainer
  recorded_at: '2026-11-25T14:37:11.531Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c45347e8662777f347219265299e1371535560c0b4954d3f851d3bd1f472dc7e
semantic_inventory:
  - claim_key: CLAIM-9E9BE508860DDBEB
    claim_text: Search must fold a superseded decision into the current end of its supersession chain
    role: normative
    status: modeled
    span:
      start: 0
      end: 85
  - claim_key: CLAIM-B8967D9E133160F9
    claim_text: Search must fold a decision whose title shares at least 80% of its words with a higher-ranked decision into that decision, unless either is firm or only one of the two is negated
    role: exception
    status: modeled
    span:
      start: 87
      end: 265
  - claim_key: CLAIM-FAE90152E14E5075
    claim_text: A folded decision must stay listed on the card it was folded into
    role: normative
    status: modeled
    span:
      start: 267
      end: 332
logic_claims:
  - CLAIM-9E9BE508860DDBEB
  - CLAIM-B8967D9E133160F9
  - CLAIM-FAE90152E14E5075
id: REQ-search-decision-collapse
type: req
---
Search must fold a superseded decision into the current end of its supersession chain. Search must fold a decision whose title shares at least 80% of its words with a higher-ranked decision into that decision, unless either is firm or only one of the two is negated. A folded decision must stay listed on the card it was folded into.

## Context

Template look-alikes tie at the top of a crowded store and fill the answer with near copies. Folding them shows distinct decisions instead. Distinct firm rules often share most of their title words and differ only in a qualifier such as the role or a negation, so a firm decision and one of opposite polarity are never folded, and folding only compares a candidate with the first twenty rows shown.

## Source

> Maintainer decision, 2026-11-25, on the question "Approve the six search requirement changes as worded?", after the offline replay of the retrieval rethink: "Approve all six"

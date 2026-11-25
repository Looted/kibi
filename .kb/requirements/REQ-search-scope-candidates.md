---
title: Search keeps unscoped and distant decisions as candidates and counts other scopes
status: open
priority: must
required_evidence: tested
tags:
  - search
  - retrieval
semantic_text: Search must keep an unscoped decision as a candidate at no less than 85% of its score. Search must keep a distant decision as a candidate at half its score. Search must report decisions in another scope only as a count with their leading ids.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-25, on the question "Approve the six search requirement changes as worded?", after the offline replay of the retrieval rethink: "Approve all six"'
  approved_by: maintainer
  recorded_at: '2026-11-25T14:37:04.459Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: eb7d8f5123327f1d4f6018ab02a2a02ee3b94f75f06ad52ce0b6426b2701715b
semantic_inventory:
  - claim_key: CLAIM-62F17FD0057B139B
    claim_text: Search must keep an unscoped decision as a candidate at no less than 85% of its score
    role: normative
    status: modeled
    span:
      start: 0
      end: 85
  - claim_key: CLAIM-C6214FB259DEDB74
    claim_text: Search must keep a distant decision as a candidate at half its score
    role: normative
    status: modeled
    span:
      start: 87
      end: 155
  - claim_key: CLAIM-BE4D2A9CC0077C3A
    claim_text: Search must report decisions in another scope only as a count with their leading ids
    role: normative
    status: modeled
    span:
      start: 157
      end: 241
logic_claims:
  - CLAIM-62F17FD0057B139B
  - CLAIM-C6214FB259DEDB74
  - CLAIM-BE4D2A9CC0077C3A
id: REQ-search-scope-candidates
type: req
---
Search must keep an unscoped decision as a candidate at no less than 85% of its score. Search must keep a distant decision as a candidate at half its score. Search must report decisions in another scope only as a count with their leading ids.

## Context

A freshly recorded rule, or a decision from a source nobody has linked yet, has no scope evidence; filtering it out would hide the governing decision exactly when its links are missing. With the governing decision's links hidden in the replay, scope by link or provenance still put it in the top ten for 97% of agents' searches. Decisions in another scope stay visible as a count so a wrong scope can be noticed.

## Source

> Maintainer decision, 2026-11-25, on the question "Approve the six search requirement changes as worded?", after the offline replay of the retrieval rethink: "Approve all six"

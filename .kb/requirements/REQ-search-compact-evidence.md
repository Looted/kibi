---
title: kb_search returns graph paths and fact calls only with fields full
status: open
priority: must
required_evidence: tested
tags:
  - progressive-disclosure
  - search
semantic_text: Without fields set to full, kb_search must leave out each result's evidence graph paths and each answer fact's kb_query call.
origin:
  kind: agent
  ref: 'Maintainer request, 2026-11-16: give the statement and the recorded reason in the first search and edit layer'
  approved_by: maintainer
  recorded_at: '2026-11-16T15:56:06.710Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5c3c5fee15abcf64836d50b618935670ffcd2e654499884fa713c9c8696072a4
semantic_inventory:
  - claim_key: CLAIM-B5881084C6A81878
    claim_text: Without fields set to full, kb_search must leave out each result's evidence graph paths and each answer fact's kb_query call
    role: normative
    status: modeled
    span:
      start: 0
      end: 124
logic_claims:
  - CLAIM-B5881084C6A81878
id: REQ-search-compact-evidence
type: req
---
Without fields set to full, kb_search must leave out each result's evidence graph paths and each answer fact's kb_query call.

## Why

The statement and the reason added to the answer had to be paid for. On Kibi's own KB the graph paths in results were 3k to 4.6k characters per why question and the per-fact kb_query calls up to 2.9k, both structure an agent seldom reads before it knows what the rule says. The requirement's id still leads to them, and fields full returns them.

## Source

> Maintainer request, 2026-11-16: give the statement and the recorded reason in the first search and edit layer
---
title: kb_search ranks decisions, credited with the words of their facts and symbols
status: open
priority: must
required_evidence: tested
firmness: firm
tags:
  - search
  - retrieval
semantic_text: Search must rank requirements and ADRs as the decisions of a kb_search answer. Search must credit each decision with the words of the facts it links and of the symbols that implement it. Search must return scenarios, tests, facts and symbols as rows of their own only when the caller filters by that type. A kb_search result must expose deterministic scores, evidence, source locations and explicit zero-result or weak-match states rather than presenting an unsupported match as proof.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-25, on the question "Approve the six search requirement changes as worded?", after the offline replay of the retrieval rethink: "Approve all six"'
  approved_by: maintainer
  recorded_at: '2026-11-25T19:29:10.721Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ef5557fb1b5c83be62f315b4548b0a3689dd80c2e5507c167ac5fb128cef3457
semantic_inventory:
  - claim_key: CLAIM-D93AAE57F138000F
    claim_text: Search must rank requirements and ADRs as the decisions of a kb_search answer
    role: normative
    status: modeled
    span:
      start: 0
      end: 77
  - claim_key: CLAIM-489AE244089CD362
    claim_text: Search must credit each decision with the words of the facts it links and of the symbols that implement it
    role: normative
    status: modeled
    span:
      start: 79
      end: 185
  - claim_key: CLAIM-F7C512A3D518745E
    claim_text: Search must return scenarios, tests, facts and symbols as rows of their own only when the caller filters by that type
    role: normative
    status: modeled
    span:
      start: 187
      end: 304
  - claim_key: CLAIM-37A0B5CD7B7B13B4
    claim_text: A kb_search result must expose deterministic scores, evidence, source locations and explicit zero-result or weak-match states rather than presenting an unsupported match as proof
    role: normative
    status: modeled
    span:
      start: 306
      end: 484
logic_claims:
  - CLAIM-D93AAE57F138000F
  - CLAIM-489AE244089CD362
  - CLAIM-F7C512A3D518745E
  - CLAIM-37A0B5CD7B7B13B4
id: REQ-search-decisions-are-the-unit
type: req
---
Search must rank requirements and ADRs as the decisions of a kb_search answer. Search must credit each decision with the words of the facts it links and of the symbols that implement it. Search must return scenarios, tests, facts and symbols as rows of their own only when the caller filters by that type. A kb_search result must expose deterministic scores, evidence, source locations and explicit zero-result or weak-match states rather than presenting an unsupported match as proof.

## Why this changed

Ranking every entity type side by side let a scenario, test or fact crowd the requirement that governs the question out of the rows an agent reads. In the offline replay, ranking decisions credited with their facts' and symbols' words put the governing decision in the top ten for 87% of 107 user-language Papra questions, against 48% before, and for 94% of 47 held-out questions, against 60%.

## Context

The first clause replaces the first clause of REQ-kibi-intent-aware-source-discovery, which ranked scenarios, tests, facts and symbols alongside requirements; the rest of that requirement is kept here, with its ambiguity state read as the weak-match state of REQ-search-weak-answer. A decision card's evidence names the file or symbol that links it, which is its source location.

## Source

> Maintainer decision, 2026-11-25, on the question "Approve the six search requirement changes as worded?", after the offline replay of the retrieval rethink: "Approve all six"

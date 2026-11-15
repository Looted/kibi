---
title: Unmodeled claims in a requirement pair are blocked until modeled or settled by a checkable pair review
status: open
priority: must
required_evidence: tested
tags:
  - checks
  - contradictions
  - semantic-inventory
semantic_text: Kibi must report a current requirement whose rule claims stay unmodeled in a pair with another current requirement, through a relates_to edge or a shared subject, as a related-requirement-unmodeled violation until the claims are modeled or a checkable pair review settles the pair. Kibi must count a pair review an agent recorded on a must or firm requirement only once a person approved it.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9b555088e3568cad6e2135cc4d43e6899c76ca57f5e9a641296aa4351f26cf5f
semantic_inventory:
  - claim_key: CLAIM-B88757632318B59F
    claim_text: Kibi must report a current requirement whose rule claims stay unmodeled in a pair with another current requirement, through a relates_to edge or a shared subject, as a related-requirement-unmodeled violation until the claims are modeled or a checkable pair review settles the pair
    role: normative
    status: modeled
    span:
      start: 0
      end: 280
    reason: Grounded by FACT-kb-unmodeled-pair-reported via requires_property.
  - claim_key: CLAIM-8018F418EFDD2BA7
    claim_text: Kibi must count a pair review an agent recorded on a must or firm requirement only once a person approved it
    role: normative
    status: modeled
    span:
      start: 282
      end: 390
    reason: Grounded by FACT-kb-unmodeled-pair-review-approval via requires_property.
logic_claims:
  - CLAIM-B88757632318B59F
  - CLAIM-8018F418EFDD2BA7
origin:
  kind: agent
  ref: Maintainer request to implement the domain subject proposal, layer 3 (pair reviews), 2026-11-13
  approved_by: maintainer
  recorded_at: '2026-11-13T09:00:00.000Z'
id: REQ-kb-unmodeled-pair-review
type: req
---
Kibi must report a current requirement whose rule claims stay unmodeled in a pair with another current requirement, through a relates_to edge or a shared subject, as a related-requirement-unmodeled violation until the claims are modeled or a checkable pair review settles the pair. Kibi must count a pair review an agent recorded on a must or firm requirement only once a person approved it.

## Context
Requirements that share a subject or a relates_to link can contradict each other, but Kibi compares only grounded facts, and many claims cannot be modeled as facts yet. Before this change the rule caught only missing propositions next to a requirement modeled with strict facts, so a claim an agent marked as an ontology_gap, or a pair with no link, passed silently. Now every pair of current requirements that share a subject or a relates_to edge is checked: the unmodeled rule claims of either side need to be modeled against the other, or the pair carries a pair_reviews verdict that Kibi can check (what separates the two, or what resolves their interaction), keyed by the claims' keys, so it goes stale when an unmodeled claim it does not name appears; a payload hash on a claim is accepted and ignored, since it hashes the whole advisor receipt rather than the claim. What resolves an interaction must be something other than the two requirements: a scenario or fact either links, a third current requirement, or a condition or exception claim of either. A conflict verdict never settles a pair, and an agent cannot settle a pair with a must or firm requirement by itself: a person approves a verdict whose origin is missing or an agent's, or that sits on a requirement an agent wrote. A subject many prose requirements share pairs each of them with all the others, so the check reports one finding per requirement and problem, listing the requirements it pairs with, instead of one per pair, and it reads the subjects, the open claims and the reviews once. The pair semantics apply from KB schema 18; a KB on an older schema keeps the earlier form of the rule until kibi migrate upgrades it.

## Why this changed
This supersedes REQ-check-related-requirement-unmodeled, which reported only missing propositions next to a requirement modeled with strict facts and named that requirement's keys. The pairing now also covers ontology_gap and ambiguous claims and shared subjects, and a reviewed verdict replaces modeling when the claims cannot be modeled yet.

## Source
> Ok, implement the proposal.

The maintainer, 2026-11-12, approving the three-layer proposal for catching contradictions between unmodeled claims; this is its third layer.

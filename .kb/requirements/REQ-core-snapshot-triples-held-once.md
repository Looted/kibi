---
title: Branch store snapshots hold every triple once
status: open
priority: must
required_evidence: tested
tags:
  - core
  - persistence
  - rdf
origin:
  kind: agent
  ref: 'Proof job store-integrity investigation: matrix samples on develop and on PR trees failed the search evals and strict-fact-shape because a fresh load of the branch store held triples twice.'
  recorded_at: '2026-11-17T09:10:04.356Z'
rationale: SWI-Prolog's rdf_db keeps reindexed triples until its garbage collector reclaims them, and a snapshot written before then saved each of them twice. Every later load (a new engine, a restarted daemon, the search evals) then saw superseded kb_search answers, strict-fact-shape reporting several value fields, doubled relationships and missing fields, depending on garbage-collection timing.
semantic_text: Every branch store snapshot Kibi writes must hold each triple once, so that a fresh load of the store (snapshot and journal) answers each triple once through rdf/4 as well as rdf/3.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d8d86deb97f04f14c2929aecd78fcd5a6bd63bac10fe3900e680f9050dd9bb40
semantic_inventory:
  - claim_key: CLAIM-02AAD89F317F2EAC
    claim_text: Every branch store snapshot Kibi writes must hold each triple once, so that a fresh load of the store (snapshot and journal) answers each triple once through rdf/4 as well as rdf/3
    role: normative
    status: modeled
    span:
      start: 0
      end: 180
logic_claims:
  - CLAIM-02AAD89F317F2EAC
id: REQ-core-snapshot-triples-held-once
type: req
---
Every branch store snapshot Kibi writes must hold each triple once, so that a fresh load of the store (snapshot and journal) answers each triple once through rdf/4 as well as rdf/3.

## Context

SWI-Prolog's rdf_db keeps reindexed triples until its garbage collector reclaims them, and a snapshot written before then saved each of them twice. Every later load (a new engine, a restarted daemon, the search evals) then saw superseded kb_search answers, strict-fact-shape reporting several value fields, doubled relationships and missing fields, depending on garbage-collection timing.

## Source

> Proof job store-integrity investigation: matrix samples on develop and on PR trees failed the search evals and strict-fact-shape because a fresh load of the branch store held triples twice.

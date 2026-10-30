---
title: A requirement is not tested while only its happy path is
status: open
priority: must
firmness: firm
tags:
  - proof
  - scenarios
semantic_text: A current requirement that grounds a claim must not reach tested until a scenario it specifies expects rejection or error and assumes a fact that opposes one of its claims. A requirement whose claims leave nothing to refuse may instead record a failure-side waiver, which must count only once a person approves it. The Kibi check must report a scenario that expects rejection or error while current requirements permit everything it assumes.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 54ea72369971e524795750d12bb4e532d6756e08ac3bf36837ad07b097eb76a4
semantic_inventory:
  - claim_key: CLAIM-92D74D1B02B98278
    claim_text: A current requirement that grounds a claim must not reach tested until a scenario it specifies expects rejection or error and assumes a fact that opposes one of its claims
    role: normative
    span:
      start: 0
      end: 171
    status: modeled
  - claim_key: CLAIM-44A0903047D905FB
    claim_text: A requirement whose claims leave nothing to refuse may instead record a failure-side waiver, which must count only once a person approves it
    role: normative
    span:
      start: 173
      end: 313
    status: modeled
  - claim_key: CLAIM-776228FDA6AAB43E
    claim_text: The Kibi check must report a scenario that expects rejection or error while current requirements permit everything it assumes
    role: normative
    span:
      start: 315
      end: 440
    status: modeled
logic_claims:
  - CLAIM-92D74D1B02B98278
  - CLAIM-44A0903047D905FB
  - CLAIM-776228FDA6AAB43E
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-29: "Ideally I''d like to see it as a blocker for tested status (it''s not fully tested if only happy path is asserted)."'
  approved_by: maintainer
  recorded_at: '2026-10-29T22:30:00.000Z'
id: REQ-kibi-happy-path-gap
type: req
---
A current requirement that grounds a claim must not reach tested until a scenario it specifies expects rejection or error and assumes a fact that opposes one of its claims. A requirement whose claims leave nothing to refuse may instead record a failure-side waiver, which must count only once a person approves it. The Kibi check must report a scenario that expects rejection or error while current requirements permit everything it assumes.

## Context

A requirement can be fully tested and still break on the first input its scenarios never tried: in a test project, a feature passed every end-to-end test and a full mutation run while only one file was loaded into a module, and broke as soon as several were. Kibi already knows which values a requirement forbids, through the facts it grounds, so it can tell when every scenario only walks the happy path. The maintainer asked that this block the tested status, because a requirement is not fully tested if only its happy path is asserted. Some requirements state a capability or an output shape and have nothing to refuse; those carry a reviewed waiver instead of a fabricated test.

## Source

Maintainer request, 2026-10-29:

> Ideally I'd like to see it as a blocker for tested status (it's not fully tested if only happy path is asserted).
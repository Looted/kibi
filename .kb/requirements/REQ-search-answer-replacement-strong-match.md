---
title: A search answer proposes a replacement only for a predecessor that matched strongly
status: open
priority: must
required_evidence: tested
tags:
  - search
  - hooks
semantic_text: A kb_search answer must propose the replacement of a superseded requirement as a governing candidate only when the superseded requirement scored at least 0.8 of the best candidate requirement's score.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5e1620ed7c54b4cf710e2ca716f12f0f6047b6449f2f04693865119a26f51856
semantic_inventory:
  - claim_key: CLAIM-F4535F0F2AB06999
    claim_text: A kb_search answer must propose the replacement of a superseded requirement as a governing candidate only when the superseded requirement scored at least 0.8 of the best candidate requirement's score
    role: normative
    status: modeled
    span:
      start: 0
      end: 199
logic_claims:
  - CLAIM-F4535F0F2AB06999
origin:
  kind: agent
  recorded_at: '2026-11-11T17:33:45.955Z'
id: REQ-search-answer-replacement-strong-match
type: req
---
A kb_search answer must propose the replacement of a superseded requirement as a governing candidate only when the superseded requirement scored at least 0.8 of the best candidate requirement's score.

## Context

The kb_search answer follows supersedes links from every matched requirement to its replacement. In a review of Kibi's own KB, a closed requirement that matched weakly pulled `REQ-skillopt-offline-contract-without-bundle-gate` into the governing list of three unrelated answers, because the replacement inherited the weak score and filled a free slot. A weak match on an old requirement says little about its replacement, so the replacement is proposed only when the old requirement scored at least 0.8 of the best candidate requirement's score. The old requirement still names its replacement under notGoverning either way.

Issue 696 asked for it; the maintainer opened it from that review.

## Source

Issue 696, "Search and hooks rank closed requirements as if current" (https://github.com/Looted/kibi/issues/696):

> Closed requirements are not demoted in ranking or in hook candidates.

> - When a closed requirement has a current successor (incoming `supersedes`, or children that `refines` it), rank the successor and drop the closed one from `governing` and from hook candidates.
> - Demote closed requirements with no successor below current ones. Once the retired status from the companion issue exists, exclude retired ones entirely.
> - Don't pull a successor into `governing` only because its closed predecessor matched weakly.

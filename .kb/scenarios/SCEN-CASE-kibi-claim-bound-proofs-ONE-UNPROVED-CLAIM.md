---
title: A requirement with one certified claim and one uncertified claim is not reported as proved
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:31:48.493Z'
id: SCEN-CASE-kibi-claim-bound-proofs-ONE-UNPROVED-CLAIM
type: scenario
---
Given a requirement with two claims, a set claim that an exhaustive certificate proves with a derived binding at code scope and a count claim that no certificate names, with the count claim's failure side covered so the requirement is tested end to end, when `kibi prove --all` runs and `kibi coverage` reports it, then the requirement's evidence level is tested and not proved, its claim summary shows one of two claims proved, and the count claim is listed in unprovedClaims.

This covers the edge case of one unproved applicable claim under a requirement that would read as proved, the value past the bound `gt 0`: coverage refuses to report proved. documentation/tests/e2e/packed/claim-bound-proofs.test.ts "binds a certificate to the claims it derives and rejects the rest with the reason" exercises it with the REQ-PALETTE-PAIR fixture.

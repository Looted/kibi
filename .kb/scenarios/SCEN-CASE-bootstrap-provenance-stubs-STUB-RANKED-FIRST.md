---
title: Search demotes a provenance stub that would otherwise rank before a fact with a claim
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:11:40.768Z'
id: SCEN-CASE-bootstrap-provenance-stubs-STUB-RANKED-FIRST
type: scenario
---
Given a provenance stub, a note with a claim and a requirement that all match the query upload retry, with the stub listed first, when intent-v1 ranking runs with no score threshold, then the stub is returned last, scores below the note and carries the reason demoted: provenance stub.

This covers the value past the bound, `gt 0`, of the claim that no stub ranks before a non-stub match. packages/cli/tests/search-provenance-stubs.test.ts "intent-v1 ranking sorts an accepted stub after every fact with a claim and says why" exercises it.

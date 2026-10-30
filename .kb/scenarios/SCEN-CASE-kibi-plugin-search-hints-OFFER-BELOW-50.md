---
title: A KB with 49 requirement documents gets no search-hints offer
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:56:49.509Z'
id: SCEN-CASE-kibi-plugin-search-hints-OFFER-BELOW-50
type: scenario
---
Given a workspace whose KB holds 49 requirement documents, when the bootstrap plan is discovered, then it makes no kibi-plugin-search-hints offer.

This covers the edge case of an offer threshold below the bound, `lt 50`. packages/cli/tests/operations/bootstrap-plugin-offers.test.ts "withholds the search-hints offer at 49 requirement documents and makes it at exactly 50" exercises it with the literal count rather than the shared constant.

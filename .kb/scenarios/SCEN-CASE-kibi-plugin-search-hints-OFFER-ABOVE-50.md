---
title: A KB with exactly 50 requirement documents already gets the search-hints offer
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:56:46.681Z'
id: SCEN-CASE-kibi-plugin-search-hints-OFFER-ABOVE-50
type: scenario
---
Given a workspace whose KB holds exactly 50 requirement documents and that has neither activated nor declined kibi-plugin-search-hints, when the bootstrap plan is discovered, then it offers the plugin in replace mode, so a threshold above 50 is caught.

This covers the edge case of an offer threshold above the bound, `gt 50`. packages/cli/tests/operations/bootstrap-plugin-offers.test.ts "withholds the search-hints offer at 49 requirement documents and makes it at exactly 50" exercises it with the literal count rather than the shared constant.

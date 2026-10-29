---
title: An intent search with no matching entity abstains with an explicit zero-result state
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:34:43.831Z'
id: SCEN-NEG-kibi-intent-aware-source-discovery-unmatched-intent
type: scenario
---
Given a packed CLI workspace whose knowledge base has nothing related to the words of a request, when `kibi search` ranks that request, then it returns no results and an explicit abstention with zero accepted candidates instead of presenting the nearest unrelated entity as a match.

This is the failure side of intent-aware discovery: an unsupported match must never be handed to an agent as proof of where behavior lives. documentation/tests/e2e/packed/discovery-bundle.test.ts "abstains with an explicit zero-result state when no entity matches the intent" exercises it.

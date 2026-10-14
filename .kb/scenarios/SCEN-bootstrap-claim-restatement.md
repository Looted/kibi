---
title: Bootstrap counts a claim that restates a human-written requirement and flags a close one
status: active
tags:
  - bootstrap
  - intent-claims
  - knowledge-sources
origin:
  kind: agent
  ref: Onboarding test finding on bootstrap claim deduplication (2026-10-14)
  recorded_at: '2026-10-14T08:56:08.524Z'
id: SCEN-bootstrap-claim-restatement
type: scenario
---
Given a seeded knowledge base that holds a human-written requirement whose semantic text has two sentences, when the agent plans bootstrap with three claims from one authoritative source (one equal to the first sentence apart from case and punctuation, one new rule, and one that differs from the second sentence by a single word), then the first claim is an entity_exists row whose matchedId is the human requirement and the source accounting counts it as already in the KB, the new claim is planned, the close claim is planned with a diagnostic naming the human requirement, and planning again with the same KB and context returns the same plan hash.

A claim whose overlap with every current requirement is below 0.8 is planned with no restatement signal, and the matched requirement does not depend on the order requirements are read in.

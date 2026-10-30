---
title: A modeled claim grounded by two facts is refused at sync
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:11:50.361Z'
id: SCEN-CASE-kibi-conservative-requirement-proof-TWO-GROUNDINGS
type: scenario
---
Given a requirement whose one claim is marked modeled and linked with requires_property to two facts that both carry its claim key, when kibi sync compiles it, then sync fails and names the file with proposition-complete ingestion failed because one modeled entry must equal the two grounding relationships, so the claim never enters the store with two groundings.

The test case "refuses to sync a modeled claim with no grounding or with two groundings" in documentation/tests/e2e/packed/coverage-proof-status.test.ts exercises it through the packed CLI. It covers the value past the bound, `gt 1`, of valid logical groundings per modeled proposition.
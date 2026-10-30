---
title: A claim marked modeled with no grounding fact is refused at sync
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:12:01.897Z'
id: SCEN-CASE-kibi-conservative-requirement-proof-NO-GROUNDING
type: scenario
---
Given a requirement whose one claim is marked modeled in its semantic inventory but has no requires_property, requires_predicate or requires_rule link, when kibi sync compiles it, then sync fails and names the file with proposition-complete ingestion failed because one modeled entry must equal zero grounding relationships, so the claim never enters the store ungrounded.

The test case "refuses to sync a modeled claim with no grounding or with two groundings" in documentation/tests/e2e/packed/coverage-proof-status.test.ts exercises it through the packed CLI. It covers the value below the bound, `lt 1`, of valid logical groundings per modeled proposition.
---
title: A requirement whose modeled claim has no grounding fact with its claim key is rejected before mutation
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:11:58.227Z'
id: SCEN-CASE-kibi-proposition-complete-ingestion-NO-GROUNDING
type: scenario
---
Given a requirement write whose single modeled claim is linked only to a fact declaring another claim key, when validate-upsert checks it, then it reports that the modeled claim has no grounding fact declaring its claim_key, names the fact whose key the inventory no longer models, and saves nothing.

This covers the value below the bound, `lt 1`, of the claim that every modeled proposition has exactly one grounding fact. packages/cli/tests/operations/mutation.test.ts "validate-upsert rejects a modeled proposition linked to another claim" exercises it.

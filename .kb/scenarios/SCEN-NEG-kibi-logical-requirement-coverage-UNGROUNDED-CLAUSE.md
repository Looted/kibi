---
title: A requirement with a modeled clause that no linked fact grounds is rejected
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:54:52.474Z'
id: SCEN-NEG-kibi-logical-requirement-coverage-UNGROUNDED-CLAUSE
type: scenario
---
Given a requirement whose semantic inventory models a reworded clause while its only linked ground fact still declares the claim key of the old wording, when the packed CLI validates the upsert, then the write is rejected and the error names the modeled claim key that has no grounding fact and the fact whose claim key the inventory no longer models.

This is the failure side of clause-complete logical coverage: a modeled clause without its own keyed ground fact must not be accepted as covered. documentation/tests/e2e/packed/proposition-complete-ingestion.test.ts "rejects omissions and accepts exact explicit unresolved ledgers" exercises it in its final validate-upsert step.

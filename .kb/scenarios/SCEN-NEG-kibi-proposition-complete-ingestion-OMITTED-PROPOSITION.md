---
title: A current requirement write without a complete proposition ledger is rejected
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:07:23.662Z'
id: SCEN-NEG-kibi-proposition-complete-ingestion-OMITTED-PROPOSITION
type: scenario
---
Given a new open requirement whose prose states an obligation but whose write carries no semantic inventory entry for it, when the packed CLI validates the upsert or syncs the requirement from Markdown, then validation reports proposition-complete ingestion failed and the sync exits with an error instead of storing the requirement.

This is the failure side of proposition-complete ingestion: an assertive proposition left out of the ledger must not reach the KB unaccounted for. documentation/tests/e2e/packed/proposition-complete-ingestion.test.ts "rejects omissions and accepts exact explicit unresolved ledgers" exercises it with REQ-DIRECT-INCOMPLETE and REQ-NEW.

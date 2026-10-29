---
title: An upsert that omits the proposition ledger fails with an error that carries the inventory contract to resend
status: active
expects: error
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:02:09.089Z'
id: SCEN-NEG-kb-upsert-ledger-contract-in-error-omitted-ledger
type: scenario
---
Given a requirement payload whose prose holds normative statements but no semantic inventory ledger, when kb_upsert validates it, then the write fails with a proposition-complete ingestion error and that error includes the inventory contract the semantic advisor derives for the prose.

This is the failure side of proposition-complete ingestion: the write is refused, and the error must give the caller what one corrected resend needs. packages/cli/tests/operations/mutation.test.ts "the omitted-ledger error carries the contract one resend needs" exercises it.

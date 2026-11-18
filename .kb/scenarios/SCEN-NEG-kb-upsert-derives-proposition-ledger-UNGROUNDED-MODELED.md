---
title: A kb_upsert never records a derived claim as modeled without its grounding link
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-15T20:20:31.405Z'
id: SCEN-NEG-kb-upsert-derives-proposition-ledger-UNGROUNDED-MODELED
type: scenario
---
Given a requirement write that sends no ledger contract and a requires_property link to a fact whose claim key the prose does not state, when kb_upsert derives the ledger, then the write is refused because the link grounds no claim, and no claim is recorded as modeled.

packages/cli/tests/operations/mutation.test.ts exercises it.
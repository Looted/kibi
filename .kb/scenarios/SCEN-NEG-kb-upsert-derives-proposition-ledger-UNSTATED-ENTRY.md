---
title: A kb_upsert refuses a ledger entry written for other prose
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-15T20:20:29.417Z'
id: SCEN-NEG-kb-upsert-derives-proposition-ledger-UNSTATED-ENTRY
type: scenario
---
Given a requirement whose prose states two claims, when a kb_upsert sends a semantic_inventory entry for a claim key that prose does not state, then the write is refused and nothing is recorded, because the entry was written for other prose.

This is the failure side of deriving the ledger: Kibi derives the mechanics, but a judgment about a claim the prose no longer states must not be silently dropped. packages/cli/tests/operations-mutation/mutation/requirement-semantics.test.ts exercises it.
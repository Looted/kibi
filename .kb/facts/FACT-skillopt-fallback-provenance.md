---
title: Fail-open one-shot fallback now records provenance codex-one-shot-unavailable so metrics distinguish it from real paid optimizer runs (paired with one-shot-failure.json)
status: active
fact_kind: meta
tags:
  - skillopt
  - fail-open
id: FACT-skillopt-fallback-provenance
type: fact
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 6): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---

## Context
Without a distinct marker, evaluation receipts could mistake the fail-open baseline fallback for a real paid optimizer run. Source: commit "mark baseline fallback provenance".

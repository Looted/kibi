---
title: Bootstrap keeps a claim from a stale knowledge source out of the candidates and says why
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:06:46.968Z'
id: SCEN-NEG-kibi-bootstrap-knowledge-sources-stale-source-candidate
type: scenario
---
Given a bootstrap interview that declares an old wiki as a stale knowledge source and an intent claim that cites it, when kb_plan_bootstrap plans the repository, then no requirement candidate is produced from that claim and the plan lists it as suppressed with the reason stale_knowledge_source.

This is the failure side of consolidating cited intent: outdated documentation must not become current requirements just because it was declared. packages/cli/tests/operations/bootstrap-intent-claims.test.ts "keeps unmodelable, stale, and uncited claims out of the write set and says why" exercises it.

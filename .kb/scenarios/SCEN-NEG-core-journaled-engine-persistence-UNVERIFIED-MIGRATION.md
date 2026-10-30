---
title: A legacy branch store that fails migration is not published and stays as it was
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:11:24.802Z'
id: SCEN-NEG-core-journaled-engine-persistence-UNVERIFIED-MIGRATION
type: scenario
---
Given a legacy branch store whose kb.rdf is not valid RDF, when the engine opens it and attempts the one guarded migration into a journaled generation, then the migration is refused: it throws, no storage.json generation is published, and the legacy kb.rdf is left byte for byte as it was.

This is the failure side of guarded migration: a store that cannot be verified must never replace the input it came from. packages/cli/tests/engine.test.ts "leaves corrupt legacy input usable after migration failure" exercises it.

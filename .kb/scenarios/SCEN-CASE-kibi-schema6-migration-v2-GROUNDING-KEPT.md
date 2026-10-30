---
title: Re-deriving a drifted inventory keeps a matching claim modeled and grounded
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:52:29.074Z'
id: SCEN-CASE-kibi-schema6-migration-v2-GROUNDING-KEPT
type: scenario
---
Given a schema 5 KB whose call quota requirement has a modeled, fact-grounded quota claim that still matches the current advisor next to a clause the older advisor stored as rationale, when kibi migrate re-derives the inventory, then the matching claim stays modeled with its requires_property fact and only the reclassified clause changes, and a re-derivation that changed the matching claim fails the check.

This covers the value past the bound, `gt 0`, of the claim that re-derivation keeps the status and grounding of matching claims. packages/cli/tests/consumer/schema6-migration.test.ts "a schema 5 KB migrates to schema 6 with migration origins and its grounding intact, and a rerun finds nothing to do" exercises it through the built CLI.

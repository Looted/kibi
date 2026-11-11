---
title: A sync after symbol-coordinates.yaml was deleted publishes it again
status: active
priority: must
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-04T18:30:00.000Z'
id: SCEN-NEG-generated-coordinate-DELETED-ARTIFACT
type: scenario
---
Given a synced workspace whose symbol has generated coordinates
When symbol-coordinates.yaml is deleted and kibi sync runs again
Then sync does not treat the missing artifact as unchanged: it publishes the artifact again and the symbol keeps its generated source line.

This is the failure side of the coordinate artifact being a sync dependency. documentation/tests/e2e/packed/source-relationship-parity.test.ts "does not ignore a deleted coordinate artifact: the next sync publishes it again" exercises it.

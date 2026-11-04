---
title: A full coordinate refresh over a malformed artifact fails closed
status: active
priority: must
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-04T18:30:00.000Z'
id: SCEN-NEG-generated-coordinate-MALFORMED-ARTIFACT
type: scenario
---
Given a synced workspace whose symbol-coordinates.yaml has been replaced with a malformed artifact
When kibi sync --refresh-symbol-coordinates runs
Then the refresh fails with "Failed to parse coordinate artifact" and leaves the malformed artifact as it was instead of publishing over it.

This is the failure side of atomic coordinate publication. documentation/tests/e2e/packed/source-relationship-parity.test.ts "fails closed when a full coordinate refresh reads a malformed artifact" exercises it.

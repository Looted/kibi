---
title: The mutation lane refuses to run a cached Mutalog pack that is not the pinned version
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:54:35.237Z'
id: SCEN-NEG-prolog-mutation-lane-STALE-PACK
type: scenario
---
Given a Mutalog pack under .cache/prolog-packs whose version is not the pinned 0.1.2, and a download that fails, when the mutation runner starts, then it tries to install the pinned version, exits with a failure, and never runs the stale copy.

This is the failure side of the pinned-pack guarantee: an out-of-date local pack must not silently stand in for the pinned Mutalog. packages/core/tests/prolog-mutation-runner.test.ts "refuses to run a cached Mutalog pack whose version is not the pinned one" exercises it.

---
title: 30 minutes and 1800 seconds share a signature; Mb and MB do not
status: active
priority: must
tags:
  - validation
  - units
  - vocabulary-convergence
id: SCEN-kibi-unit-canonicalization
type: scenario
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 2): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
30 minutes against 1800 seconds is the case that must match. `Mb` against `MB` is the case that must not: bits and bytes differ, and units are case-sensitive.

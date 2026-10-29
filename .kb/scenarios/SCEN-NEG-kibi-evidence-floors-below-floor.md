---
title: kibi check fails a requirement whose evidence is below its floor until it reaches it
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:12:39.690Z'
id: SCEN-NEG-kibi-evidence-floors-below-floor
type: scenario
---
Given current requirements whose evidence level is below their required_evidence or the tested floor of a firm requirement, when the packed CLI runs `kibi check --rules evidence-floor`, then the check exits 1 and names each requirement with its level and floor, and it passes only once the evidence reaches the floor.

This is the failure side of evidence floors: a requirement that promises more evidence than it has must block rather than pass with a warning. documentation/tests/e2e/packed/evidence-floors.test.ts "fails requirements below their floor and passes once they reach it" exercises it.

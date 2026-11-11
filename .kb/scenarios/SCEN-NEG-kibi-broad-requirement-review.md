---
title: 'A broad requirement left unreported, an umbrella reported or closed dependents counted fails the review contract'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-broad-requirement-review
type: scenario
---
Given the same fixture, a check that missed REQ-BROAD, reported REQ-UMBRELLA or counted the closed dependents of REQ-HUB-CLOSED would return a different set of broad_requirement_review findings, and the packed test rejects it.

## Context

The failure side of the broad requirement review; the exact expected finding set is what rejects each of these states.

---
title: 'A requirement with nine implementing symbols or six current dependents is reviewed as broad, an umbrella or a requirement with closed dependents is not'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-broad-requirement-review
type: scenario
---
Given a fixture KB where nine symbols implement REQ-BROAD and nine implement REQ-UMBRELLA tagged umbrella, eight implement REQ-NARROW, six open requirements depend on REQ-HUB-OPEN and six closed requirements depend on REQ-HUB-CLOSED, when the packed CLI runs kibi check, then broad_requirement_review names exactly REQ-BROAD and REQ-HUB-OPEN as non-blocking findings.

## Context

The happy path of the broad requirement review, run by the packed check-review-rules E2E test.

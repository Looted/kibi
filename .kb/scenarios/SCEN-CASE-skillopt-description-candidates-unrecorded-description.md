---
title: The cell the target runs reads exactly the description the manifest recorded
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:01:01.998Z'
id: SCEN-CASE-skillopt-description-candidates-unrecorded-description
type: scenario
---
Given a description frozen verbatim into a 1.2.0 manifest by compose, when one target cell runs with the same body and description, then the skill the target reads carries exactly that description, so a cell reading any other description fails the run.

documentation/tests/e2e/skillopt-description-candidates.e2e.ts exercises this edge case in its first and third parts, which compare the frozen and the target description with the input. It covers one scored cell with an unrecorded description, `scored_cells_bindings_packages_with_unrecorded_description gt 0`.

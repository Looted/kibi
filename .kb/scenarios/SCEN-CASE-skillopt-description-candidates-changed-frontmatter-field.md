---
title: A description candidate leaves every other frontmatter field of the target skill as it was
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:00:50.344Z'
id: SCEN-CASE-skillopt-description-candidates-changed-frontmatter-field
type: scenario
---
Given a composed body and description candidate, when one target cell runs through host-cell-smoke with a stub model, then the skill the target reads carries the new description and every other frontmatter line equals the canonical skill, so a changed field fails the run.

documentation/tests/e2e/skillopt-description-candidates.e2e.ts exercises this edge case in its third part, where the target skill frontmatter is compared field by field with the canonical skill. It covers one other frontmatter field changed, `other_frontmatter_fields_changed gt 0`.

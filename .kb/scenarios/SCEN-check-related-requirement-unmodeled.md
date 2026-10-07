---
title: Unmodeled requirement linked to a modeled one is blocked until modeled or superseding
status: active
priority: must
tags:
  - checks
  - contradictions
origin:
  kind: agent
  recorded_at: '2026-10-07T13:23:05.692Z'
id: SCEN-check-related-requirement-unmodeled
type: scenario
---
**Scenario: a new requirement overlaps a modeled one without facts**

Given a current requirement modeled with a subject fact and property_value facts (or ground predicate facts), and a new current requirement whose semantic inventory still carries propositions with status missing, linked to the modeled one with relates_to in either direction.

When `kibi check` runs with its default rules.

Then `related-requirement-unmodeled` reports the new requirement as a blocking violation that names the modeled requirement and the subject.property or predicate keys it models, and the suggestion asks for the missing propositions to be modeled against those keys or for a supersedes decision.

And a requirement without a proposition ledger, one whose assertive propositions are all modeled or explicitly classified, one whose neighbour models nothing, and one that supersedes the modeled requirement are not reported.

## Context

Issue 364: an agent recorded a change of messaging behavior as a new requirement with an unresolved ledger and a relates_to link to the modeled requirement it replaced; domain-contradictions compares grounded facts only, so the check stayed clean while three requirements described behavior the code no longer had.
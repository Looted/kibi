---
title: A requirement with unmodeled claims next to a modeled related requirement is blocked by the check
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:17:38.869Z'
id: SCEN-NEG-check-related-requirement-unmodeled-UNMODELED-NEIGHBOUR
type: scenario
---
Given a current requirement whose semantic inventory still has missing propositions and that relates_to a requirement modeled with strict property facts, when kibi check runs, then it reports a related-requirement-unmodeled violation naming the modeled keys and the check fails until the claims are modeled or the requirement is superseded.

This is the failure side of related-requirement modeling: prose next to modeled logic must not escape contradiction checking. packages/cli/tests/consumer/related-requirement-unmodeled.test.ts "blocks a requirement whose unmodeled claims relate to a modeled requirement until they are modeled or it supersedes" exercises it.

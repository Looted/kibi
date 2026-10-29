---
title: A claim left for authoring next to a prose-only requirement is held for review with that requirement named
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:03:18.922Z'
id: SCEN-NEG-bootstrap-authoring-claim-review-UNCOMPARED-AUTHORING
type: scenario
---
Given a workspace with a current requirement that has no logical representation and an intent claim that bootstrap cannot model, when plan-bootstrap runs, then the claim is left for authoring and a conflict-review diagnostic names the prose-only requirement it must be compared with.

This is the failure side of authoring claim review: an unmodeled claim must not slip past a requirement it may contradict. packages/cli/tests/consumer/contradiction-review.test.ts "bootstrap names prose-only requirements a claim left for authoring must be compared with" exercises it.

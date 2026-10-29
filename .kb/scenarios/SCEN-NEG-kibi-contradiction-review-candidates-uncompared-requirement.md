---
title: An intent that cannot be compared with a prose-only requirement is unresolved, not reported as no conflict
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:09:03.992Z'
id: SCEN-NEG-kibi-contradiction-review-candidates-uncompared-requirement
type: scenario
---
Given an editor workspace with a related current requirement that has no logical representation, when kb_compile_intent compiles an unmodeled intent next to it, then the contradiction outcome is unresolved rather than no_conflict, and that requirement is named as a review candidate.

This is the failure side of contradiction review: a comparison Kibi could not make must never read as a clean bill of health. packages/cli/tests/consumer/contradiction-review.test.ts "an unmodeled claim next to a prose-only requirement is unresolved with that requirement to review" exercises it.

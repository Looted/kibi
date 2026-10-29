---
title: A requirement whose scenarios only expect success is refused the tested status
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T22:35:00.000Z'
id: SCEN-NEG-kibi-happy-path-gap-SUCCESS-ONLY
type: scenario
---
Given a requirement that grounds a quota claim and is specified only by success scenarios, when kibi coverage computes its proof, then it reports the happy_path_only gap and the requirement is not tested.

This is the failure side of the gap itself: a happy-path-only chain must not pass as tested. packages/cli/tests/consumer/happy-path-gap.test.ts "a happy-path-only requirement gets the gap until a rejection scenario assumes a forbidden value" exercises it.

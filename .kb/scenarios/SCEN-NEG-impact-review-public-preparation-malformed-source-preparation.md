---
title: Public preparation rejects a staged file whose syntax error leaves its analysis partial instead of producing an acceptable template
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:59:27.642Z'
id: SCEN-NEG-impact-review-public-preparation-malformed-source-preparation
type: scenario
---
Given a staged source file with a syntax error, so the installed analyzer returns partial output with diagnostics and uncovered ranges, when the installed CLI runs prepare-impact-review for the staged scope, then preparation exits 1 and states that a parser, syntax, timeout or integrity diagnostic affects the whole file.

This is the failure side of retaining failed and partial analysis evidence: preparation must keep the whole-file obligation and never generate a decision that accepts it. documentation/tests/e2e/packed/impact-review-stage-e.test.ts "keeps exact staged and trusted-diff impact evidence through ownership repair and canonical receipt append" exercises it in its malformed-source step.

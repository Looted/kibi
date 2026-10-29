---
title: A staged check refuses a review that leaves an unsupported file without an explicit whole-file review
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:59:11.626Z'
id: SCEN-NEG-impact-policy-stage-e-content-bound-review-unsupported-without-whole-file-review
type: scenario
---
Given an enabled impact policy and a staged change that includes a file no source analyzer supports, when the staged impact review record leaves that file without an explicit whole-file review and `kibi check --staged` runs, then the check exits 1 and reports that the unsupported side lacks one explicit whole-file review.

This is the failure side of unsupported analysis review: a file Kibi cannot analyze must be reviewed as a whole, never silently accepted. documentation/tests/e2e/packed/impact-review-stage-e.test.ts "keeps exact staged and trusted-diff impact evidence through ownership repair and canonical receipt append" exercises it in its omitted-unsupported step.

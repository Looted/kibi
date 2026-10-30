---
title: A check with unverified requirement statements is not summarized as no violations found
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:59:56.493Z'
id: SCEN-NEG-kb-check-unverified-requirement-statements-bare-pass-summary
type: scenario
---
Given an impact kb_check whose changed code implements current requirements and whose result has no structural violations, when Kibi builds the check summary, then the first line does not read as a bare no-violations pass but names the implemented requirements and says Kibi did not compare the code with their statements.

This is the failure side of quoting requirement statements: a bare pass would hide the very warnings the check exists to raise. packages/cli/tests/traceability/requirement-statements.test.ts "the check summary does not lead with a bare no-violations line" exercises it.

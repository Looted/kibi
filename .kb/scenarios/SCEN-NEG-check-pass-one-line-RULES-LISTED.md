---
title: A pass spread over several lines, missing its verdict line or naming every rule fails the contract
status: active
expects: rejection
tags:
  - negative-path
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T15:47:00.000Z'
id: SCEN-NEG-check-pass-one-line-RULES-LISTED
type: scenario
---
Given the same repository, a passing kibi check whose first line is not the verdict, or whose verdict line lacks the rule count or the debt count, or a full kb_check that names every rule it ran, fails the packed test's assertions.

## Context

The failure side of the one-line pass.
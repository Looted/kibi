---
title: kibi report refuses to write a health report from a partial coverage page
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:34:36.220Z'
id: SCEN-NEG-kibi-html-health-report-partial-coverage-page
type: scenario
---
Given a packed CLI workspace with two current requirements, when `kibi report --limit 1` would build requirement health from one returned row, then the command exits non-zero, says the report requires complete requirement rows and that 1 of 2 were returned, and writes no index.html.

This is the failure side of complete coverage data: a health percentage computed from a paginated page would misstate the project, so the report fails closed. documentation/tests/e2e/packed/cli-workflows.test.ts "should refuse a requirement health report from a partial coverage page" exercises it.

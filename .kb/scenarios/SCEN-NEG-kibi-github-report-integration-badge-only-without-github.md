---
title: kibi init --badge-only without --github is rejected
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:13:19.939Z'
id: SCEN-NEG-kibi-github-report-integration-badge-only-without-github
type: scenario
---
Given a packed CLI sandbox with a README, when `kibi init --badge-only` runs without `--github`, then the command exits non-zero with the message that --badge-only requires --github and scaffolds nothing.

This is the failure side of the GitHub report scaffold: badge-only publishing is only an opt-out of the GitHub integration, never a mode of its own. documentation/tests/e2e/packed/github-report-integration.test.ts "scaffolds the documented report workflow and README badge" exercises it.

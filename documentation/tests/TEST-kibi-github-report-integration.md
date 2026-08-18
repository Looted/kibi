---
id: TEST-kibi-github-report-integration
title: GitHub badge and report init scaffolding tests
status: active
tags:
  - cli
  - github
  - report
  - badge
  - init
  - unit
verification_scope: unit
verification_perspective: internal
links:
  - type: validates
    target: SCEN-kibi-github-report-integration
type: test
---

Validates `kibi init --github` and `--github --badge-only` option registration,
GitHub remote parsing, Pages URL construction including owner-site repositories,
canonical workflow scaffolding, idempotent re-runs, refusal to overwrite a
customized workflow, README badge insertion without duplicates, and graceful
degradation when no README or github.com remote exists. Also asserts the
documented example workflows are byte-identical to the packaged `kibi-cli`
templates.

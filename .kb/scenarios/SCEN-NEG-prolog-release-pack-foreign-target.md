---
title: A target outside the five launch targets is built as a release archive
status: active
expects: rejection
tags:
  - negative-path
text_ref: .github/workflows/swipl-build.yml
origin:
  kind: agent
  recorded_at: '2026-11-24T15:49:03.383Z'
id: SCEN-NEG-prolog-release-pack-foreign-target
type: scenario
---
Given the release archive build, when a target outside the five launch targets is treated as a from-source archive, then the build contract is refused. scripts/tests/swipl-build-pipeline.test.ts checks the workflow builds exactly those five targets.

## Context
This is the failure side of building every platform archive from source outside a pull request.

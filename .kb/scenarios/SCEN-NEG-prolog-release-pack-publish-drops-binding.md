---
title: Publish drops the SWI-Prolog archive run binding
status: active
expects: rejection
tags:
  - negative-path
text_ref: .github/workflows/publish.yml
origin:
  kind: agent
  recorded_at: '2026-11-24T15:41:37.688Z'
id: SCEN-NEG-prolog-release-pack-publish-drops-binding
type: scenario
---
Given a publish run, when it drops the commit and run binding on a SWI-Prolog archive, then the release is refused. scripts/tests/ci-workflow-contract.test.ts checks that publish.yml never clears GITHUB_SHA.

## Context
This is the failure side of the archive cache: publish must keep the binding so a released package cannot be a cached build.

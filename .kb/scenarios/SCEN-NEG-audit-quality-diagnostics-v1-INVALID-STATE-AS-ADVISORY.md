---
title: A dangling relationship fails the check as a hard violation and is not demoted to a quality diagnostic
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:31:33.186Z'
id: SCEN-NEG-audit-quality-diagnostics-v1-INVALID-STATE-AS-ADVISORY
type: scenario
---
Given an initialized repository whose tracked scenario links a test that does not exist, when kibi check runs with JSON output, then the check fails, the dangling relationship appears in the hard violations lane, and no quality diagnostic carries it, while every quality diagnostic stays non-blocking.

This is the failure side of the separate audit lanes: an invalid graph state must not be softened into advice. documentation/tests/e2e/packed/cli-workflows.test.ts "keeps an objectively invalid relationship in the hard violations lane" exercises it with the packed CLI.

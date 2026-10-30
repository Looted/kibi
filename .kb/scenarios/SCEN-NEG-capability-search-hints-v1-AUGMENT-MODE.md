---
title: A project configuration that activates search hints in augment mode is rejected
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-30T08:42:53.365Z'
id: SCEN-NEG-capability-search-hints-v1-AUGMENT-MODE
type: scenario
---
Given a project configuration that activates the kibi.search-hints.v1 capability in augment mode, when Kibi validates the configuration, then it rejects the activation because there is no builtin result for search hints to refine.

This is the failure side of the capability contract: only replace and shadow modes are valid for search hints. packages/plugin-sdk/tests/search-hints.test.ts "augment is rejected: there is no builtin result to refine" exercises it.

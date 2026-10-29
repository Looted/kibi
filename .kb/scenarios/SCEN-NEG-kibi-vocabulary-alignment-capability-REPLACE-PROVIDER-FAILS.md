---
title: A failing replace-mode provider falls back to the builtin with fallbackUsed, and kibi check never calls it
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:37:55.642Z'
id: SCEN-NEG-kibi-vocabulary-alignment-capability-REPLACE-PROVIDER-FAILS
type: scenario
---
Given a project-local vocabulary-alignment plugin activated in replace mode whose rankSubjects and compareClaims always throw, when kibi model-requirement models a clause, then the provider is asked, fails, and the builtin decides with fallbackUsed true, builtin stamps and a diagnostic naming the plugin; and when kibi check then runs the vocabulary rules, the provider is never called.

This is the failure side of the builtin-first capability: a broken external provider must not break or replace modeling, and checks must stay offline. documentation/tests/e2e/packed/vocabulary-convergence.test.ts "falls back to the builtin when a replace-mode provider fails, and kibi check never calls it" exercises it.

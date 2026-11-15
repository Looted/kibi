---
title: A scoped kb_check does not list a violation unrelated to the change, but still counts it
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-15T18:42:14.134Z'
id: SCEN-NEG-kibi-scoped-check-output-UNRELATED-VIOLATION
type: scenario
---
Given a blocking violation on an entity that neither the changed symbols nor the changed KB documents reach, when an agent runs kb_check scoped to its changed files, then the violation is not listed, and it is counted under its rule, so the result never reads as a pass while the KB still blocks.

This is the failure side of scoping: leaving a violation out of the list must not hide it. packages/cli/tests/public/operations/check-scope.test.ts exercises it.
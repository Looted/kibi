---
title: Two subject facts define one thing and kibi check stays silent
status: active
expects: rejection
priority: must
tags:
  - negative-path
  - domain-subjects
origin:
  kind: agent
  recorded_at: '2026-11-12T20:00:00.000Z'
id: SCEN-NEG-kb-domain-subject-layer-DUPLICATE-UNREPORTED
type: scenario
---
Given two active subject facts whose keys and titles share most of their words and that do not relate through distinct_from, part_of or kind_of, when kibi check runs, then it must report the pair under subject-duplicate, so requirements split across the two subjects are caught.

This is the failure side of the claim. packages/cli/tests/consumer/domain-subjects.test.ts exercises it end to end, and the unit suites under packages/cli/tests (subject-layer, migration/domain-subjects, mutation/subject-warnings) cover each branch.

---
title: A claim names a subject nobody defined and kibi check stays silent
status: active
expects: rejection
priority: must
tags:
  - negative-path
  - domain-subjects
origin:
  kind: agent
  recorded_at: '2026-11-12T20:00:00.000Z'
id: SCEN-NEG-kb-domain-subject-layer-UNDEFINED-UNREPORTED
type: scenario
---
Given a current requirement whose claim names a subject key that no active subject fact defines, when kibi check runs, then it must report the requirement under claim-subject-undefined, so an anchor to a word nobody defined is caught.

This is the failure side of the claim. packages/cli/tests/consumer/domain-subjects.test.ts exercises it end to end, and the unit suites under packages/cli/tests (subject-layer, migration/domain-subjects, mutation/subject-warnings) cover each branch.

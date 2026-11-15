---
title: A subject fact without a definition passes kibi check
status: active
expects: rejection
priority: must
tags:
  - negative-path
  - domain-subjects
origin:
  kind: agent
  recorded_at: '2026-11-12T20:00:00.000Z'
id: SCEN-NEG-kb-domain-subject-layer-DEFINITION-UNREPORTED
type: scenario
---
Given an active subject fact whose body is empty, shorter than eight words, a restatement of its title or a template other subjects share, when kibi check runs, then it must report the fact under subject-definition-missing, so a check that let the undefined subject pass is caught.

This is the failure side of the claim. packages/cli/tests/consumer/domain-subjects.test.ts exercises it end to end, and the unit suites under packages/cli/tests (subject-layer, migration/domain-subjects, mutation/subject-warnings) cover each branch.

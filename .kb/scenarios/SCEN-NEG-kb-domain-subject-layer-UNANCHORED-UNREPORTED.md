---
title: An unmodeled claim names no subject and kibi check stays silent
status: active
expects: rejection
priority: must
tags:
  - negative-path
  - domain-subjects
origin:
  kind: agent
  recorded_at: '2026-11-12T20:00:00.000Z'
id: SCEN-NEG-kb-domain-subject-layer-UNANCHORED-UNREPORTED
type: scenario
---
Given a current requirement whose unmodeled normative claim has no subjects in its inventory entry, when kibi check runs, then it must report the requirement under claim-subject-missing, so a claim that can never meet the other requirements on its subject is caught.

This is the failure side of the claim. packages/cli/tests/consumer/domain-subjects.test.ts exercises it end to end, and the unit suites under packages/cli/tests (subject-layer, migration/domain-subjects, mutation/subject-warnings) cover each branch.

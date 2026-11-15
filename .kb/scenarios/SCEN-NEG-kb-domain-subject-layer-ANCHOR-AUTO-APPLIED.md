---
title: A suggested claim subject is written without a person approving it
status: active
expects: rejection
priority: must
tags:
  - negative-path
  - domain-subjects
origin:
  kind: agent
  recorded_at: '2026-11-12T20:00:00.000Z'
id: SCEN-NEG-kb-domain-subject-layer-ANCHOR-AUTO-APPLIED
type: scenario
---
Given a current requirement whose unmodeled claim names no subject and a defined subject its words match, when kibi migrate --apply-safe runs without approving the suggestion, then the requirement file must stay unchanged, so a migration that anchors claims on its own is caught.

This is the failure side of the claim. packages/cli/tests/consumer/domain-subjects.test.ts exercises it end to end, and the unit suites under packages/cli/tests (subject-layer, migration/domain-subjects, mutation/subject-warnings) cover each branch.

---
title: The domain view of a subject leaves out a requirement about it
status: active
expects: rejection
priority: must
tags:
  - negative-path
  - domain-subjects
origin:
  kind: agent
  recorded_at: '2026-11-12T20:00:00.000Z'
id: SCEN-NEG-kb-domain-subject-layer-DOMAIN-VIEW-INCOMPLETE
type: scenario
---
Given two prose requirements whose claims name the same subject and one whose claim names a narrower subject, when kb_query asks for the subject with factKind subject, then every one of them must be listed, so a requirement left out of the domain view is caught.

This is the failure side of the claim. packages/cli/tests/consumer/domain-subjects.test.ts exercises it end to end, and the unit suites under packages/cli/tests (subject-layer, migration/domain-subjects, mutation/subject-warnings) cover each branch.

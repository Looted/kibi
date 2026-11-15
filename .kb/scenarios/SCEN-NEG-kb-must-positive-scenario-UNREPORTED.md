---
title: A new must requirement without a positive scenario passes kibi check
status: active
priority: must
expects: rejection
tags:
  - negative-path
  - domain-subjects
origin:
  kind: agent
  recorded_at: '2026-11-13T04:00:00.000Z'
id: SCEN-NEG-kb-must-positive-scenario-UNREPORTED
type: scenario
---
Given a current must requirement that the schema 17 upgrade did not record, with no scenario that expects success, or with success scenarios that assume nothing on its subjects, when kibi check runs, then it must report the requirement under must-positive-scenario, so a check that let the requirement pass without stating its positive behaviour is caught.

This is the failure side of the claim. packages/cli/tests/consumer/positive-scenarios.test.ts exercises it end to end, and packages/cli/tests/public/positive-scenario.test.ts and packages/core/tests/domain_subjects.plt cover each branch.

---
title: Declared intent claims that are not planned are reported with their reason
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:49:05.385Z'
id: SCEN-CASE-bootstrap-intent-claim-accounting-UNPLANNED-NO-REASON
type: scenario
---
Given a knowledge source with three declared intent claims and a bootstrap mode that plans none of them, so no candidate exists to explain any of the three, when the planner presents the plan, then the per-source report counts all three as not planned and states why: bootstrap synthesis is suppressed in that mode, or each claim is already in the KB, suppressed or waiting for authoring, so no unplanned claim goes without a reason.

The test case "claims not planned are reported with their real reason so the per-source counts add up" in packages/cli/tests/operations/bootstrap-write-failures.test.ts exercises it. It covers the value past the bound, `gt 0`, of unplanned intent claims without a reported reason.
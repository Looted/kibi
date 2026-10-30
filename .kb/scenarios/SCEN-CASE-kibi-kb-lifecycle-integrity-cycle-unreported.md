---
title: A two-requirement supersession cycle left after migration is reported by kb_check as a blocking violation
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:58:24.646Z'
id: SCEN-CASE-kibi-kb-lifecycle-integrity-cycle-unreported
type: scenario
---
Given a schema 6 KB in which REQ-upload-loop-a and REQ-upload-loop-b supersede each other, after kibi migrate applies its safe repairs, when kb_check runs the superseded-requirement-open rule, then the cycle is reported as a superseded-requirement-open violation and the next migration plan keeps it as a review action, so a cycle that goes unreported fails the check.

The test case packages/cli/tests/commands/migrate-lifecycle.test.ts "plans and applies the lifecycle repairs on a schema 6 KB, leaving cycles and unsafe source edits for review" exercises it. It covers the value below the bound of violations per supersession cycle, `lt 1`.
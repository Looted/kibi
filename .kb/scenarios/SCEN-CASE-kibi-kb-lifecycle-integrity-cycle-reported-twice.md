---
title: A two-requirement supersession cycle yields exactly one kb_check violation, not one per member
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:58:09.411Z'
id: SCEN-CASE-kibi-kb-lifecycle-integrity-cycle-reported-twice
type: scenario
---
Given a schema 6 KB in which REQ-upload-loop-a and REQ-upload-loop-b supersede each other, after kibi migrate applies its safe repairs, when kb_check runs the superseded-requirement-open and source-path-dangling rules, then the violations are exactly one superseded-requirement-open row for the cycle and one source-path-dangling row, so a second report of the cycle or of its other member as open fails the check.

The test case packages/cli/tests/commands/migrate-lifecycle.test.ts "plans and applies the lifecycle repairs on a schema 6 KB, leaving cycles and unsafe source edits for review" exercises it. It covers the value past the bound of violations per supersession cycle, `gt 1`.
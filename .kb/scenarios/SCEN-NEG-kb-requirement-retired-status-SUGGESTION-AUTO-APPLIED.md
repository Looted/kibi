---
title: kibi migrate never retires a requirement without approval
status: active
expects: rejection
priority: must
tags:
  - negative-path
  - retired-status
origin:
  kind: agent
  recorded_at: '2026-11-11T17:42:17.018Z'
id: SCEN-NEG-kb-requirement-retired-status-SUGGESTION-AUTO-APPLIED
type: scenario
---
Given a closed requirement whose proof exemption says it was retired, when kibi migrate --apply-safe runs with the plan hash but without approving that action, then the requirement file is unchanged, so a migration that retired it on its own is caught.

This is the failure side of the migration claim. packages/cli/tests/commands/retired-status.test.ts "kibi migrate suggests retiring a closed requirement whose source says so and retires it only once approved" exercises it, and only the run that names req-retired-status-REQ-audit-old with --approved-action sets status: retired.
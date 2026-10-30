---
title: A CI workflow without a system SWI-Prolog job fails the workflow contract
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:58:09.862Z'
id: SCEN-CASE-prolog-bundled-ci-NO-SYSTEM-SWIPL-JOB
type: scenario
---
Given Kibi's CI workflow, when the ci-integration job stops installing a system SWI-Prolog, stops selecting it with KIBI_SWIPL=system or stops running Kibi on it, then the workflow contract check fails, so a CI with no system SWI-Prolog job is caught.

This covers the value below the bound, `lt 1` on `system_swipl_ci_jobs`. scripts/tests/ci-workflow-contract.test.ts "ci-integration keeps a system SWI-Prolog on PATH and refuses the bundle" exercises it by asserting the install script, KIBI_SWIPL: system and a kibi check run in that job.

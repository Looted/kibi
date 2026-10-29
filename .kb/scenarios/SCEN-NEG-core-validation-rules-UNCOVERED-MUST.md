---
title: kibi check rejects a must-priority requirement that has no scenario or test
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:10:56.774Z'
id: SCEN-NEG-core-validation-rules-UNCOVERED-MUST
type: scenario
---
Given a freshly initialized packed workspace whose first sync compiles a must-priority requirement that no scenario specifies and no test verifies, when kibi check --rules must-priority-coverage runs, then the check refuses the KB: it exits 1 and names the must-priority-coverage rule and the uncovered requirement.

This is the failure side of the core coverage rule: a must requirement without scenario or test evidence must not pass validation. documentation/tests/e2e/packed/cli-workflows.test.ts "should fail kibi check when a must-priority requirement has no scenario or test" exercises it.

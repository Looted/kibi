---
title: A hook message names the impact-only check after a source edit fails the contract
status: active
expects: rejection
tags:
  - negative-path
  - hooks
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T18:30:00.000Z'
id: SCEN-NEG-hooks-recommend-changed-check-IMPACT-ONLY
type: scenario
---
Given the same edits, a hook message that names kb_check with includeImpactDiagnostics and includeWorkingTreeDiff instead of changed:true, or a changed:true call that does not clear the reminder, fails the test's assertions.

## Context

The failure side of REQ-hooks-recommend-changed-check.
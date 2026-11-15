---
title: The schema 15 upgrade pins asserted on an approved requirement without a proof path
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-11-12T18:40:00.000Z'
id: SCEN-CASE-kibi-evidence-floors-UNPINNED-APPROVED
type: scenario
---
Given a schema 14 KB that holds an agent requirement a person approved, with no firmness, no required_evidence and no proof path, when kibi migrate --yes runs, then it records required_evidence asserted on it and leaves an approved requirement with `firmness: default` untouched.

This covers the edge case of one unpinned approved requirement without a proof path, the value past the bound `gt 0`: the upgrade pins it instead of leaving it to fail kibi check at once. packages/cli/tests/commands/approval-evidence-floor.test.ts exercises it with REQ-approved and REQ-approved-default.

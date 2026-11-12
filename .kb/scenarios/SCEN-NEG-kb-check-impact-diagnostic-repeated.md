---
title: A scoped check does not repeat an impact diagnostic as a quality diagnostic
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  ref: 'Maintainer request, 2026-11-12, after the review of release 2026.11.2 reported the findings: "Well, can you make a PR with a hotfix then?" and "Yes, do all post review work in the hotfix."; wording approved by the maintainer, 2026-11-12: "Approve"'
  approved_by: maintainer
  recorded_at: '2026-11-12T14:32:15.134Z'
id: SCEN-NEG-kb-check-impact-diagnostic-repeated
type: scenario
---
Given a check scoped with `sourceFiles` to a file whose changed symbol produces impact diagnostics, when the result is returned, then none of those diagnostics is also under `qualityDiagnostics`, and no migration plan action carries a second copy of one.

This is the failure side of listing each diagnostic once: the repeated copies tripled the result. `packages/cli/tests/consumer/check-impact-diagnostics-once.test.ts` runs the built CLI and compares the two lists.

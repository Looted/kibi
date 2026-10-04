---
title: Telemetry acceptance measures lookup before the first requirement-linked edit
status: passing
tags:
  - telemetry
  - acceptance
  - remediation
  - hooks
verification_scope: unit
verification_perspective: internal
text_ref: packages/cli/tests/public/telemetry-acceptance.test.ts; packages/cli/tests/public/telemetry-remediation.test.ts
origin:
  kind: agent
  recorded_at: '2026-10-04T02:12:52.472Z'
id: TEST-kibi-telemetry-lookup-before-first-edit
type: test
---
# Telemetry acceptance measures lookup before the first requirement-linked edit

Runs `packages/cli/tests/public/telemetry-acceptance.test.ts` and `packages/cli/tests/public/telemetry-remediation.test.ts`.

They check that `parseTelemetryUsageLog` keeps hook rows out of the operation events, that `lookup_before_first_edit` is `not_applicable` without a requirement-linked edit, passes when `kb_search` or `kb_query` ran earlier in the host session, fails with `lookup_before_first_edit_bypassed` otherwise, and that remediation points at the exact hook row line.

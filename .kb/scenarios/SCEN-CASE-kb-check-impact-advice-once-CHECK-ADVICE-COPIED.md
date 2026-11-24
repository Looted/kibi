---
title: Advice that two impact diagnostics share is never listed twice
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-11-24T19:26:41.864Z'
id: SCEN-CASE-kb-check-impact-advice-once-CHECK-ADVICE-COPIED
type: scenario
---
Given a change that produces two requirement_statement_unverified warnings with the same advice, when kibi check returns its structured result, then impactAdvice holds that advice once and both warnings point at the same index without a suggestion, so a second copy of the advice is caught.

This covers one violating item past the invariant, `gt 0` on `shared_advice_copies_beyond_first`. packages/cli/tests/consumer/check-compact-impact.test.ts and packages/cli/tests/public/impact/shared-advice.test.ts exercise it by asserting the exact advice list.

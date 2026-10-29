---
title: Without a current receipt a full check keeps the coverage-depth review and reports the proof status coverage reports
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:06:00.426Z'
id: SCEN-NEG-kibi-proof-aware-quality-diagnostics-NO-RECEIPT-DEPTH
type: scenario
---
Given a consumer workspace whose requirement is specified by a scenario with an end-to-end test that has not been proved, when kibi check runs before kibi prove, then it keeps one coverage_depth_review for the requirement, records open_or_nonpassing_tests_only, and reports the same proof status that requirement coverage reports; only after kibi prove writes a passing receipt does the review clear.

This is the failure side of proof-aware quality diagnostics: an unproved test must not be read as behaviour-level evidence by one surface and not the other. packages/cli/tests/consumer/check-proof-evidence.test.ts "a current passing e2e receipt clears coverage_depth_review in kibi check" exercises it.

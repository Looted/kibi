---
title: A project without an impact policy on its base is not held to impact review
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T14:00:00.000Z'
id: SCEN-NEG-kibi-impact-receipts-advisories-opt-in-NO-POLICY
type: scenario
---
Given a staged snapshot whose base tree has no `.kibi/impact-policy.json`, when Kibi decides whether staged impact review applies, then it reports that no valid base policy exists, so `kibi check --staged` keeps the project's existing behavior instead of demanding a review record; an invalid policy blob is refused rather than treated as absent.

This is the failure side of explicit opt-in. packages/cli/tests/traceability/impact-policy.test.ts "is false without a base policy" and "is true for a valid base policy and throws for an invalid one" exercise it. Through the packed CLI, the derived-coordinate fixture in documentation/tests/e2e/packed/impact-review-stage-e.test.ts has no impact policy and runs `kibi check --staged` on a staged change to an owned declaration without being asked for an impact review.

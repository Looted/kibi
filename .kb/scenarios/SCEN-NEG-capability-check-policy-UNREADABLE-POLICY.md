---
title: An unreadable activated check policy blocks the check instead of switching it off
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:17:23.694Z'
id: SCEN-NEG-capability-check-policy-UNREADABLE-POLICY
type: scenario
---
Given an activated check policy whose document cannot be read, when kb_check runs its policy rules, then the check reports a blocking violation for the unreadable policy rather than silently skipping the policy.

This is the failure side of policy enforcement: a broken policy must not quietly disable the rules it carries. packages/cli/tests/public/check-policy-rules.test.ts "a policy that cannot be read blocks instead of switching off" exercises it.

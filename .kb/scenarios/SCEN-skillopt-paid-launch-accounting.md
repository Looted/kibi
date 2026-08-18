---
id: SCEN-skillopt-paid-launch-accounting
title: Paid launches remain bound to exact requests and reconciled receipts
type: scenario
status: active
created_at: 2026-07-26T00:00:00Z
updated_at: 2026-07-26T00:00:00Z
source: documentation/requirements/REQ-skillopt-paid-launch-accounting.md
priority: must
tags: [skillopt, paid-launch, security, accounting]
links:
  - type: verified_by
    target: TEST-skillopt-paid-launch-accounting
---

Given an externally authorized SkillOpt run and two distinct request IDs that may share the same request hash, when the trusted broker reserves, forwards, and reconciles paid model calls, then each sealed one-use capability remains bound to its exact request and approved pricing, all pinned-network and spending policies fail closed, and strict fixture receipts reconcile the exact debit chain into a separately signed final verdict without claiming external signing.

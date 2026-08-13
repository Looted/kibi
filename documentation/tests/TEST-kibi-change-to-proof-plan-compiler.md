---
id: TEST-kibi-change-to-proof-plan-compiler
title: Change-to-proof plan compiler verification
type: test
status: passing
created_at: 2026-08-13T00:00:00Z
updated_at: 2026-08-13T00:00:00Z
source: documentation/tests/TEST-kibi-change-to-proof-plan-compiler.md
priority: must
verification_scope: integration
verification_perspective: consumer
tags: [planning, requirements, contradiction, traceability, test]
links:
  - type: validates
    target: SCEN-kibi-change-to-proof-plan-compiler
---

Operation tests verify deterministic plan hashes, one disposition per assertive clause, contradiction and ontology-gap abstentions, dependency ordering, sequential apply behavior, and rejection of stale plan hashes. MCP and CLI fixtures assert the same planning and mutation contracts.

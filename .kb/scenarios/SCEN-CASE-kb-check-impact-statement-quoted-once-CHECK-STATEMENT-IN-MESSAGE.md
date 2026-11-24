---
title: A requirement statement is never quoted again in an impact diagnostic's message
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-11-24T19:26:40.374Z'
id: SCEN-CASE-kb-check-impact-statement-quoted-once-CHECK-STATEMENT-IN-MESSAGE
type: scenario
---
Given a committed workspace whose changed file implements two requirements, when kibi check runs with impact diagnostics on that file, then each requirement_statement_unverified message leaves the statement out and points at evidence.statement, so a message that quoted the statement again is caught.

This covers one violating item past the invariant, `gt 0` on `statement_quotes_outside_evidence`. packages/cli/tests/consumer/check-compact-impact.test.ts exercises it by asserting no message contains its statement.

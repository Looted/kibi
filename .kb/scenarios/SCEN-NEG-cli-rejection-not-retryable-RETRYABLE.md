---
title: A refusal reported as retryable is caught
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T14:41:06.122Z'
id: SCEN-NEG-cli-rejection-not-retryable-RETRYABLE
type: scenario
---
Given an operation that throws a KB rejection, wrapped or not, or an OperationError created without an explicit retryable flag, when the CLI JSON route reports retryable true for it, then the CLI protocol and error tests fail. packages/cli/tests/cli-protocol-mutation.test.ts and packages/cli/tests/cli-errors.test.ts exercise it.
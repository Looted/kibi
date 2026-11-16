---
title: A refused CLI JSON call says not to retry it unchanged
status: active
expects: success
priority: must
tags:
  - cli
  - errors
origin:
  kind: agent
  recorded_at: '2026-11-16T14:41:04.187Z'
id: SCEN-cli-rejection-not-retryable
type: scenario
---
Given an operation that throws a KB rejection (directly, or as the cause of a wrapping error) or an OperationError refusal such as SOURCE_PATH_INVALID, when it runs through the CLI JSON route, then the printed error envelope has retryable false, and the same holds for PROTOCOL_VALIDATION_FAILED and PROLOG_UNAVAILABLE.
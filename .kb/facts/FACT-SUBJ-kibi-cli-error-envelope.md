---
title: CLI JSON error envelope
status: active
fact_kind: subject
subject_key: kibi.cli.error_envelope
tags:
  - cli
  - errors
origin:
  kind: agent
  recorded_at: '2026-11-16T14:39:59.553Z'
id: FACT-SUBJ-kibi-cli-error-envelope
type: fact
---
The error object a CLI JSON route prints when a call fails: its code, its message and whether the same call, repeated unchanged, may succeed (retryable). It covers every failed CLI JSON operation, whether the operation threw or reported the error in its own result.
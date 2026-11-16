---
title: A file that hands the global object on to other code is refused
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T11:06:26.164Z'
id: SCEN-NEG-kibi-env-reader-presence-tests-HANDED-ON
type: scenario
---
Given a TypeScript file that passes globalThis to a function or uses it as a default parameter, when the env references reader extracts the environment variables the file reads, then the read is refused, since the receiver can read process.env through it.

## Context

The failure side of the presence-test rule. packages/cli/tests/proofs/source-proof-kinds.test.ts exercises it.
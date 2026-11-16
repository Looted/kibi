---
title: A file that only tests the global object for presence reads only its real env members
status: active
priority: must
tags:
  - proof
  - source
origin:
  kind: agent
  recorded_at: '2026-11-16T11:06:25.258Z'
id: SCEN-kibi-env-reader-presence-tests
type: scenario
expects: success
---
Given a TypeScript file that assigns globalThis.window to view, tests it with if (view), and reads import.meta.env.FOO, when the env references reader extracts the environment variables the file reads, then the read succeeds with the single member FOO.

## Context

The success side of PR 740's env reader fix: a presence test hands the global object to nothing, so it cannot read a variable. packages/cli/tests/proofs/source-proof-kinds.test.ts exercises it.
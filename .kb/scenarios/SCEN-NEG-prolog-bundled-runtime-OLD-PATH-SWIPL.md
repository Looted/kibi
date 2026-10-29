---
title: A swipl on PATH older than 9.0 is refused with the install command for the platform
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:06:42.369Z'
id: SCEN-NEG-prolog-bundled-runtime-OLD-PATH-SWIPL
type: scenario
---
Given no bundled platform package and a swipl 8.4.2 as the only SWI-Prolog on PATH, when Kibi resolves SWI-Prolog, then resolution fails with swipl_not_found, the message says the PATH swipl is older than 9.0 and gives the platform install command.

This is the failure side of runtime resolution: an unsupported system SWI-Prolog must not be launched as though it were adequate. packages/cli/tests/prolog/swipl-resolver.test.ts "rejects swipl on PATH older than 9.0 and says so" exercises it.

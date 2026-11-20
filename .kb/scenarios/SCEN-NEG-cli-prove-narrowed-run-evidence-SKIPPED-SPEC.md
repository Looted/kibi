---
title: A narrowed run that skipped a test's spec is refused for that test
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-20T16:10:34.106Z'
id: SCEN-NEG-cli-prove-narrowed-run-evidence-SKIPPED-SPEC
type: scenario
---
Given tests bound to e2e/a.spec.ts and e2e/b.spec.ts, when an artifact whose command was narrowed to e2e/b.spec.ts only is ingested for both, or an artifact narrowed to e2e/a.spec.ts plus a spec no ingested test names, then ingest refuses it with "artifact command_argv does not match the configured command" and writes no receipt. A command producer's command with extra arguments is refused the same way.
---
title: A failing curated unit batch is reported with a message that names it
status: active
expects: error
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:57:53.279Z'
id: SCEN-NEG-root-suite-batch-diagnostics-UNNAMED-BATCH-FAILURE
type: scenario
---
Given a real bun test subprocess whose fixture deliberately fails, when the suite parses its summary and builds the batch failure message, then the run exits non-zero, the parsed summary reports the failure, and the message names the failing batch.

This is the failure side of batch diagnostics: an operator must be able to trace a failed batch without re-running the whole suite. documentation/tests/e2e/root-batch-diagnostics.e2e.ts, in its deliberately failing fixture batch check, exercises it.

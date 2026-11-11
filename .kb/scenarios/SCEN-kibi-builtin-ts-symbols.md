---
title: 'A class method is reported as Ledger.record next to the class and a function'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-builtin-ts-symbols
type: scenario
---
Given a file with an exported class Ledger that has a public record method and an exported function total, when the builtin ts-morph extractor analyzes it, then it reports Ledger, Ledger.record and total in parser mode.

This is the success side of builtin TypeScript symbols. documentation/tests/e2e/capability-plugins.e2e.ts, in its builtin providers section, exercises it.

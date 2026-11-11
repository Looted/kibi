---
title: 'The packed Tree-sitter analyzer is approved and providers get a budget inside the host deadline'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-approved-source-analyzers
type: scenario
---
Given a fixture with the packed kibi-plugin-treesitter installed, when the installed impact API fingerprints the maintenance source set, then it succeeds and the installed analyzer matches its approval; and the installed source analysis service gives a provider budget above 0 and below the host deadline for 50, 5000 and 30000 ms.

This is the success side of approved source analyzers. documentation/tests/e2e/packed/impact-review-stage-e.test.ts, in its derived coordinate workflow, exercises it.

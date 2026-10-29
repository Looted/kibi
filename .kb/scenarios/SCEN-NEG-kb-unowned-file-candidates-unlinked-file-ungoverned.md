---
title: A file no symbol links is not reported as ungoverned; the scoped check says a recorded rule may still cover it
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:01:29.643Z'
id: SCEN-NEG-kb-unowned-file-candidates-unlinked-file-ungoverned
type: scenario
---
Given a changed source file that no symbol links to a requirement, when an impact kb_check is scoped to it, then the source_file_unowned diagnostic stays informational and non-blocking, names the candidate requirements sharing its path words, and states that a missing link does not mean no recorded rule covers the behavior.

This is the failure side of unowned file reporting: a missing link must not be presented as proof that nothing governs the file. packages/cli/tests/traceability/unowned-files.test.ts "names candidate requirements for a requested file no symbol links" exercises it.

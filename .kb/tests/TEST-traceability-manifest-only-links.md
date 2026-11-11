---
title: Staged extraction ignores implements comments and keeps manifest links
status: passing
priority: must
tags:
  - traceability
  - staged-check
  - unit
origin:
  kind: agent
  approved_by: Piotr Franczyk
  ref: 'Project thread, 2026-11-11: hard-drop inline implements comments'
  recorded_at: '2026-11-11T05:47:30.413Z'
id: TEST-traceability-manifest-only-links
type: test
---
`packages/cli/tests/traceability/traceability.test.ts` runs `extractSymbolsFromStagedFile` on staged TypeScript: a function under an implements comment with no manifest lookup must have empty `reqLinks`, and a function whose manifest lookup entry implements REQ-MANIFEST must keep exactly that link although its comment names REQ-INLINE. It would pass falsely if the fixture comment were not directly above the declaration, so both fixtures put it on the preceding line.
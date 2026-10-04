---
title: CLI status tests prove canonical-lane freshness
status: passing
verification_scope: unit
verification_perspective: internal
id: TEST-cli-canonical-status
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
`packages/cli/tests/commands/status.test.ts` proves `kibi status` becomes stale after editing, adding, or deleting canonical `.kb/` knowledge-lane markdown, stays fresh for leftover `documentation/` notes without entity frontmatter, and ignores e2e README files.

`packages/core/src/status.pl` walks `.kb/` knowledge lanes plus leftover `documentation/` (excluding `tests/e2e` and `tests/benchmarks`).

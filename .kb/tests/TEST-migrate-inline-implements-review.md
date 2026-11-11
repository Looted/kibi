---
title: kibi migrate plans one review action for inline implements comments
status: passing
priority: must
tags:
  - migration
  - traceability
  - integration
origin:
  kind: agent
  approved_by: Piotr Franczyk
  ref: 'Project thread, 2026-11-11: hard-drop inline implements comments'
  recorded_at: '2026-11-11T05:47:32.064Z'
id: TEST-migrate-inline-implements-review
type: test
---
`packages/cli/tests/commands/migrate-inline-implements.test.ts` runs `migrateCommand` with JSON output in a temporary Git workspace with one tracked commented source file and asserts the single review action, its evidence (file, line, ids, manifestLinked) and that the source bytes are unchanged; a second case deletes the comment and asserts no action. `packages/cli/tests/operations/migration/inline-implements-comments.test.ts` covers the comment syntaxes, tracked-only scanning and the evidence page limit. It would pass falsely if the scan read untracked files, so the fixture stages the file with git add.
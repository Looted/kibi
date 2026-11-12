---
title: kibi migrate does not remove an implements comment from source
status: active
expects: rejection
priority: must
tags:
  - negative-path
  - migration
  - traceability
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-11, to hard-drop inline implements comments; wording approved: "Ok"'
  recorded_at: '2026-11-11T06:01:48.233Z'
id: SCEN-NEG-migrate-inline-implements-edits-source
type: scenario
---
Given a tracked source file with an `implements` comment, when `kibi migrate` plans the migration, then it does not rewrite the file to remove the comment: the comment stays byte for byte and is only listed in the review action.

This is the failure side of the review action: Kibi never edits source code, so a plan that deleted the comment would break that rule. `documentation/tests/e2e/packed/inline-implements-comments.test.ts` compares the source bytes after the packed `kibi migrate` run.

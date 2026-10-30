---
title: An upsert that would leave an uncompiled requirement file uncompilable is refused with the file and the extraction error
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:18:44.646Z'
id: SCEN-NEG-kibi-uncompiled-source-visibility-UNCOMPILABLE-WRITE
type: scenario
---
Given a requirement file whose front matter carries a priority value sync cannot compile, so the store lacks the requirement, when kibi upsert changes only its status, then the write is refused with a message that the requirement exists in that file but is not compiled and that the write would leave it uncompilable with the validation error, and the file is left byte for byte unchanged.

This is the failure side of uncompiled source visibility: a write must not take the create path over a file the store cannot see. packages/cli/tests/commands/migrate-legacy-status.test.ts "kb_upsert on an uncompiled requirement file is judged as the next sync judges that file" exercises it with REQ-EDITOR-007.

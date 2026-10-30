---
title: An upsert the next sync would refuse is refused for an uncompiled requirement file that is new authoring
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:18:57.875Z'
id: SCEN-NEG-kibi-uncompiled-source-semantic-baseline-NEW-AUTHORING-CLOSE
type: scenario
---
Given a requirement file without a proposition inventory that was written after the store's first compilation and has never compiled, when kibi upsert closes it, then the write is refused with proposition-complete ingestion failed because it would become a current requirement without a complete inventory, and the file is unchanged, while the same close on a legacy file that failed the first compilation is accepted and syncs.

This is the failure side of matching the write guard to sync: the guard must not accept a write the next sync would reject. packages/cli/tests/commands/migrate-legacy-status.test.ts "kb_upsert on an uncompiled requirement file is judged as the next sync judges that file" exercises it with REQ-EDITOR-008.

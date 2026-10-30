---
title: An authored requirement file sync cannot compile fails kb_check with a violation naming it
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:59:49.546Z'
id: SCEN-CASE-kibi-uncompiled-source-visibility-UNEXTRACTABLE-UNREPORTED
type: scenario
---
Given a requirement file whose status value Kibi does not know, so kibi sync cannot compile it and the store lacks its entity, when kb_check runs, then the check exits non-zero with a violation that names the file and its validation error, and kb_status stays stale with a blocking source_extraction_failed reason for that path until the file is fixed.

The test case "an unknown status leaves the migration incomplete, and kb_check and kb_status name the uncompiled file" in packages/cli/tests/commands/migrate-legacy-status.test.ts exercises it through the kibi CLI. It covers the value past the bound, `gt 0`, of unextractable sources without a blocking violation.
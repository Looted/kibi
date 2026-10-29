---
title: kibi migrate does not report a complete migration while a requirement with an unknown status stays uncompiled
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:01:00.232Z'
id: SCEN-NEG-cli-migrate-legacy-requirement-status-COMPLETE-WITH-UNCOMPILED
type: scenario
---
Given a legacy KB with a requirement whose status wip is not a status Kibi knows, when kibi migrate --yes runs, then it refuses to report the migration as complete: it prints Migration incomplete, names the uncompiled file and why, and the following kibi check fails with a source-relationship-parity violation that suggests kibi migrate --yes.

This is the failure side of legacy status migration: claiming success while kibi sync silently drops a requirement would hide lost knowledge. packages/cli/tests/commands/migrate-legacy-status.test.ts "an unknown status leaves the migration incomplete, and kb_check and kb_status name the uncompiled file" exercises it.

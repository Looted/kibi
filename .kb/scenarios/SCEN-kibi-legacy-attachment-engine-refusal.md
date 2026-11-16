---
title: A legacy store is migrated, not recovered, and then answers queries
status: active
expects: success
priority: must
tags:
  - branching
  - migration
origin:
  kind: agent
  recorded_at: '2026-11-16T20:45:39.876Z'
id: SCEN-kibi-legacy-attachment-engine-refusal
type: scenario
---
Given a project whose branch store is still at its legacy literal path, when kibi migrate previews a plan and kibi migrate --apply-safe applies that plan's hash, then the plan holds the legacy migration and no branch store recovery, and the migrated store answers kibi query without being recovered afterwards.

documentation/tests/e2e/packed/legacy-attachment-cli-apply.test.ts exercises it through the installed CLI.
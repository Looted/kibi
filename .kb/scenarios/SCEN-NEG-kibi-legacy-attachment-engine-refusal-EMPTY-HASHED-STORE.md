---
title: Engine-backed commands on a legacy store are refused and create no hashed store
status: active
expects: rejection
tags:
  - negative-path
  - branching
  - migration
origin:
  kind: agent
  recorded_at: '2026-11-16T20:45:41.469Z'
id: SCEN-NEG-kibi-legacy-attachment-engine-refusal-EMPTY-HASHED-STORE
type: scenario
---
Given a project whose branch store is still at its legacy literal path, when kibi query, kibi check or kibi engine status runs before the store is migrated, then each is refused with directions to kibi migrate --apply-safe, and no hashed store is created beside the legacy one.

documentation/tests/e2e/packed/legacy-attachment-cli-apply.test.ts exercises it through the installed CLI.
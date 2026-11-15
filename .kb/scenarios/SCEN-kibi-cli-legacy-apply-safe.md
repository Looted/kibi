---
title: kibi migrate --apply-safe migrates an attached legacy store
status: active
expects: success
tags:
  - branching
  - migration
origin:
  kind: agent
  recorded_at: '2026-11-15T17:00:00.000Z'
id: SCEN-kibi-cli-legacy-apply-safe
type: scenario
---
Given a project whose branch store is still at its legacy literal path, when kibi migrate previews a plan and kibi migrate --apply-safe applies that plan's hash, then the legacy migration is applied first, the store moves to its hashed path, and the knowledge in it answers queries afterwards.

documentation/tests/e2e/packed/legacy-attachment-cli-apply.test.ts exercises it through the installed CLI.
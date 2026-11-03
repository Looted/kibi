---
title: A relationship whose target was missing is asserted once the target is added
status: active
tags:
  - cli
  - sync
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the fixes from the requirements-to-code audit, including retrying relationships sync could not assert: "Yes, do both suggested."'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:17:41.114Z'
id: SCEN-sync-relationship-retry
type: scenario
---
Given an incremental sync that could not assert a scenario's front-matter relates_to link because its target scenario did not exist yet, when only the target scenario is added and sync runs again, then the link is asserted and a further sync reports 0 entities and 0 relationships imported.

packages/cli/tests/commands/sync.test.ts "retries a front-matter relationship once its missing target is added" exercises it against the real CLI in a fresh repository.
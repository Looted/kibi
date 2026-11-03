---
title: A sync that never retries an unasserted relationship leaves the link missing and fails the retry check
status: active
expects: rejection
tags:
  - negative-path
  - sync
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the fixes from the requirements-to-code audit, including retrying relationships sync could not assert: "Yes, do both suggested."'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:22:50.239Z'
id: SCEN-NEG-sync-relationship-retry-NO-RETRY
type: scenario
---
Given a sync that caches a source file even though a relationship it declares could not be asserted, when only the relationship's target is fixed and sync runs again, then the source is not extracted, the link stays missing and the run reports no changes. This is the behaviour REQ-sync-relationship-retry forbids: the end-to-end retry test fails on it, because kibi query shows no relates_to link after the second sync.
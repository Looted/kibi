---
title: The update notice names a KB schema move instead of hiding it
status: active
expects: rejection
tags:
  - negative-path
  - release
  - update-notice
origin:
  kind: agent
  recorded_at: '2026-11-04T13:26:27.406Z'
id: SCEN-NEG-kibi-update-notice-SCHEMA-CHANGE-HIDDEN
type: scenario
---
Given a cached newer release that declares KB schema 14 while the running CLI writes schema 13, when the notice or the kibi doctor row is shown, then it names the move from schema 13 to 14 and the kibi migrate step instead of reporting a plain version bump. packages/cli/tests/update-check.test.ts "calls out a newer KB schema with the migrate step" and "adds the migrate step for a newer KB schema" exercise it.

This is the failure side of the update notice requirement.
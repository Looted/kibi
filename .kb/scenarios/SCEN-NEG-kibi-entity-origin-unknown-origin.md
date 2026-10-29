---
title: An origin with an unknown kind or field is rejected before anything is written
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:12:18.418Z'
id: SCEN-NEG-kibi-entity-origin-unknown-origin
type: scenario
---
Given a consumer workspace, when the kibi CLI upserts a requirement whose origin has the unknown kind robot, or an agent origin with an extra author field, then the write fails with VALIDATION_FAILED naming the offending origin path, and no requirement document or stored entity is created.

This is the failure side of entity origin: authorship records must stay in the fixed vocabulary so approvals and agent authorship remain trustworthy. packages/cli/tests/consumer/entity-origin.test.ts "records agent authorship on upsert, keeps it on later writes, and flags uncorroborated approvals" exercises it.

---
title: A symbol write that fails after the requirement is stored reports the links left to record
status: active
expects: error
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T07:17:12.946Z'
id: SCEN-NEG-kb-upsert-implemented-by-UNLINKED
type: scenario
---
Given a requirement write with two implementedBy entries, when the requirement is stored but writing the second symbol fails, then kb_upsert returns an error that names the requirement and the links already written, and gives the remaining symbol payloads to upsert, so no entry is silently left unlinked. packages/cli/tests/operations-mutation/mutation/implemented-by.test.ts exercises it.
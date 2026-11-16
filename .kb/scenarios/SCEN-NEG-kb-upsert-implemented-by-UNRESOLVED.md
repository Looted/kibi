---
title: An implementedBy entry that matches nothing is refused with the file's symbols
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T07:13:30.670Z'
id: SCEN-NEG-kb-upsert-implemented-by-UNRESOLVED
type: scenario
---
Given an implementedBy entry naming a symbol its file does not declare, when kb_upsert receives it, then the write is refused with the symbols the file does declare, so the writer can resend once. packages/cli/tests/operations-mutation/mutation/implemented-by.test.ts exercises it.
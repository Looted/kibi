---
title: An implementedBy entry is never stored as a whole-file link
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T07:13:31.574Z'
id: SCEN-NEG-kb-upsert-implemented-by-FILE-LINK
type: scenario
---
Given an implementedBy entry that would resolve only to the whole file or to a coarse declaration, when kb_upsert receives it, then the write is refused instead of recording a link from the file. packages/cli/tests/operations-mutation/mutation/implemented-by.test.ts exercises it.
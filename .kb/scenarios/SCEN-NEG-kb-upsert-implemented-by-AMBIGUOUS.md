---
title: An implementedBy entry that matches several declarations is refused
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T07:13:29.669Z'
id: SCEN-NEG-kb-upsert-implemented-by-AMBIGUOUS
type: scenario
---
Given a file where two classes each declare a method named rotate, when kb_upsert receives an implementedBy entry naming rotate, then it refuses the write and lists the candidates Audit.rotate and KeyStore.rotate, and nothing is stored. packages/cli/tests/operations-mutation/mutation/implemented-by.test.ts exercises it.
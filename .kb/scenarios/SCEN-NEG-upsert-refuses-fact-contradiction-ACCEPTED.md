---
title: A fact write that makes two requirements conflict is accepted
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T19:16:33.308Z'
id: SCEN-NEG-upsert-refuses-fact-contradiction-ACCEPTED
type: scenario
---
An agent moves a ceiling below another requirement's floor on the same quantity, and kb_upsert writes it, so the KB holds two requirements no value can satisfy.

This is the failure side the write must not produce; TEST-upsert-stale-siblings checks it.
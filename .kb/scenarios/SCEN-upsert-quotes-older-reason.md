---
title: kb_upsert quotes the recorded reason when a grounded value changes
status: active
priority: must
expects: success
tags:
  - upsert
  - rationale
origin:
  kind: agent
  recorded_at: '2026-11-16T14:58:13.348Z'
id: SCEN-upsert-quotes-older-reason
type: scenario
---
Changing the value of a fact a requirement with a rationale is grounded on returns one note that quotes the rationale and asks whether it still holds; a write that leaves the value as it was gets no note.
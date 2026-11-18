---
title: 'Unguarded edit: a closed firm requirement read as retired'
status: active
tags:
  - negative-path
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-17T19:23:35.193Z'
id: SCEN-NEG-closed-firm-requirement-guard-VIOLATED
type: scenario
---
The commit gate reads closed as retired and lets an edit of a closed firm requirement's code through while the hooks ask.

This is the failure side the shared status test must not produce; TEST-closed-firm-requirement-guards checks it.
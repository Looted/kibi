---
title: A committed kb_record without the gate verdict is refused
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T06:42:50.093Z'
id: SCEN-NEG-kb-record-returns-verdict-NO-VERDICT
type: scenario
---
Given a committed kb_record whose result has no commit gate verdict, when it is checked, then it is refused: a committed kb_record must return commitAllowed and every finding with its blocks value.

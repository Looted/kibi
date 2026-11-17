---
title: A kb_record that drops an input is refused
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T07:11:03.374Z'
id: SCEN-NEG-kb-record-capture-inputs-INPUT-DROPPED
type: scenario
---
Given a kb_record call whose requirement leaves out the why, a code entry or the test link, when it is checked, then it is refused: every input must reach the requirement.

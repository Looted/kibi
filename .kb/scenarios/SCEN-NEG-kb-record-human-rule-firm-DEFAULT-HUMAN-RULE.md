---
title: A stated rule recorded as default is refused
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T07:11:06.772Z'
id: SCEN-NEG-kb-record-human-rule-firm-DEFAULT-HUMAN-RULE
type: scenario
---
Given a rule a user stated that kb_record recorded as default without the quote as origin.ref, when it is checked, then it is refused: a stated rule must be firm with a human origin and the quote.

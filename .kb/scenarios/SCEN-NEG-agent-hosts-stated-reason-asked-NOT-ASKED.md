---
title: A stated reason not asked for is refused
status: active
expects: rejection
tags:
  - negative-path
priority: must
origin:
  kind: agent
  recorded_at: '2026-11-16T16:23:41.679Z'
id: SCEN-NEG-agent-hosts-stated-reason-asked-NOT-ASKED
type: scenario
---
Given a rule prompt that gives its reason with because, when the rule note leaves the reason out, then it is refused: the note must ask for the reason in why.
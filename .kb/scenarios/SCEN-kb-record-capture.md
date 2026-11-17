---
title: A stated rule is recorded with one kb_record call
status: active
expects: success
priority: must
tags:
  - kb-record
origin:
  kind: agent
  recorded_at: '2026-11-17T06:42:44.603Z'
id: SCEN-kb-record-capture
type: scenario
---
Given a rule a maintainer stated with a reason, their words and the function that implements it, when the agent records it with kb_record, then one firm requirement of human origin holds the statement, the reason and the quote as origin.ref, the function implements it, and the result carries the commit gate's verdict, every finding with its blocks value, and the scenario and test still needed as nextActions; the same rule chosen by the agent is recorded default with an agent origin.

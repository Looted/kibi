---
title: Capture notes ask the person once
status: active
expects: success
priority: must
tags:
  - hooks
  - decision-capture
origin:
  kind: agent
  recorded_at: '2026-11-24T20:01:59.523Z'
id: SCEN-agent-hosts-capture-ask-once
type: scenario
---
Given a session that changed source files after a rule prompt, when the capture reminder or the rule template is shown on any host, then it says kb_record returns every step and approval at once and that the approvals go to the person in one question.

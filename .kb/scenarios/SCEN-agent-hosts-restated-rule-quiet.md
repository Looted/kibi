---
title: Rule notes skip a sentence that restates a recorded requirement
status: active
expects: success
priority: must
tags:
  - hooks
  - decision-capture
origin:
  kind: agent
  recorded_at: '2026-11-24T20:02:19.894Z'
id: SCEN-agent-hosts-restated-rule-quiet
type: scenario
---
Given a current requirement that API keys expire after 90 days, when the prompt says API keys must expire after 90 days, then no rule note is given; when it says after 30 days, or for admins, or never, the rule note is given.

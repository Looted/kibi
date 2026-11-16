---
title: The capture template after a rule prompt carries why
status: active
expects: success
tags:
  - hooks
  - decision-capture
priority: must
origin:
  kind: agent
  recorded_at: '2026-11-16T16:11:39.371Z'
id: SCEN-agent-hosts-capture-template-why
type: scenario
---
Given a session whose prompt stated a rule, when the agent first changes a source file, then the kb_upsert template the hook gives has a why field.
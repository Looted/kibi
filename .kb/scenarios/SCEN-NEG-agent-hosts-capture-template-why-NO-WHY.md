---
title: A capture template without why is refused
status: active
expects: rejection
tags:
  - negative-path
priority: must
origin:
  kind: agent
  recorded_at: '2026-11-16T16:23:38.379Z'
id: SCEN-NEG-agent-hosts-capture-template-why-NO-WHY
type: scenario
---
Given a capture template the hook gives after a rule prompt that has no why field, when it is checked, then it is refused: the template must carry why.
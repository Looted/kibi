---
title: A person states a rule in a prompt and the host notes it, while a description or a question does not
status: active
priority: must
expects: success
tags:
  - hooks
  - decisions
origin:
  kind: agent
  recorded_at: '2026-11-15T18:53:06.161Z'
id: SCEN-agent-hosts-rule-phrase-detection
type: scenario
---
Given a prompt that says "from now on, never log raw tokens", when any host hook reads it, then it reads as a rule and the agent gets the rule note. Given a prompt that says "refresh tokens currently never expire, can you check why?", or one whose only rule words sit inside a code block, then it does not read as a rule and no note is added.
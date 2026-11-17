---
title: Every kb_check finding says what it blocks
status: active
expects: success
tags:
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T18:30:00.000Z'
id: SCEN-check-finding-blocks
type: scenario
---
Given a full kb_check with a violation, a blocking and an advisory quality diagnostic and a blocking impact diagnostic, each finding carries blocks merge, merge, none and commit; given kibi check --staged --format json or kb_check changed:true refusing a commit, its violations carry blocks commit, its blocking diagnostics commit and its warnings none.
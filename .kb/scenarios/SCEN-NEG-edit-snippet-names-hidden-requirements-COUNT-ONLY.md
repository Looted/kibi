---
title: A busy file's snippet names the requirements it cannot show (refused when broken)
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-24T20:02:11.363Z'
id: SCEN-NEG-edit-snippet-names-hidden-requirements-COUNT-ONLY
type: scenario
---
Given a snippet with room for the hidden ids, when it shows only a count of the requirements it left out, then it is refused.

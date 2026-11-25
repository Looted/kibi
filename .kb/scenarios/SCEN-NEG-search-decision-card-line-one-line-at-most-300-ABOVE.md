---
title: A decision card line over 300 characters (refused)
status: active
priority: must
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T14:35:52.268Z'
id: SCEN-NEG-search-decision-card-line-one-line-at-most-300-ABOVE
type: scenario
---
Given a decision with a long title and statement, when its card line holds more than 300 characters, then it is refused.
---
title: Decisions sharing exactly 80% of title words fold
status: active
priority: must
expects: success
tags:
  - edge-case
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T14:35:45.811Z'
id: SCEN-search-decision-collapse-near-identical-folds-unless-firm-or-polarity-AT
type: scenario
---
Given two decisions, neither firm and both of the same polarity, whose titles share exactly 80% of their words, the lower-ranked one folds into the higher-ranked card.
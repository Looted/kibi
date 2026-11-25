---
title: Decisions sharing under 80% of title words are folded (refused)
status: active
priority: must
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T14:35:42.637Z'
id: SCEN-NEG-search-decision-collapse-near-identical-folds-unless-firm-or-polarity-BELOW
type: scenario
---
Given two decisions whose titles share less than 80% of their words, when search folds one into the other, then it is refused.
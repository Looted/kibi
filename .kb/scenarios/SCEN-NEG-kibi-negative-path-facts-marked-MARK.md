---
title: kb_search never shows a negative-path fact as an unmarked statement
status: active
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-11T17:20:36.126Z'
id: SCEN-NEG-kibi-negative-path-facts-marked-MARK
type: scenario
---
Given a scenario that expects rejection assumes FACT-NEG-plan-writes and no requirement grounds a claim on it, when kb_search ranks it, its result row carries negativePath {polarity: forbidden, guards}, an answer-layer entry for it and the kibi search table title it "Forbidden: ...", and the text digest names it as a forbidden situation. packages/cli/tests/negative-path-facts.test.ts "marked, it follows its requirement", "the CLI table titles it as forbidden" and "the answer layer marks an ungoverned negative-path fact" exercise it.

This is the failure side of the negative-path facts requirement.
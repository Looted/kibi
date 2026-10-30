---
title: A weak kb_search answer gains advisory hints and a strong one never asks for them
status: active
tags:
  - search
  - plugins
origin:
  kind: agent
  recorded_at: '2026-10-29T19:18:48.256Z'
id: SCEN-kibi-search-hints-host
type: scenario
---
Given a project activates a search hints provider, when kb_search answers a question with a top score below 0.44 or abstains, then queryAnalysis.hints lists at most 10 requirements the provider matched, a hit on a scenario is shown as its requirement, the top governing requirements are left out, and the ranked results equal those of the same search with hints off. When the answer is strong, the provider is never called. When the provider throws, times out, returns an invalid result or cannot load, the search still answers with no hints and a diagnostic.

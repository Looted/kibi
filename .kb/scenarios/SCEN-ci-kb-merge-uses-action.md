---
title: Kibi's workflow uses the published action
status: active
priority: should
expects: success
tags:
  - ci
  - merge
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:47.757Z'
id: SCEN-ci-kb-merge-uses-action
type: scenario
---
Both jobs of .github/workflows/kb-merge.yml call ./actions/kb-merge, the list job with list-only and the resolve job with develop's Kibi build and the proof gate as its check; no other step pushes.
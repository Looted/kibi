---
title: kibi --help that prints every full description, or command help that drops it, is rejected
status: active
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-16T20:00:00.000Z'
tags:
  - tool-surface
  - negative-path
id: SCEN-NEG-cli-help-command-summaries-FULL-TEXT
type: scenario
---
Given a kibi --help listing that prints each command's whole description and every narrow route, or a kibi <command> --help that prints only the one-sentence summary, when it is checked, then it is rejected.
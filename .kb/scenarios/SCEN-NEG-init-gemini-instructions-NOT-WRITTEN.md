---
title: kibi init that leaves Gemini CLI without the instructions is rejected
status: active
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-16T17:00:00.000Z'
tags:
  - init
  - negative-path
id: SCEN-NEG-init-gemini-instructions-NOT-WRITTEN
type: scenario
---
Given kibi init that writes AGENTS.md and CLAUDE.md only, when Gemini CLI opens the repository, then it reads no Kibi instructions, which the requirement rejects.
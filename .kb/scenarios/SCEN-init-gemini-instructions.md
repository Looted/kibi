---
title: kibi init writes a GEMINI.md that imports AGENTS.md
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-16T17:00:00.000Z'
tags:
  - init
id: SCEN-init-gemini-instructions
type: scenario
---
Given a repository without GEMINI.md, when kibi init writes the agent instructions, then GEMINI.md gets a managed Kibi section with an @./AGENTS.md import; a GEMINI.md that already imports AGENTS.md or links to it is left as it is, and a link that leaves the repository is never followed.
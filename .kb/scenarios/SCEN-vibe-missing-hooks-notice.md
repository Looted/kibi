---
title: The Vibe plugin names missing Kibi git hooks at session start
status: active
expects: success
tags:
  - vibe
origin:
  kind: agent
  recorded_at: '2026-11-22T18:46:06.019Z'
id: SCEN-vibe-missing-hooks-notice
type: scenario
---
Given a Kibi workspace in a Git checkout without Kibi's hooks, the Vibe session_start context names `kibi hooks install`; outside a Git checkout there is no note.
---
title: Vibe tells the agent after a level change or a lowered floor to ask the person
status: active
expects: success
tags:
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T14:07:15.257Z'
id: SCEN-vibe-guarded-change-after-notice
type: scenario
---
Given a project at level test, when the agent edits package.json to set kibi.level to remember, or a kb_upsert lowers a requirement's required_evidence, then the Vibe post-tool hook compares the file with its text before the edit (the edit turned back, or the last commit) and tells the agent, once per change per session, to ask the person and undo the change unless they agree.

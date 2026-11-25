---
title: Codex, Cursor, ZCode and OpenCode have the agent ask before a level change or a lowered floor
status: active
expects: success
tags:
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T14:06:57.571Z'
id: SCEN-agent-hosts-guarded-change-notice
type: scenario
---
Given a project at level test, when the agent edits the level setting to remember or calls kb_upsert to lower a requirement's required_evidence, then the Codex, Cursor and ZCode pre-edit hooks tell the agent the choice is the person's and to ask first, granting no permission, and the OpenCode hook stops the first try with that notice and lets the same change through after.

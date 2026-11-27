---
title: 'Agent hooks: changes the person decides'
status: active
fact_kind: subject
subject_key: kibi.agent_hooks.guarded_change
tags:
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T14:06:28.906Z'
id: FACT-SUBJ-kibi-agent-hooks-guarded-change
type: fact
---
What each host's Kibi hook does with an edit that changes the project's Kibi level, or an edit or Kibi write that lowers a requirement's required_evidence: Claude Code and Antigravity show the person a permission prompt, Codex, Cursor and ZCode tell the agent to ask first, OpenCode stops the change once, and Vibe tells the agent after the change. It is not the level itself (kibi.level) nor how kibi check enforces a floor (kibi.evidence_floor).

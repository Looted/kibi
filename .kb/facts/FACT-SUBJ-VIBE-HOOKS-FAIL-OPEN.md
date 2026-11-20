---
title: kibi.vibe.hooks subject
status: active
fact_kind: subject
subject_key: kibi.vibe.hooks
origin:
  kind: agent
  recorded_at: '2026-11-19T20:09:34.947Z'
id: FACT-SUBJ-VIBE-HOOKS-FAIL-OPEN
type: fact
---
The Vibe hooks are the session_start, pre_agent and post_tool scripts under packages/vibe/bin/hooks; their contract is that they anchor every query at the repository root rather than the session cwd, stay cheap enough to run on every event, and always exit zero with at most a clipped additionalContext payload even when no Kibi workspace exists or the CLI call fails. It is not about the launcher spawn or the generated skill mirror.
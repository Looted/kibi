---
title: Hooks recommend the commit gate's verdict after an edit
status: active
expects: success
tags:
  - hooks
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T18:30:00.000Z'
id: SCEN-hooks-recommend-changed-check
type: scenario
---
Given a source edit in each host adapter, the message it prints names kb_check with changed:true and the edited files, and a later kb_check({changed:true, sourceFiles}) call for those files is recorded as the impact check, while the Claude Code adapter counts a changed:true check without files as covering every edit.
---
title: SkillOpt Claude Code target host
status: active
fact_kind: subject
subject_key: kibi.skillopt.claude_code_host
canonical_key: req.req_skillopt_claude_code_host
tags:
  - strict-lane
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-05: continue PR 331 on another agent host'
  recorded_at: '2026-10-05T22:04:58.269Z'
id: FACT-subject-skillopt-claude-code-host
type: fact
---

Claude Code CLI as an opt-in SkillOpt target host: each cell exposes only the evaluator broker as MCP server, runs preflight and a target-model canary first, and writes a refreshed login back only when valid. Other hosts are separate.

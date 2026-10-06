---
title: Operator runs SkillOpt target cells on the harness they select, including the Claude Code CLI
status: active
tags:
  - skillopt
  - claude-code
  - evaluation
expects: success
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-05: continue PR 331 with Claude Code CLI after Codex usage ran out'
  recorded_at: '2026-10-05T23:48:41.587Z'
id: SCEN-skillopt-claude-code-host
type: scenario
---
Given an operator who selects a harness, models and efforts for a SkillOpt run
When the selection is `KIBI_SKILLOPT_HOST=claude-code` with priced Claude model pins and campaign evaluate, confirm or the host cell smoke launches a target cell
Then the cell runs `claude -p` with the selected model pins, only the brokered Kibi MCP server, the assembled project skills, a private config dir, file tools confined to the workspace and no shell or web tools
And its stream, including host tool output, is converted to Codex-shaped evidence and scored by the unchanged evaluator
And a client response to a server-initiated MCP request never arms a broker tool timeout
And with no selection the run uses Codex
And an unknown harness value is refused before any cell work
And `revise`, which the Claude Code harness cannot execute, is refused before paid preparation

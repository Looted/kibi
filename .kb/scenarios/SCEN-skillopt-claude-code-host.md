---
title: Operator runs SkillOpt target cells through the Claude Code CLI and gets Codex-equivalent evidence
status: active
tags:
  - skillopt
  - claude-code
  - evaluation
expects: success
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-05: continue PR 331 with Claude Code CLI after Codex usage ran out'
  recorded_at: '2026-10-05T21:21:00.396Z'
id: SCEN-skillopt-claude-code-host
type: scenario
---
Given `KIBI_SKILLOPT_HOST=claude-code` and priced Claude model pins
When campaign evaluate, confirm or the host cell smoke launches a target cell
Then the cell runs `claude -p` with only the brokered Kibi MCP server, the assembled project skills, a private config dir, no shell or web tools and `.kb` deny rules
And its stream is converted to Codex-shaped evidence and scored by the unchanged evaluator
And a client response to a server-initiated MCP request never arms a broker tool timeout

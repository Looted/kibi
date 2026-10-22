---
title: An agent shows the person the requirements a change touches and the decisions waiting for them
status: active
priority: should
tags:
  - cli
  - signoff
origin:
  kind: agent
  recorded_at: '2026-10-22T09:25:35.718Z'
id: SCEN-kibi-signoff-views
type: scenario
---
Given a Git checkout where an uncommitted requirement document was added, when the agent runs kibi signoff, then the output is a kibi-signoff fenced Markdown block whose headline counts one new requirement and whose numbered entry quotes the requirement's statement, and the JSON form carries the same requirement with change new and its proof state.

Given a questions file with one proposed change to that requirement, quoting the person's words, and one already answered decision, when the agent runs kibi signoff --questions with --format html, then .kb/briefs/signoff holds latest.json with both decisions numbered 1 and 2, latest.md headed "Decisions to confirm: 1 open, 1 answered", and a self-contained HTML page under a strict content security policy that quotes the person's words and the proposed statement.

Given a Claude Code, OpenCode or VS Code session with the Kibi integration, when a signoff view arrives, then the host shows it as rendered text or a panel instead of a raw code block. This exists so the person can read and answer signoff in one place instead of scrolling back through the conversation.
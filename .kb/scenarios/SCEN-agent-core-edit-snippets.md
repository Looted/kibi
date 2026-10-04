---
title: Before an edit of requirement-linked code, every host says what the requirement must keep true and why
status: active
priority: should
tags:
  - hooks
  - snippets
  - agent-core
origin:
  kind: agent
  recorded_at: '2026-10-04T02:41:51.116Z'
id: SCEN-agent-core-edit-snippets
type: scenario
---
# Before an edit of requirement-linked code, every host says what the requirement must keep true and why

Given a file whose symbols implement a current requirement that links facts through `constrains`, `requires_property`, `requires_predicate` or `requires_rule` and an ADR decision
When an agent edits the file through Claude Code, Cursor, Codex, ZCode or OpenCode
Then the host's edit snippet, built by the shared `kibi-agent-core` builder within that host's size budget, says "`<REQ>` must keep true: ..." for up to two of those facts and "Decision: `<ADR>`".

Given the same file is read rather than edited
Then the snippet lists only the requirement and test lines.

Given the lead requirement is superseded, deprecated or retired
When the file is edited
Then the snippet has no "must keep true" or "Decision" lines.

Given Codex or ZCode already described the file in this session
When the agent edits it again
Then no snippet is repeated.

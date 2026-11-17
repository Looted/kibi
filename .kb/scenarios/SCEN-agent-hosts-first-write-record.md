---
title: Every host sends the first write of a rule to kb_record
status: active
expects: success
priority: must
tags:
  - kb-record
origin:
  kind: agent
  recorded_at: '2026-11-17T06:42:48.838Z'
id: SCEN-agent-hosts-first-write-record
type: scenario
---
Given a session whose prompt stated a rule, on Claude Code, Codex, Cursor, OpenCode, ZCode or with no harness, when the agent first changes a source file, then the capture template is a kb_record call (kibi record --input - without MCP) that names kb_upsert for modeling, kb_record is in the default MCP tool list, and a kb_record call counts as the requirement write the hook asks for.

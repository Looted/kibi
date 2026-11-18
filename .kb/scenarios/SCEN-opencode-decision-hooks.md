---
title: OpenCode notes a stated rule, stops a firm edit once and asks at idle
status: active
origin:
  kind: agent
  recorded_at: '2026-11-17T17:01:49.764Z'
id: SCEN-opencode-decision-hooks
type: scenario
---
Given a Kibi workspace in OpenCode whose computeTotal implements a firm requirement, when the person states a rule and the agent edits source, the edit result carries the rule note and the kb_record capture template once; when the agent first edits computeTotal the edit is stopped with the firm-edit notice and the same edit tried again goes through; when the session goes idle without a recorded rule, the plugin sends the capture request once, and a rule recorded through MCP or the CLI keeps it from asking.

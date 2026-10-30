---
title: kibi-codex hooks never deny a tool call, even for a firm or .kb edit
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:59:33.088Z'
id: SCEN-CASE-codex-kibi-plugin-v1-DENYING-HOOK
type: scenario
---
Given an opted-in workspace with a firm requirement, when the agent submits a rule-stating prompt, patches the firm code, patches other source, patches a file under .kb, calls a Kibi MCP tool and then stops, then no hook result denies the call or stops the session: PreToolUse returns at most allow, only Stop returns a block decision, and that block continues the turn.

This covers the value outside the set, a hook outcome other than reminder, warning or stop continuation such as a deny. packages/codex/tests/hook-runner.test.ts "no hook denies a tool call: firm edits, .kb edits and Kibi calls go ahead, and Stop only continues the turn" exercises it.

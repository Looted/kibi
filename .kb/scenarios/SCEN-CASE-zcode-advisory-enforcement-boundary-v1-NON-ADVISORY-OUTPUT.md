---
title: A kibi-zcode hook facing a write to a requirement file still answers only with advice
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:01:09.269Z'
id: SCEN-CASE-zcode-advisory-enforcement-boundary-v1-NON-ADVISORY-OUTPUT
type: scenario
---
Given a configured workspace where kibi-zcode is installed and enabled, when its hooks receive SessionStart, a PreToolUse write to a requirement file under .kb, PostToolUse and Stop, then every output lets the tool call continue and carries no decision or permissionDecision field, neither at the top level nor in hookSpecificOutput, so no output turns into a hard deny.

The test case "hook outputs are advisory and never hard deny" in packages/zcode/tests/hook-runner.test.ts exercises it; the proof run executes the whole ZCode test directory. It covers the value past the bound, `gt 0`, of non-advisory outputs while kibi-zcode is installed and enabled.
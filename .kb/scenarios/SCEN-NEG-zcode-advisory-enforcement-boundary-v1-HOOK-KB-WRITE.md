---
title: kibi-zcode hook events leave the knowledge base files untouched
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:11:49.482Z'
id: SCEN-NEG-zcode-advisory-enforcement-boundary-v1-HOOK-KB-WRITE
type: scenario
---
Given a configured workspace with a requirement under .kb, when the kibi-zcode hooks receive SessionStart, a PreToolUse write to that requirement, PostToolUse events for an MCP call and a write, and Stop, then the .kb directory is byte-for-byte the same after every event.

This is the failure side of the advisory boundary: the adapter observes and advises, and only the MCP tools and git hooks may change the knowledge base. packages/zcode/tests/hook-runner.test.ts "hook events never mutate .kb contents" exercises it.

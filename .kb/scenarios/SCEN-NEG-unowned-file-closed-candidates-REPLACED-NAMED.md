---
title: The note for an unlinked file leaves out a closed requirement a current one supersedes
status: active
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-11T17:33:51.384Z'
id: SCEN-NEG-unowned-file-closed-candidates-REPLACED-NAMED
type: scenario
---
Given a closed requirement whose title shares a file's path words and a current requirement that supersedes it, through a front matter link or a relationship shard, when an agent edits that file and no symbol in it is linked, the hook note and an impact kb_check scoped to it do not name the closed requirement. packages/claude/tests/hook-runner.test.ts "an unowned source file's note names closed requirements last and leaves out replaced ones" exercises the Claude Code hook command, and packages/cli/tests/traceability/unowned-files.test.ts the impact check.

This is the failure side of the closed candidate requirement.
---
title: The kibi-claude MCP endpoint serves no tools for a project that owns no Kibi manifest
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:17:54.342Z'
id: SCEN-NEG-claude-code-kibi-plugin-v1-UNOWNED-PROJECT-TOOLS
type: scenario
---
Given CLAUDE_PROJECT_DIR pointing at a repository without .kb/manifest.json while the working directory is a Kibi workspace, when the kibi-claude MCP launcher starts, then it identifies as the launcher and lists no tools.

This is the failure side of workspace ownership: the adapter must not offer Kibi tools for a project that has not adopted Kibi. packages/claude/tests/distribution.test.ts "serves no tools when the project dir does not own .kb/manifest.json" exercises it.

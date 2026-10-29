---
title: The Codex launcher does not start a non-local kibi-mcp when the configured workspace lacks one
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:06:16.779Z'
id: SCEN-NEG-codex-consumer-local-mcp-registration-v1-NON-LOCAL-MCP
type: scenario
---
Given a Codex workspace with .kb/manifest.json but no project-local kibi-mcp and no npx on PATH, when Codex starts the kibi-codex inline launcher and lists tools, then the launcher refuses to start any other kibi-mcp: it completes the handshake with zero tools and instructions naming kibi-mcp as the missing piece.

This is the failure side of consumer-local MCP registration: a missing local server must not be replaced by a downloaded or global one of another version. documentation/tests/e2e/packed/codex-plugin.test.ts "starts cleanly with guidance when the configured workspace lacks kibi-mcp" exercises it.

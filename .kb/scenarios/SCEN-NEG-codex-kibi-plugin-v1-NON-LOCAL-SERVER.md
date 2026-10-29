---
title: The kibi-codex launcher starts no other kibi-mcp when the workspace lacks the project-local one
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:09:43.624Z'
id: SCEN-NEG-codex-kibi-plugin-v1-NON-LOCAL-SERVER
type: scenario
---
Given a Kibi workspace that has .kb/manifest.json but no installed kibi-mcp, and no npx on PATH, when Codex starts the packed kibi-codex launcher and asks for its tools, then the launcher refuses to fall back to any other server: it answers the handshake itself with zero tools and instructions that name kibi-mcp.

This is the failure side of the project-local launcher: a server from the registry or another install could serve a knowledge base with the wrong version. documentation/tests/e2e/packed/codex-plugin.test.ts "starts cleanly with guidance when the configured workspace lacks kibi-mcp" exercises it.

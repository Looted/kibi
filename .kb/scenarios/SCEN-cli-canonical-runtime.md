---
title: Runtime discovery, authoring, ignore, and activation use canonical .kb lanes
status: active
tags:
  - cli
  - mcp
  - cursor
  - canonical-layout
id: SCEN-cli-canonical-runtime
type: scenario
---
Given a repository that uses the canonical `.kb/` contract, when sync discovers sources, upserts write entities, ignore policy scans the tree, MCP classifies activation, or the Cursor hook checks readiness, then authored knowledge lanes and `.kb/manifest.json` are used, leftover `config.json` path overrides are ignored, and derived `.kb` trees including migrations stay out of knowledge and proof surfaces.

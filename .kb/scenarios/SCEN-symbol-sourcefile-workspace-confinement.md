---
title: Coordinate refresh refuses outside-workspace sourceFile paths
status: active
tags:
  - security
  - symbols
  - coordinates
priority: must
id: SCEN-symbol-sourcefile-workspace-confinement
type: scenario
---
# Coordinate refresh refuses outside-workspace sourceFile paths

Given a symbol whose `sourceFile` is an absolute path outside the workspace (or a `..` escape),
When coordinate refresh runs,
Then no outside file content is read and no coordinates are published for that symbol.

## Context

Acceptance scenario for the mcp-safeguard path-escape disclosure. Covers absolute paths and `..` escapes so upsert-triggered coordinate refresh cannot probe outside the repository.

---
id: SCEN-mcp-search-discovery
title: Agent discovers, validates, and traverses Kibi knowledge without leaving the public surface
status: active
created_at: 2026-03-22T00:00:00Z
updated_at: 2026-03-22T18:30:00Z
source: docs/superpowers/specs/2026-03-22-discovery-bundle-design.md
tags:
  - mcp
  - cli
  - discovery
links:
  - type: verified_by
    target: TEST-mcp-search-discovery
---

Given a synced Kibi repository with requirements, scenarios, tests, and symbols
When an agent needs exploratory discovery rather than exact ID lookup
Then it can use the public discovery surface to search markdown-backed knowledge, inspect freshness, find coverage gaps, and traverse bounded relationships without invoking raw inference or direct filesystem fallbacks.

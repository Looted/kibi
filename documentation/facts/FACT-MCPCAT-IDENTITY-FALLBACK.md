---
id: FACT-MCPCAT-IDENTITY-FALLBACK
title: MCPcat Identify Uses Stable Anonymous Fallback
status: active
created_at: 2026-02-20T20:34:17Z
updated_at: 2026-02-20T20:34:17Z
source: documentation/facts/FACT-MCPCAT-IDENTITY-FALLBACK.md
tags: [mcp, telemetry, mcpcat]
---

When `MCPCAT_USER_ID` is unset, kibi-mcp derives a stable anonymous identity from host/user/repo context and hashes it before sending to MCPcat.

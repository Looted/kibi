---
id: REQ-mcp-kibi-briefing-v1
title: "MCP-Owned Kibi Briefings v1: Read-Only, Deterministic Start-Task Briefing Generation"
status: open
created_at: 2026-04-20T00:00:00Z
updated_at: 2026-04-20T00:00:00Z
source: documentation/requirements/REQ-mcp-kibi-briefing-v1.md
priority: must
tags:
  - mcp
  - briefing
  - start-task
  - guidance
links:
  - type: specified_by
    target: SCEN-mcp-kibi-briefing-v1
  - type: verified_by
    target: TEST-mcp-kibi-briefing-v1
  - type: relates_to
    target: ADR-018
  - type: relates_to
    target: REQ-opencode-agent-mcp-only
---

The Kibi MCP server must provide a start-task briefing workflow through a public, read-only tool named `kb_briefing_generate`.

1. **Start-Task Scope Only**: V1 must be limited to start-task briefing generation. It must not describe or implement pre-review memory diff behavior.
2. **Read-Only MCP Ownership**: `kb_briefing_generate` must be MCP-owned and strictly read-only. It must not mutate `.kb/`, documentation files, or any runtime state.
3. **Inputs and Validation**: The tool input surface must accept `taskText`, `sourceFiles`, and `seedIds`. At least one of these inputs must be present and non-empty after normalization.
4. **Deterministic Output**: The tool must return deterministic briefing output for identical normalized inputs and repository state, including stable entity ordering, citation ordering, and prompt text.
5. **Citation-Backed Content**: Any returned constraint, regression-risk, or summary claim must be grounded in cited Kibi entities. Uncited claims must be omitted rather than guessed.
6. **Activation and Freshness Gating**: V1 must generate a briefing only when posture and KB freshness are authoritative enough to support citation-backed output.
7. **Fail-Closed Degraded State**: Unsupported posture, stale state, dirty state, or weak evidence must return `briefingState: "no_briefing"` with no speculative briefing content.
8. **V1 Output Contract**: The read-only artifact must preserve activation and freshness metadata while exposing a compact start-task briefing surface suitable for OpenCode consumption.

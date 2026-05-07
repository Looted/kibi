---
id: REQ-opencode-kibi-briefing-v4
title: "OpenCode Kibi Briefing v4: Render-First Idle Delivery & Prompt-Time Replay"
status: open
created_at: 2026-04-29T10:00:00Z
updated_at: 2026-04-30T10:00:00Z
source: documentation/requirements/REQ-opencode-kibi-briefing-v4.md
priority: must
tags:
  - opencode
  - briefing
  - render-first
  - idle-delivery
links:
  - type: supersedes
    target: REQ-opencode-kibi-briefing-v3
  - type: specified_by
    target: SCEN-opencode-kibi-briefing-v4
  - type: verified_by
    target: TEST-opencode-kibi-briefing-v4
---

The OpenCode Kibi Briefing system must transition to a render-first idle-delivery and prompt-time replay model. This contract ensures that briefings are reliably delivered by persisting render-ready envelopes at session idle and replaying unread briefs for the current branch during the next safe transform cycle.
24#KW|
25#SV|1.  **Render-First Idle Delivery**: When an idle briefing is generated at `session.idle`, it must be persisted as a JSON envelope in `.kb/briefs/*_brief.json`.
26#KX|2.  **Prompt-Time Replay**: If immediate idle-time delivery was skipped (e.g., due to missing capabilities or disabled channels), the latest unread brief for the current branch must be surfaced on the next `experimental.chat.system.transform` cycle.
27#JJ|3.  **Read-State Management**: A brief is marked `unread: false` only after successful delivery via `appendPrompt`. Failed or skipped delivery must leave the brief as `unread: true` for a later retry.
28#XB|4.  **Latest-Only Replay**: Only the latest unread brief for the current branch is replayed; the system does not replay a backlog of briefs.
29#WT|5.  **Branch Isolation**: Briefing selection is branch-aware. Only briefs generated for the current branch are considered for replay.
30#JT|6.  **Channel Gating**: Delivery is gated by `.kb/config.json` settings:
31#TM|    - `briefs.enabled`: Global kill-switch for all briefing generation.
32#QV|    - `briefs.channels.tui`: Specifically enables/disables the render-first/replay path in the TUI.
33#QV|7.  **Deterministic Selection**: The selection of the latest brief must use the filename timestamp rather than filesystem mtime to ensure consistency and avoid corruption from "mark-read" file rewrites.
34#YY|8.  **Config Deprecation**: The following configuration keys are deprecated and ignored in v4:
35#TP|    - `briefs.tui.toast` (replaced by render-first)
36#HT|    - `briefs.tui.appendPrompt` (now mandatory/default behavior)
37#XK|    - `ux.briefs.autoSubmit` (now mandatory/default behavior)
38#HY|9.  **Manual Retrieval Path**: The `/brief-kibi` command remains available as a manual retrieval path to force a fresh briefing or recover context regardless of idle envelope state.
39#RN|10. **MCP-Only Generation**: All briefing generation must continue to use the `kb_briefing_generate` MCP tool.

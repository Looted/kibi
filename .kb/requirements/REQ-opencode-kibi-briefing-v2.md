---
id: REQ-opencode-kibi-briefing-v2
title: "OpenCode Kibi Briefings v2: Auto-Show with Prompt-Block Rendering"
status: superseded
created_at: 2026-04-23T00:00:00Z
updated_at: 2026-04-23T00:00:00Z
source: documentation/requirements/REQ-opencode-kibi-briefing-v2.md
priority: must
tags:
  - opencode
  - briefing
  - guidance
  - auto-show
links:
  - type: supersedes
    target: REQ-opencode-kibi-briefing-v1
  - type: depends_on
    target: REQ-mcp-kibi-briefing-v1
  - type: specified_by
    target: SCEN-opencode-kibi-briefing-v2
  - type: verified_by
    target: TEST-opencode-kibi-briefing-v2
---

The OpenCode briefing experience must evolve from cue-only discovery to auto-show behavior for authoritative risky edit contexts, while preserving read-only MCP ownership and text-only prompt constraints.

1. **Auto-Show Behavior**: When authoritative risky cue conditions are met (authoritative posture, risky code-edit context), the plugin must automatically fetch briefing data from the background worker via the `file.edited` event path.
2. **Event-Path Injection**: Briefing data must NOT be fetched from `experimental.chat.system.transform`. The transform hook remains text-only and must only provide cues or summaries as fallback.
3. **Fallback Surface**: If a full prompt block cannot be rendered, the plugin must provide a toast notification plus a cached prompt block summary as a fallback.
4. **Manual Command Preservation**: The sanctioned `/brief-kibi` command must be preserved and remain functional in all contexts, including when an auto-briefing has already been shown.
5. **Cue Suppression**: When a non-empty, ready-state prompt block exists for the current context fingerprint, the plugin should suppress the manual `/brief-kibi` discovery cue to avoid redundancy.
6. **Toast Copy**: The plugin must use specific toast messaging:
   - Full prompt block ready: `"Kibi brief ready — summary added to guidance."`
   - TLdr fallback: `"Kibi brief summary added — use /brief-kibi for full details."`
   - Unavailable: `"Kibi brief unavailable — keeping /brief-kibi manual path."`
7. **Prompt Block Header**: Automatic briefing content in the prompt must use the header: `🧠 **Kibi briefing available**`.
8. **MCP Invariant**: MCP ownership of `kb_briefing_generate` is unchanged. The OpenCode plugin acts as a consumer and renderer of MCP-produced briefing artifacts.

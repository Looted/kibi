---
id: REQ-opencode-guidance-injection
title: "OpenCode Guidance Injection"
status: open
created_at: 2026-05-13T00:00:00Z
source: packages/opencode/src/prompt.ts
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - guidance
links:
  - type: implements
    target: SYM-buildPrompt
  - type: specified_by
    target: SCEN-opencode-guidance-injection
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
---

The plugin must inject context-aware Kibi guidance into the session flow:

1. Surface relevant requirements and traceability context to agents.
2. Limit guidance to at most one block per injection, capped at 5 bullets or 120 words.
3. Include targeted nudges for code traceability (`implements REQ-xxx`).
4. Provide file lifecycle context (create, edit, delete guidance).
5. Append completion reminders (`Run kb_check before completing...`) for behavior candidates.

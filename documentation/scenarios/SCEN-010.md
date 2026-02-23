---
id: SCEN-010
title: Agent queries full KB context for a source file before editing it
status: active
created_at: 2026-02-20T10:35:00.000Z
updated_at: 2026-02-20T10:35:00.000Z
priority: must
tags:
  - mcp
  - context
  - agent-workflow
links:
  - type: specified_by
    target: REQ-015
---

Steps:
1. Agent is about to edit src/auth/login.ts.
2. Agent calls kbcontext with sourceFile: "src/auth/login.ts".
3. Kibi returns entities linked to that file (requirements, symbols, ADRs).
4. Agent uses the context to understand what the file implements and what tests cover it.
5. After editing, agent runs kibi sync to update the KB.

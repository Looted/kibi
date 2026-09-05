---
id: REQ-opencode-guidance-injection
title: OpenCode Guidance Injection
status: open
created_at: 2026-05-13T00:00:00.000Z
source: packages/opencode/src/prompt.ts
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - guidance
links:
  - type: specified_by
    target: SCEN-opencode-guidance-injection
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
semantic_text: The plugin must inject context-aware Kibi guidance into the session flow:\n\nSurface relevant requirements and traceability context to agents.\nLimit guidance to at most one block per injection, capped at 5 bullets or 120 words.\nInclude targeted nudges for code traceability (`implements REQ-xxx`).\nProvide file lifecycle context (create, edit, delete guidance).\nAppend completion reminders (`Run kb_check before completing...`) for behavior candidates.
logic_claims:
  - CLAIM-866ED9C456D0F81B
semantic_clauses:
  - The plugin must inject context-aware Kibi guidance into the session flow:\n\nSurface relevant requirements and traceability context to agents.\nLimit guidance to at most one block per injection, capped at 5 bullets or 120 words.\nInclude targeted nudges for code traceability (`implements REQ-xxx`).\nProvide file lifecycle context (create, edit, delete guidance).\nAppend completion reminders (`Run kb_check before completing...`) for behavior candidates
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 932e7230a68c6488e9bcc2257ee810e90aef210c3a96dbaa629e282eeb434989
semantic_inventory:
  - claim_key: CLAIM-866ED9C456D0F81B
    claim_text: The plugin must inject context-aware Kibi guidance into the session flow:\n\nSurface relevant requirements and traceability context to agents.\nLimit guidance to at most one block per injection, capped at 5 bullets or 120 words.\nInclude targeted nudges for code traceability (`implements REQ-xxx`).\nProvide file lifecycle context (create, edit, delete guidance).\nAppend completion reminders (`Run kb_check before completing...`) for behavior candidates
    role: normative
    status: modeled
    span:
      start: 0
      end: 455
type: req
---

The plugin must inject context-aware Kibi guidance into the session flow:

1. Surface relevant requirements and traceability context to agents.
2. Limit guidance to at most one block per injection, capped at 5 bullets or 120 words.
3. Include targeted nudges for code traceability (`implements REQ-xxx`).
4. Provide file lifecycle context (create, edit, delete guidance).
5. Append completion reminders (`Run kb_check before completing...`) for behavior candidates.

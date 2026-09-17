---
id: REQ-opencode-kibi-briefing-v4
type: req
title: "OpenCode Kibi Briefing v4: Render-First Idle Delivery & Prompt-Time Replay"
status: closed
created_at: 2026-04-29T10:00:00.000Z
updated_at: 2026-04-30T10:00:00.000Z
source: documentation/requirements/REQ-opencode-kibi-briefing-v4.md
priority: must
tags:
  - opencode
  - briefing
  - render-first
  - idle-delivery
  - historical-status:superseded
links:
  - type: supersedes
    target: REQ-opencode-kibi-briefing-v3
  - type: specified_by
    target: SCEN-opencode-kibi-briefing-v4
  - type: verified_by
    target: TEST-opencode-kibi-briefing-v4
semantic_text: >-
  The OpenCode Kibi Briefing system must transition to a render-first
  idle-delivery and prompt-time replay model. This contract ensures that
  briefings are reliably delivered by persisting render-ready envelopes at
  session idle and replaying unread briefs for the current branch during the
  next safe transform cycle.

  24#KW|

  25#SV|1.  **Render-First Idle Delivery**: When an idle briefing is generated
  at `session.idle`, it must be persisted as a JSON envelope in
  `.kb/briefs/*_brief.json`.

  26#KX|2.  **Prompt-Time Replay**: If immediate idle-time delivery was skipped
  (e.g., due to missing capabilities or disabled channels), the latest unread
  brief for the current branch must be surfaced on the next
  `experimental.chat.system.transform` cycle.

  27#JJ|3.  **Read-State Management**: A brief is marked `unread: false` only
  after successful delivery via `appendPrompt`. Failed or skipped delivery must
  leave the brief as `unread: true` for a later retry.

  28#XB|4.  **Latest-Only Replay**: Only the latest unread brief for the current
  branch is replayed; the system does not replay a backlog of briefs.

  29#WT|5.  **Branch Isolation**: Briefing selection is branch-aware. Only
  briefs generated for the current branch are considered for replay.

  30#JT|6.  **Channel Gating**: Delivery is gated by `.kb/config.json` settings:

  31#TM|    - `briefs.enabled`: Global kill-switch for all briefing generation.

  32#QV|    - `briefs.channels.tui`: Specifically enables/disables the
  render-first/replay path in the TUI.

  33#QV|7.  **Deterministic Selection**: The selection of the latest brief must
  use the filename timestamp rather than filesystem mtime to ensure consistency
  and avoid corruption from "mark-read" file rewrites.

  34#YY|8.  **Config Deprecation**: The following configuration keys are
  deprecated and ignored in v4:

  35#TP|    - `briefs.tui.toast` (replaced by render-first)

  36#HT|    - `briefs.tui.appendPrompt` (now mandatory/default behavior)

  37#XK|    - `ux.briefs.autoSubmit` (now mandatory/default behavior)

  38#HY|9.  **Manual Retrieval Path**: The `/brief-kibi` command remains
  available as a manual retrieval path to force a fresh briefing or recover
  context regardless of idle envelope state.

  39#RN|10. **MCP-Only Generation**: All briefing generation must continue to
  use the `kb_briefing_generate` MCP tool.
proof_exempt: true
proof_exempt_reason: Historical requirement already retired as superseded before
  the test-quality audit; retained for provenance, outside current
  implementation proof scope.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 88f682372ff577e44c720be4b8813e600b8f308e5911f962704cbe5b542a15fe
semantic_inventory:
  - claim_key: CLAIM-9CF5953C56B3BBFB
    claim_text: The OpenCode Kibi Briefing system must transition to a render-first
      idle-delivery and prompt-time replay model
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 110
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: This normative clause has no deterministic strict-property or declared
      predicate grounding. Define its domain terms and predicate signature
      explicitly before grounding it; keep it unresolved instead of treating
      prose as logic-complete.
  - claim_key: CLAIM-496F3F32D67C82D6
    claim_text: This contract ensures that briefings are reliably delivered by
      persisting render-ready envelopes at session idle and replaying unread
      briefs for the current branch during the next safe transform cycle
    role: descriptive
    status: missing
    span:
      start: 112
      end: 312
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-8484455B14705379
    claim_text: 24#KW|
    role: descriptive
    status: missing
    span:
      start: 314
      end: 320
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-5682065792A75B53
    claim_text: "25#SV|1.  **Render-First Idle Delivery**: When an idle briefing is
      generated at `session.idle`, it must be persisted as a JSON envelope in
      `.kb/briefs/*_brief.json`"
    role: normative
    status: ontology_gap
    span:
      start: 321
      end: 485
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: This normative clause has no deterministic strict-property or declared
      predicate grounding. Define its domain terms and predicate signature
      explicitly before grounding it; keep it unresolved instead of treating
      prose as logic-complete.
  - claim_key: CLAIM-DB00E06F4B1D88A0
    claim_text: "26#KX|2.  **Prompt-Time Replay**: If immediate idle-time delivery
      was skipped (e.g., due to missing capabilities or disabled channels), the
      latest unread brief for the current branch must be surfaced on the next
      `experimental.chat.system.transform` cycle"
    role: normative
    status: ontology_gap
    span:
      start: 487
      end: 741
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: This normative clause has no deterministic strict-property or declared
      predicate grounding. Define its domain terms and predicate signature
      explicitly before grounding it; keep it unresolved instead of treating
      prose as logic-complete.
  - claim_key: CLAIM-83C8C8795272B920
    claim_text: "27#JJ|3.  **Read-State Management**: A brief is marked `unread:
      false` only after successful delivery via `appendPrompt`"
    role: descriptive
    status: missing
    span:
      start: 743
      end: 863
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-02422CCA9305C3BE
    claim_text: "Failed or skipped delivery must leave the brief as `unread: true`
      for a later retry"
    role: normative
    status: ontology_gap
    span:
      start: 865
      end: 948
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: This normative clause has no deterministic strict-property or declared
      predicate grounding. Define its domain terms and predicate signature
      explicitly before grounding it; keep it unresolved instead of treating
      prose as logic-complete.
  - claim_key: CLAIM-4FB71A9419F715DF
    claim_text: "28#XB|4.  **Latest-Only Replay**: Only the latest unread brief for
      the current branch is replayed"
    role: descriptive
    status: missing
    span:
      start: 950
      end: 1047
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-525151569D5DDA07
    claim_text: the system does not replay a backlog of briefs
    role: descriptive
    status: missing
    span:
      start: 1049
      end: 1095
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-A2CF26BE4CB630CC
    claim_text: "29#WT|5.  **Branch Isolation**: Briefing selection is branch-aware"
    role: descriptive
    status: missing
    span:
      start: 1097
      end: 1163
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-791B75E3876CF246
    claim_text: Only briefs generated for the current branch are considered for replay
    role: descriptive
    status: missing
    span:
      start: 1165
      end: 1235
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-EB6E61F6AB4B5F9F
    claim_text: "30#JT|6.  **Channel Gating**: Delivery is gated by
      `.kb/config.json` settings"
    role: descriptive
    status: missing
    span:
      start: 1237
      end: 1314
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-3D2437CDBDD8EFC8
    claim_text: "31#TM|    - `briefs.enabled`: Global kill-switch for all briefing
      generation"
    role: descriptive
    status: missing
    span:
      start: 1316
      end: 1392
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-574C60E3E14E1396
    claim_text: "32#QV|    - `briefs.channels.tui`: Specifically enables/disables
      the render-first/replay path in the TUI"
    role: descriptive
    status: missing
    span:
      start: 1394
      end: 1498
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-7AB3B8D9E7566B38
    claim_text: '33#QV|7.  **Deterministic Selection**: The selection of the latest
      brief must use the filename timestamp rather than filesystem mtime to
      ensure consistency and avoid corruption from "mark-read" file rewrites'
    role: normative
    status: ontology_gap
    span:
      start: 1500
      end: 1707
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: This normative clause has no deterministic strict-property or declared
      predicate grounding. Define its domain terms and predicate signature
      explicitly before grounding it; keep it unresolved instead of treating
      prose as logic-complete.
  - claim_key: CLAIM-563BE49109551A29
    claim_text: "34#YY|8.  **Config Deprecation**: The following configuration keys
      are deprecated and ignored in v4"
    role: descriptive
    status: missing
    span:
      start: 1709
      end: 1808
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-452C96DD3A0E6B3F
    claim_text: 35#TP|    - `briefs.tui.toast` (replaced by render-first)
    role: descriptive
    status: missing
    span:
      start: 1810
      end: 1867
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-E839F0444FD4F770
    claim_text: 36#HT|    - `briefs.tui.appendPrompt` (now mandatory/default behavior)
    role: descriptive
    status: missing
    span:
      start: 1868
      end: 1938
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-498D97FCBEB2E33A
    claim_text: 37#XK|    - `ux.briefs.autoSubmit` (now mandatory/default behavior)
    role: descriptive
    status: missing
    span:
      start: 1939
      end: 2006
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-B2E955F8C9D045ED
    claim_text: "38#HY|9.  **Manual Retrieval Path**: The `/brief-kibi` command
      remains available as a manual retrieval path to force a fresh briefing or
      recover context regardless of idle envelope state"
    role: descriptive
    status: missing
    span:
      start: 2007
      end: 2193
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-A17E1ACC337E3E30
    claim_text: "39#RN|10. **MCP-Only Generation**: All briefing generation must
      continue to use the `kb_briefing_generate` MCP tool"
    role: normative
    status: ontology_gap
    span:
      start: 2195
      end: 2310
    payload_hash: 68569b3ababf00da2802aa3c299aef9a63279e261f36c2176caaa85efcb2c279
    reason: This normative clause has no deterministic strict-property or declared
      predicate grounding. Define its domain terms and predicate signature
      explicitly before grounding it; keep it unresolved instead of treating
      prose as logic-complete.
logic_claims:
  - CLAIM-9CF5953C56B3BBFB
  - CLAIM-496F3F32D67C82D6
  - CLAIM-8484455B14705379
  - CLAIM-5682065792A75B53
  - CLAIM-DB00E06F4B1D88A0
  - CLAIM-83C8C8795272B920
  - CLAIM-02422CCA9305C3BE
  - CLAIM-4FB71A9419F715DF
  - CLAIM-525151569D5DDA07
  - CLAIM-A2CF26BE4CB630CC
  - CLAIM-791B75E3876CF246
  - CLAIM-EB6E61F6AB4B5F9F
  - CLAIM-3D2437CDBDD8EFC8
  - CLAIM-574C60E3E14E1396
  - CLAIM-7AB3B8D9E7566B38
  - CLAIM-563BE49109551A29
  - CLAIM-452C96DD3A0E6B3F
  - CLAIM-E839F0444FD4F770
  - CLAIM-498D97FCBEB2E33A
  - CLAIM-B2E955F8C9D045ED
  - CLAIM-A17E1ACC337E3E30
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

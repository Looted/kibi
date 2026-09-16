---
id: REQ-vscode-kibi-briefing-v2
title: 'VS Code Kibi Briefing v2: Render-First Auto-Open Contract'
status: closed
created_at: 2026-04-29T00:00:00.000Z
updated_at: 2026-04-29T00:00:00.000Z
source: documentation/requirements/REQ-vscode-kibi-briefing-v2.md
priority: must
tags:
  - vscode
  - briefing
  - auto-open
  - channel-gating
  - historical-status:superseded
links:
  - type: supersedes
    target: REQ-vscode-kibi-briefing-v1
  - type: specified_by
    target: SCEN-vscode-kibi-briefing-v2
  - type: verified_by
    target: TEST-vscode-kibi-briefing-v2
semantic_text: |-
  The VS Code Kibi extension must support a render-first auto-open contract for idle briefings, providing immediate visibility of contextual guidance when unread briefs are detected.

  **Auto-Open Behavior**: When a new unread idle brief is detected and `briefs.channels.vscode` is enabled, the VS Code extension must automatically open the brief document in a new editor tab.
  This behavior replaces the notification-first "View Brief" click requirement from v1.
  Automatic opening is only triggered for unread briefs.

  **Briefing Content**: The rendered document must include the full briefing body (`briefing.promptBlock`) and summary.

  **Channel Gating**: Auto-open behavior must respect the shared configuration in `.kb/config.json`:
  `briefs.enabled`: Master switch for all brief functionality.
  `briefs.channels.vscode`: VS Code channel toggle. If false, automatic opening is suppressed.

  **Manual Retrieval**: Users must still be able to retrieve and view briefs manually via:
  The `kibi.showLatestBrief` command (VS Code Command Palette).
  The `/brief-kibi` slash command in OpenCode.

  **Graceful Degradation**: If brief generation fails, the KB is uninitialized, or the brief file is malformed, the extension must fail silently without crashing the VS Code host.
proof_exempt: true
proof_exempt_reason: Historical requirement already retired as superseded before the test-quality audit; retained for provenance, outside current implementation proof scope.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ec8c9f025d537e656aa51e2a13b3308a30aca3d44dfdd1cdc49e76b612fa75e9
semantic_inventory:
  - claim_key: CLAIM-5D4E1F1AD3ABCDA5
    claim_text: The VS Code Kibi extension must support a render-first auto-open contract for idle briefings, providing immediate visibility of contextual guidance when unread briefs are detected
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 179
    payload_hash: 366b3bb5f5755499ed1331bd3c524b6391ea5ac309955eb1a17e13e45bd0e6fb
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-B53BE6A122C25441
    claim_text: '**Auto-Open Behavior**: When a new unread idle brief is detected and `briefs.channels.vscode` is enabled, the VS Code extension must automatically open the brief document in a new editor tab'
    role: normative
    status: ontology_gap
    span:
      start: 182
      end: 372
    payload_hash: 366b3bb5f5755499ed1331bd3c524b6391ea5ac309955eb1a17e13e45bd0e6fb
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-C6D9A495AD340ADC
    claim_text: This behavior replaces the notification-first "View Brief" click requirement from v1
    role: descriptive
    status: missing
    span:
      start: 374
      end: 458
    payload_hash: 366b3bb5f5755499ed1331bd3c524b6391ea5ac309955eb1a17e13e45bd0e6fb
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-0F3AE0081399A1E5
    claim_text: Automatic opening is only triggered for unread briefs
    role: descriptive
    status: missing
    span:
      start: 460
      end: 513
    payload_hash: 366b3bb5f5755499ed1331bd3c524b6391ea5ac309955eb1a17e13e45bd0e6fb
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-A5C22EE941AEF823
    claim_text: '**Briefing Content**: The rendered document must include the full briefing body (`briefing.promptBlock`) and summary'
    role: normative
    status: ontology_gap
    span:
      start: 516
      end: 632
    payload_hash: 366b3bb5f5755499ed1331bd3c524b6391ea5ac309955eb1a17e13e45bd0e6fb
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-7FECFED1EA3DFC0F
    claim_text: '**Channel Gating**: Auto-open behavior must respect the shared configuration in `.kb/config.json`'
    role: normative
    status: ontology_gap
    span:
      start: 635
      end: 732
    payload_hash: 366b3bb5f5755499ed1331bd3c524b6391ea5ac309955eb1a17e13e45bd0e6fb
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-64DDB0367BBFEF6E
    claim_text: '`briefs.enabled`: Master switch for all brief functionality'
    role: descriptive
    status: missing
    span:
      start: 734
      end: 793
    payload_hash: 366b3bb5f5755499ed1331bd3c524b6391ea5ac309955eb1a17e13e45bd0e6fb
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-43A1E9F26FCC8E3F
    claim_text: '`briefs.channels.vscode`: VS Code channel toggle'
    role: descriptive
    status: missing
    span:
      start: 795
      end: 843
    payload_hash: 366b3bb5f5755499ed1331bd3c524b6391ea5ac309955eb1a17e13e45bd0e6fb
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-E6FF88E9B506BA82
    claim_text: If false, automatic opening is suppressed
    role: condition
    status: ontology_gap
    span:
      start: 845
      end: 886
    payload_hash: 366b3bb5f5755499ed1331bd3c524b6391ea5ac309955eb1a17e13e45bd0e6fb
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-43ABD94E035D0542
    claim_text: '**Manual Retrieval**: Users must still be able to retrieve and view briefs manually via'
    role: normative
    status: ontology_gap
    span:
      start: 889
      end: 976
    payload_hash: 366b3bb5f5755499ed1331bd3c524b6391ea5ac309955eb1a17e13e45bd0e6fb
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-6C07F8A269CF4D82
    claim_text: The `kibi.showLatestBrief` command (VS Code Command Palette)
    role: descriptive
    status: missing
    span:
      start: 978
      end: 1038
    payload_hash: 366b3bb5f5755499ed1331bd3c524b6391ea5ac309955eb1a17e13e45bd0e6fb
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-794B2C3A835B0346
    claim_text: The `/brief-kibi` slash command in OpenCode
    role: descriptive
    status: missing
    span:
      start: 1040
      end: 1083
    payload_hash: 366b3bb5f5755499ed1331bd3c524b6391ea5ac309955eb1a17e13e45bd0e6fb
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-A752F96513BCA21C
    claim_text: '**Graceful Degradation**: If brief generation fails, the KB is uninitialized, or the brief file is malformed, the extension must fail silently without crashing the VS Code host'
    role: normative
    status: ontology_gap
    span:
      start: 1086
      end: 1262
    payload_hash: 366b3bb5f5755499ed1331bd3c524b6391ea5ac309955eb1a17e13e45bd0e6fb
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
logic_claims:
  - CLAIM-5D4E1F1AD3ABCDA5
  - CLAIM-B53BE6A122C25441
  - CLAIM-C6D9A495AD340ADC
  - CLAIM-0F3AE0081399A1E5
  - CLAIM-A5C22EE941AEF823
  - CLAIM-7FECFED1EA3DFC0F
  - CLAIM-64DDB0367BBFEF6E
  - CLAIM-43A1E9F26FCC8E3F
  - CLAIM-E6FF88E9B506BA82
  - CLAIM-43ABD94E035D0542
  - CLAIM-6C07F8A269CF4D82
  - CLAIM-794B2C3A835B0346
  - CLAIM-A752F96513BCA21C
type: req
---

The VS Code Kibi extension must support a render-first auto-open contract for idle briefings, providing immediate visibility of contextual guidance when unread briefs are detected.

1.  **Auto-Open Behavior**: When a new unread idle brief is detected and `briefs.channels.vscode` is enabled, the VS Code extension must automatically open the brief document in a new editor tab.
    - This behavior replaces the notification-first "View Brief" click requirement from v1.
    - Automatic opening is only triggered for unread briefs.

2.  **Briefing Content**: The rendered document must include the full briefing body (`briefing.promptBlock`) and summary.

3.  **Channel Gating**: Auto-open behavior must respect the shared configuration in `.kb/config.json`:
    - `briefs.enabled`: Master switch for all brief functionality.
    - `briefs.channels.vscode`: VS Code channel toggle. If false, automatic opening is suppressed.

4.  **Manual Retrieval**: Users must still be able to retrieve and view briefs manually via:
    - The `kibi.showLatestBrief` command (VS Code Command Palette).
    - The `/brief-kibi` slash command in OpenCode.

5.  **Graceful Degradation**: If brief generation fails, the KB is uninitialized, or the brief file is malformed, the extension must fail silently without crashing the VS Code host.

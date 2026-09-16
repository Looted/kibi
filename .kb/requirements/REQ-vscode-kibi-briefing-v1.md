---
id: REQ-vscode-kibi-briefing-v1
title: 'VS Code Kibi Briefing v1: Channel-Gated Brief Notifications'
status: closed
created_at: 2026-04-26T00:00:00.000Z
updated_at: 2026-04-26T00:00:00.000Z
source: documentation/requirements/REQ-vscode-kibi-briefing-v1.md
priority: must
tags:
  - vscode
  - briefing
  - notifications
  - channel-gating
  - historical-status:superseded
links:
  - type: specified_by
    target: SCEN-vscode-kibi-briefing-v1
  - type: verified_by
    target: TEST-vscode-kibi-briefing-v1
semantic_text: |-
  The VS Code Kibi extension must support brief notifications gated by shared config to provide contextual guidance while respecting project-level policy.

  **Channel Gating**: Brief notifications in VS Code must respect the shared `briefs.channels.vscode` flag in `.kb/config.json`. When disabled, no automatic brief notifications appear.

  **Shared Policy**: The brief system uses `.kb/config.json` as the source of truth for channel enablement:
  `briefs.enabled`: Master switch for all brief functionality
  `briefs.channels.vscode`: VS Code channel toggle
  `briefs.channels.tui`: OpenCode TUI channel toggle

  **Manual Access**: When VS Code channel is disabled or notifications are suppressed, users can still retrieve briefs manually via the `/brief-kibi` slash command in OpenCode.

  **Notification Behavior**: When enabled, brief notifications appear as toast/notification in the VS Code UI with brief summary content.

  **Graceful Degradation**: If brief generation fails or KB is uninitialized, the VS Code extension must not crash; it simply skips notification delivery.
proof_exempt: true
proof_exempt_reason: Historical requirement already retired as superseded before the test-quality audit; retained for provenance, outside current implementation proof scope.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: aae0ed364c74fbfa77368d96d8a54f583d36b28f0e2b38c20162fff5cb86c712
semantic_inventory:
  - claim_key: CLAIM-22A923100E186112
    claim_text: The VS Code Kibi extension must support brief notifications gated by shared config to provide contextual guidance while respecting project-level policy
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 151
    payload_hash: 80a2fe3cf6bfbd27e6bf09caa463922cbca46e3404bad536a119cfdac265ac5e
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-CE2E41362E2419C8
    claim_text: '**Channel Gating**: Brief notifications in VS Code must respect the shared `briefs.channels.vscode` flag in `.kb/config.json`'
    role: normative
    status: ontology_gap
    span:
      start: 154
      end: 279
    payload_hash: 80a2fe3cf6bfbd27e6bf09caa463922cbca46e3404bad536a119cfdac265ac5e
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-21741750603F7AFA
    claim_text: When disabled, no automatic brief notifications appear
    role: condition
    status: ontology_gap
    span:
      start: 281
      end: 335
    payload_hash: 80a2fe3cf6bfbd27e6bf09caa463922cbca46e3404bad536a119cfdac265ac5e
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-8E972EF9D370B19F
    claim_text: '**Shared Policy**: The brief system uses `.kb/config.json` as the source of truth for channel enablement'
    role: descriptive
    status: missing
    span:
      start: 338
      end: 442
    payload_hash: 80a2fe3cf6bfbd27e6bf09caa463922cbca46e3404bad536a119cfdac265ac5e
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-64DDB0367BBFEF6E
    claim_text: '`briefs.enabled`: Master switch for all brief functionality'
    role: descriptive
    status: missing
    span:
      start: 444
      end: 503
    payload_hash: 80a2fe3cf6bfbd27e6bf09caa463922cbca46e3404bad536a119cfdac265ac5e
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-43A1E9F26FCC8E3F
    claim_text: '`briefs.channels.vscode`: VS Code channel toggle'
    role: descriptive
    status: missing
    span:
      start: 504
      end: 552
    payload_hash: 80a2fe3cf6bfbd27e6bf09caa463922cbca46e3404bad536a119cfdac265ac5e
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-86B60C390D3765CE
    claim_text: '`briefs.channels.tui`: OpenCode TUI channel toggle'
    role: descriptive
    status: missing
    span:
      start: 553
      end: 603
    payload_hash: 80a2fe3cf6bfbd27e6bf09caa463922cbca46e3404bad536a119cfdac265ac5e
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-291A002103863CAB
    claim_text: '**Manual Access**: When VS Code channel is disabled or notifications are suppressed, users can still retrieve briefs manually via the `/brief-kibi` slash command in OpenCode'
    role: normative
    status: ontology_gap
    span:
      start: 605
      end: 778
    payload_hash: 80a2fe3cf6bfbd27e6bf09caa463922cbca46e3404bad536a119cfdac265ac5e
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-3EE41615B98C8800
    claim_text: '**Notification Behavior**: When enabled, brief notifications appear as toast/notification in the VS Code UI with brief summary content'
    role: normative
    status: ontology_gap
    span:
      start: 781
      end: 915
    payload_hash: 80a2fe3cf6bfbd27e6bf09caa463922cbca46e3404bad536a119cfdac265ac5e
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-1BD09D1C26F16854
    claim_text: '**Graceful Degradation**: If brief generation fails or KB is uninitialized, the VS Code extension must not crash'
    role: normative
    status: ontology_gap
    span:
      start: 918
      end: 1030
    payload_hash: 80a2fe3cf6bfbd27e6bf09caa463922cbca46e3404bad536a119cfdac265ac5e
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-FA1EDB0EB18A3163
    claim_text: it simply skips notification delivery
    role: descriptive
    status: missing
    span:
      start: 1032
      end: 1069
    payload_hash: 80a2fe3cf6bfbd27e6bf09caa463922cbca46e3404bad536a119cfdac265ac5e
    reason: No accepted typed interpretation grounds this assertive proposition.
logic_claims:
  - CLAIM-22A923100E186112
  - CLAIM-CE2E41362E2419C8
  - CLAIM-21741750603F7AFA
  - CLAIM-8E972EF9D370B19F
  - CLAIM-64DDB0367BBFEF6E
  - CLAIM-43A1E9F26FCC8E3F
  - CLAIM-86B60C390D3765CE
  - CLAIM-291A002103863CAB
  - CLAIM-3EE41615B98C8800
  - CLAIM-1BD09D1C26F16854
  - CLAIM-FA1EDB0EB18A3163
type: req
---

The VS Code Kibi extension must support brief notifications gated by shared config to provide contextual guidance while respecting project-level policy.

1.  **Channel Gating**: Brief notifications in VS Code must respect the shared `briefs.channels.vscode` flag in `.kb/config.json`. When disabled, no automatic brief notifications appear.

2.  **Shared Policy**: The brief system uses `.kb/config.json` as the source of truth for channel enablement:
    - `briefs.enabled`: Master switch for all brief functionality
    - `briefs.channels.vscode`: VS Code channel toggle
    - `briefs.channels.tui`: OpenCode TUI channel toggle

3.  **Manual Access**: When VS Code channel is disabled or notifications are suppressed, users can still retrieve briefs manually via the `/brief-kibi` slash command in OpenCode.

4.  **Notification Behavior**: When enabled, brief notifications appear as toast/notification in the VS Code UI with brief summary content.

5.  **Graceful Degradation**: If brief generation fails or KB is uninitialized, the VS Code extension must not crash; it simply skips notification delivery.

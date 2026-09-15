---
id: REQ-opencode-kibi-briefing-v2
title: 'OpenCode Kibi Briefings v2: Auto-Show with Prompt-Block Rendering'
status: closed
created_at: 2026-04-23T00:00:00.000Z
updated_at: 2026-04-23T00:00:00.000Z
source: documentation/requirements/REQ-opencode-kibi-briefing-v2.md
priority: must
tags:
  - opencode
  - briefing
  - guidance
  - auto-show
  - historical-status:superseded
links:
  - type: supersedes
    target: REQ-opencode-kibi-briefing-v1
  - type: depends_on
    target: REQ-mcp-kibi-briefing-v1
  - type: specified_by
    target: SCEN-opencode-kibi-briefing-v2
  - type: verified_by
    target: TEST-opencode-kibi-briefing-v2
semantic_text: |-
  The OpenCode briefing experience must evolve from cue-only discovery to auto-show behavior for authoritative risky edit contexts, while preserving read-only MCP ownership and text-only prompt constraints.

  **Auto-Show Behavior**: When authoritative risky cue conditions are met (authoritative posture, risky code-edit context), the plugin must automatically fetch briefing data from the background worker via the `file.edited` event path.
  **Event-Path Injection**: Briefing data must NOT be fetched from `experimental.chat.system.transform`. The transform hook remains text-only and must only provide cues or summaries as fallback.
  **Fallback Surface**: If a full prompt block cannot be rendered, the plugin must provide a toast notification plus a cached prompt block summary as a fallback.
  **Manual Command Preservation**: The sanctioned `/brief-kibi` command must be preserved and remain functional in all contexts, including when an auto-briefing has already been shown.
  **Cue Suppression**: When a non-empty, ready-state prompt block exists for the current context fingerprint, the plugin should suppress the manual `/brief-kibi` discovery cue to avoid redundancy.
  **Toast Copy**: The plugin must use specific toast messaging:
  Full prompt block ready: `"Kibi brief ready — summary added to guidance."`
  TLdr fallback: `"Kibi brief summary added — use /brief-kibi for full details."`
  Unavailable: `"Kibi brief unavailable — keeping /brief-kibi manual path."`
  **Prompt Block Header**: Automatic briefing content in the prompt must use the header: `🧠 **Kibi briefing available**`.
  **MCP Invariant**: MCP ownership of `kb_briefing_generate` is unchanged. The OpenCode plugin acts as a consumer and renderer of MCP-produced briefing artifacts.
proof_exempt: true
proof_exempt_reason: Historical requirement already retired as superseded before the test-quality audit; retained for provenance, outside current implementation proof scope.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 167a18f3267e6cb684a0e3b68f6e5f33ba52c9827330958e1af491c8636b6684
semantic_inventory:
  - claim_key: CLAIM-C4E191FFFDD70B50
    claim_text: The OpenCode briefing experience must evolve from cue-only discovery to auto-show behavior for authoritative risky edit contexts, while preserving read-only MCP ownership and text-only prompt constraints
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 203
    payload_hash: 56ae47140bb2eaf529385ea58d435c69b5dbba71a0d65ff6e7ba26605da21cd2
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-941D70347F89FDDD
    claim_text: '**Auto-Show Behavior**: When authoritative risky cue conditions are met (authoritative posture, risky code-edit context), the plugin must automatically fetch briefing data from the background worker via the `file.edited` event path'
    role: normative
    status: ontology_gap
    span:
      start: 206
      end: 437
    payload_hash: 56ae47140bb2eaf529385ea58d435c69b5dbba71a0d65ff6e7ba26605da21cd2
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-E48B982E262397BB
    claim_text: '**Event-Path Injection**: Briefing data must NOT be fetched from `experimental.chat.system.transform`'
    role: normative
    status: ontology_gap
    span:
      start: 439
      end: 540
    payload_hash: 56ae47140bb2eaf529385ea58d435c69b5dbba71a0d65ff6e7ba26605da21cd2
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-0F6F4DEDDBC119C1
    claim_text: The transform hook remains text-only and must only provide cues or summaries as fallback
    role: normative
    status: ontology_gap
    span:
      start: 542
      end: 630
    payload_hash: 56ae47140bb2eaf529385ea58d435c69b5dbba71a0d65ff6e7ba26605da21cd2
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-EFD605A725CA7589
    claim_text: '**Fallback Surface**: If a full prompt block cannot be rendered, the plugin must provide a toast notification plus a cached prompt block summary as a fallback'
    role: normative
    status: ontology_gap
    span:
      start: 632
      end: 790
    payload_hash: 56ae47140bb2eaf529385ea58d435c69b5dbba71a0d65ff6e7ba26605da21cd2
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-2401C4F5CB2E2ED7
    claim_text: '**Manual Command Preservation**: The sanctioned `/brief-kibi` command must be preserved and remain functional in all contexts, including when an auto-briefing has already been shown'
    role: normative
    status: ontology_gap
    span:
      start: 792
      end: 973
    payload_hash: 56ae47140bb2eaf529385ea58d435c69b5dbba71a0d65ff6e7ba26605da21cd2
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-CCA696E75F1BC97C
    claim_text: '**Cue Suppression**: When a non-empty, ready-state prompt block exists for the current context fingerprint, the plugin should suppress the manual `/brief-kibi` discovery cue to avoid redundancy'
    role: normative
    status: ontology_gap
    span:
      start: 975
      end: 1168
    payload_hash: 56ae47140bb2eaf529385ea58d435c69b5dbba71a0d65ff6e7ba26605da21cd2
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-8CF9025419E05691
    claim_text: '**Toast Copy**: The plugin must use specific toast messaging'
    role: normative
    status: ontology_gap
    span:
      start: 1170
      end: 1230
    payload_hash: 56ae47140bb2eaf529385ea58d435c69b5dbba71a0d65ff6e7ba26605da21cd2
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-BB444FB420921428
    claim_text: 'Full prompt block ready: `"Kibi brief ready — summary added to guidance."`'
    role: descriptive
    status: missing
    span:
      start: 1232
      end: 1308
    payload_hash: 56ae47140bb2eaf529385ea58d435c69b5dbba71a0d65ff6e7ba26605da21cd2
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-563AF25DBABD1FD8
    claim_text: 'TLdr fallback: `"Kibi brief summary added — use /brief-kibi for full details."`'
    role: descriptive
    status: missing
    span:
      start: 1309
      end: 1390
    payload_hash: 56ae47140bb2eaf529385ea58d435c69b5dbba71a0d65ff6e7ba26605da21cd2
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-235659E23B29AEDE
    claim_text: 'Unavailable: `"Kibi brief unavailable — keeping /brief-kibi manual path."`'
    role: descriptive
    status: missing
    span:
      start: 1391
      end: 1467
    payload_hash: 56ae47140bb2eaf529385ea58d435c69b5dbba71a0d65ff6e7ba26605da21cd2
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-E4953D44B5193666
    claim_text: '**Prompt Block Header**: Automatic briefing content in the prompt must use the header: `🧠 **Kibi briefing available**`'
    role: normative
    status: ontology_gap
    span:
      start: 1468
      end: 1589
    payload_hash: 56ae47140bb2eaf529385ea58d435c69b5dbba71a0d65ff6e7ba26605da21cd2
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-4A49064CE6F25F2D
    claim_text: '**MCP Invariant**: MCP ownership of `kb_briefing_generate` is unchanged'
    role: descriptive
    status: missing
    span:
      start: 1591
      end: 1662
    payload_hash: 56ae47140bb2eaf529385ea58d435c69b5dbba71a0d65ff6e7ba26605da21cd2
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-702ECEDAD1C491D9
    claim_text: The OpenCode plugin acts as a consumer and renderer of MCP-produced briefing artifacts
    role: descriptive
    status: missing
    span:
      start: 1664
      end: 1750
    payload_hash: 56ae47140bb2eaf529385ea58d435c69b5dbba71a0d65ff6e7ba26605da21cd2
    reason: No accepted typed interpretation grounds this assertive proposition.
logic_claims:
  - CLAIM-C4E191FFFDD70B50
  - CLAIM-941D70347F89FDDD
  - CLAIM-E48B982E262397BB
  - CLAIM-0F6F4DEDDBC119C1
  - CLAIM-EFD605A725CA7589
  - CLAIM-2401C4F5CB2E2ED7
  - CLAIM-CCA696E75F1BC97C
  - CLAIM-8CF9025419E05691
  - CLAIM-BB444FB420921428
  - CLAIM-563AF25DBABD1FD8
  - CLAIM-235659E23B29AEDE
  - CLAIM-E4953D44B5193666
  - CLAIM-4A49064CE6F25F2D
  - CLAIM-702ECEDAD1C491D9
type: req
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

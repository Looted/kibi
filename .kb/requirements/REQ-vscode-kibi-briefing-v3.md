---
id: REQ-vscode-kibi-briefing-v3
title: 'VS Code Kibi Briefing v3: Schema-2.0 Alignment & Deterministic Ordering'
status: closed
created_at: 2026-05-06T04:40:00.000Z
updated_at: 2026-05-06T04:40:00.000Z
source: documentation/requirements/REQ-vscode-kibi-briefing-v3.md
priority: must
tags:
  - vscode
  - briefing
  - schema-2.0
  - deterministic-ordering
  - historical-status:superseded
links:
  - type: supersedes
    target: REQ-vscode-kibi-briefing-v2
  - type: specified_by
    target: SCEN-vscode-kibi-briefing-v3
  - type: verified_by
    target: TEST-vscode-kibi-briefing-v3
semantic_text: |-
  The VS Code Kibi extension must align with the Schema-2.0 briefing envelope and implement deterministic filename-timestamp ordering for latest-brief selection.

  **Schema-2.0 Alignment**: The extension must support rendering briefings that follow the Schema-2.0 structure.
  It must correctly interpret `counts` and `changes` fields for display in the brief editor tab.
  It must handle the `changeNarrative` string array for the primary narrative block.

  **Deterministic Latest-Brief Selection**: Selection of the "latest" brief must use filename-timestamp ordering rather than filesystem modification time (`mtime`).
  Brief files are named using a sortable timestamp pattern (e.g., `brief-20260506-043000.json`).
  The extension must sort available brief files lexicographically by filename to determine the most recent one.
  This ensures consistent behavior across different environments and filesystems where `mtime` may be unreliable.

  **Auto-Open Preservation**: The render-first auto-open behavior established in v2 must be preserved and correctly triggered by the new deterministic selection logic.

  **Graceful Schema Fallback**: During the migration window, the extension should tolerate Schema-1.0 envelopes but apply Schema-2.0 display logic where possible.
proof_exempt: true
proof_exempt_reason: Historical requirement already retired as superseded before the test-quality audit; retained for provenance, outside current implementation proof scope.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ec4e34df9fb6f626d3a5738ea19f9ba69fc97050c72566c8fd9bf243beb0a307
semantic_inventory:
  - claim_key: CLAIM-77DD6F0C540DE884
    claim_text: The VS Code Kibi extension must align with the Schema-2.0 briefing envelope and implement deterministic filename-timestamp ordering for latest-brief selection
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 158
    payload_hash: 57205abfaf0c0cee0a706a94c5369b30bf150d8f0f2d957334c11beda6cb8f05
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-7D4F4A04A93F1C20
    claim_text: '**Schema-2.0 Alignment**: The extension must support rendering briefings that follow the Schema-2.0 structure'
    role: normative
    status: ontology_gap
    span:
      start: 161
      end: 270
    payload_hash: 57205abfaf0c0cee0a706a94c5369b30bf150d8f0f2d957334c11beda6cb8f05
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-CB7EC243CD643030
    claim_text: It must correctly interpret `counts` and `changes` fields for display in the brief editor tab
    role: normative
    status: ontology_gap
    span:
      start: 272
      end: 365
    payload_hash: 57205abfaf0c0cee0a706a94c5369b30bf150d8f0f2d957334c11beda6cb8f05
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-18D9AE9B2E412A36
    claim_text: It must handle the `changeNarrative` string array for the primary narrative block
    role: normative
    status: ontology_gap
    span:
      start: 367
      end: 448
    payload_hash: 57205abfaf0c0cee0a706a94c5369b30bf150d8f0f2d957334c11beda6cb8f05
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-24066F30C4D27F06
    claim_text: '**Deterministic Latest-Brief Selection**: Selection of the "latest" brief must use filename-timestamp ordering rather than filesystem modification time (`mtime`)'
    role: normative
    status: ontology_gap
    span:
      start: 451
      end: 612
    payload_hash: 57205abfaf0c0cee0a706a94c5369b30bf150d8f0f2d957334c11beda6cb8f05
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-90176480514D0B17
    claim_text: Brief files are named using a sortable timestamp pattern (e.g., `brief-20260506-043000.json`)
    role: descriptive
    status: missing
    span:
      start: 614
      end: 707
    payload_hash: 57205abfaf0c0cee0a706a94c5369b30bf150d8f0f2d957334c11beda6cb8f05
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-448887DFBFA54788
    claim_text: The extension must sort available brief files lexicographically by filename to determine the most recent one
    role: normative
    status: ontology_gap
    span:
      start: 709
      end: 817
    payload_hash: 57205abfaf0c0cee0a706a94c5369b30bf150d8f0f2d957334c11beda6cb8f05
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-D192A89C7C6759A7
    claim_text: This ensures consistent behavior across different environments and filesystems where `mtime` may be unreliable
    role: descriptive
    status: missing
    span:
      start: 819
      end: 929
    payload_hash: 57205abfaf0c0cee0a706a94c5369b30bf150d8f0f2d957334c11beda6cb8f05
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-B9FAFE432BE4C3CF
    claim_text: '**Auto-Open Preservation**: The render-first auto-open behavior established in v2 must be preserved and correctly triggered by the new deterministic selection logic'
    role: normative
    status: ontology_gap
    span:
      start: 932
      end: 1096
    payload_hash: 57205abfaf0c0cee0a706a94c5369b30bf150d8f0f2d957334c11beda6cb8f05
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-94E1F561DE0FCF34
    claim_text: '**Graceful Schema Fallback**: During the migration window, the extension should tolerate Schema-1.0 envelopes but apply Schema-2.0 display logic where possible'
    role: normative
    status: ontology_gap
    span:
      start: 1099
      end: 1258
    payload_hash: 57205abfaf0c0cee0a706a94c5369b30bf150d8f0f2d957334c11beda6cb8f05
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
logic_claims:
  - CLAIM-77DD6F0C540DE884
  - CLAIM-7D4F4A04A93F1C20
  - CLAIM-CB7EC243CD643030
  - CLAIM-18D9AE9B2E412A36
  - CLAIM-24066F30C4D27F06
  - CLAIM-90176480514D0B17
  - CLAIM-448887DFBFA54788
  - CLAIM-D192A89C7C6759A7
  - CLAIM-B9FAFE432BE4C3CF
  - CLAIM-94E1F561DE0FCF34
type: req
---

The VS Code Kibi extension must align with the Schema-2.0 briefing envelope and implement deterministic filename-timestamp ordering for latest-brief selection.

1. **Schema-2.0 Alignment**: The extension must support rendering briefings that follow the Schema-2.0 structure.
    - It must correctly interpret `counts` and `changes` fields for display in the brief editor tab.
    - It must handle the `changeNarrative` string array for the primary narrative block.

2. **Deterministic Latest-Brief Selection**: Selection of the "latest" brief must use filename-timestamp ordering rather than filesystem modification time (`mtime`).
    - Brief files are named using a sortable timestamp pattern (e.g., `brief-20260506-043000.json`).
    - The extension must sort available brief files lexicographically by filename to determine the most recent one.
    - This ensures consistent behavior across different environments and filesystems where `mtime` may be unreliable.

3. **Auto-Open Preservation**: The render-first auto-open behavior established in v2 must be preserved and correctly triggered by the new deterministic selection logic.

4. **Graceful Schema Fallback**: During the migration window, the extension should tolerate Schema-1.0 envelopes but apply Schema-2.0 display logic where possible.

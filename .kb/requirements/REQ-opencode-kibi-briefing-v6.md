---
id: REQ-opencode-kibi-briefing-v6
title: 'OpenCode Kibi Briefing v6: Schema-2.0 & Session-Delta Migration'
status: closed
created_at: 2026-05-06T04:30:00.000Z
updated_at: 2026-05-06T04:30:00.000Z
source: documentation/requirements/REQ-opencode-kibi-briefing-v6.md
priority: must
tags:
  - opencode
  - briefing
  - schema-2.0
  - session-delta
  - historical-status:superseded
links:
  - type: supersedes
    target: REQ-opencode-kibi-briefing-v5
  - type: specified_by
    target: SCEN-opencode-kibi-briefing-v6
  - type: verified_by
    target: TEST-opencode-kibi-briefing-v6
semantic_text: |-
  The OpenCode Kibi Briefing system must migrate to Schema-2.0 to support session-delta tracking, providing a high-fidelity audit of changes since the session began.

  **Session-Delta Baseline**: The briefing engine must use a session-start baseline captured at plugin initialization.
  Historical briefs from the same branch but previous sessions are ignored for change detection.
  Deltas represent the net change from session-start to the current state.

  **Schema-2.0 Contract**: Briefing envelopes must use `schemaVersion: "2.0"` and include the following structure:
  `counts: { entitiesAdded, entitiesModified, entitiesRemoved, relationshipsChanged }`
  `changes: { entities: { added, modified, removed }, relationships: { changed } }`
  The legacy `requirementsAdded` and other flat count fields are removed.

  **High-Fidelity Change Semantics**: The system must track exact entity lifecycle states:
  `added`: Entities created during the session.
  `modified`: Existing entities updated during the session.
  `removed`: Entities deleted during the session.
  `relationships.changed`: Any addition or removal of typed links.

  **Cited-First Narrative Narrative**: The `briefing.changeNarrative` field must be an ordered array of strings.
  Narrative generation must prioritize MCP-cited entities (those explicitly touched by tools).
  An audit fallback must catch any un-cited side effects detected in the KB delta.

  **Write Path Enforcement**: The system must write Schema-2.0 envelopes exclusively. Readers must tolerate Schema-1.0 envelopes during the migration window but prioritize 2.0 semantics.
  **Route-Based TUI Delivery**: The system must provide an interactive TUI for briefing consumption.
  **Auto-Open**: The TUI must automatically open the `kibi.brief` route when a new, unread briefing is generated.
  **Manual Open**: Users must be able to open the latest briefing manually via the `kibi.open_latest_brief` command.
  **In-Place Refresh**: The TUI must support an in-place refresh mechanism to update the displayed briefing without navigation flicker.
  **Deferred Read-State Mutation**: Mark-as-read state must only be committed when the user has actively viewed the briefing route.
proof_exempt: true
proof_exempt_reason: Historical requirement already retired as superseded before the test-quality audit; retained for provenance, outside current implementation proof scope.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d922b7aefed8971d5e7d1e09a98beffd10da0ef5310dcace75094dd378edde2d
semantic_inventory:
  - claim_key: CLAIM-62AF54BBEA495626
    claim_text: The OpenCode Kibi Briefing system must migrate to Schema-2.0 to support session-delta tracking, providing a high-fidelity audit of changes since the session began
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 162
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-571CBA12B0A103AA
    claim_text: '**Session-Delta Baseline**: The briefing engine must use a session-start baseline captured at plugin initialization'
    role: normative
    status: ontology_gap
    span:
      start: 165
      end: 280
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-2972231AE088228E
    claim_text: Historical briefs from the same branch but previous sessions are ignored for change detection
    role: descriptive
    status: missing
    span:
      start: 282
      end: 375
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-36FD00755C99C3C8
    claim_text: Deltas represent the net change from session-start to the current state
    role: descriptive
    status: missing
    span:
      start: 377
      end: 448
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-97C550FAFCCFF4E7
    claim_text: '**Schema-2.0 Contract**: Briefing envelopes must use `schemaVersion: "2.0"` and include the following structure'
    role: normative
    status: missing
    span:
      start: 451
      end: 562
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-FE2219F2671F6895
    claim_text: '`counts: { entitiesAdded, entitiesModified, entitiesRemoved, relationshipsChanged }`'
    role: descriptive
    status: missing
    span:
      start: 564
      end: 648
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-FC779A175E7F0E78
    claim_text: '`changes: { entities: { added, modified, removed }, relationships: { changed } }`'
    role: descriptive
    status: missing
    span:
      start: 649
      end: 730
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-5F8225F15E28715E
    claim_text: The legacy `requirementsAdded` and other flat count fields are removed
    role: descriptive
    status: missing
    span:
      start: 731
      end: 801
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-D6DB927E675BD9B3
    claim_text: '**High-Fidelity Change Semantics**: The system must track exact entity lifecycle states'
    role: normative
    status: ontology_gap
    span:
      start: 804
      end: 891
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-7B64BDCC75B3973D
    claim_text: '`added`: Entities created during the session'
    role: descriptive
    status: missing
    span:
      start: 893
      end: 937
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-423C6E8B4197A4C1
    claim_text: '`modified`: Existing entities updated during the session'
    role: descriptive
    status: missing
    span:
      start: 939
      end: 995
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-CDE402F7C6BA49AF
    claim_text: '`removed`: Entities deleted during the session'
    role: descriptive
    status: missing
    span:
      start: 997
      end: 1043
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-087E3F60D7FEF53A
    claim_text: '`relationships.changed`: Any addition or removal of typed links'
    role: descriptive
    status: missing
    span:
      start: 1045
      end: 1108
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-100B7EA7C807A03C
    claim_text: '**Cited-First Narrative Narrative**: The `briefing.changeNarrative` field must be an ordered array of strings'
    role: normative
    status: ontology_gap
    span:
      start: 1111
      end: 1220
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-935E8DB97000B30A
    claim_text: Narrative generation must prioritize MCP-cited entities (those explicitly touched by tools)
    role: normative
    status: ontology_gap
    span:
      start: 1222
      end: 1313
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-D07EFB5EB4804F10
    claim_text: An audit fallback must catch any un-cited side effects detected in the KB delta
    role: normative
    status: ontology_gap
    span:
      start: 1315
      end: 1394
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-67319A263EEE965B
    claim_text: '**Write Path Enforcement**: The system must write Schema-2.0 envelopes exclusively'
    role: normative
    status: ontology_gap
    span:
      start: 1397
      end: 1479
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-0E020FA914661C51
    claim_text: Readers must tolerate Schema-1.0 envelopes during the migration window but prioritize 2.0 semantics
    role: normative
    status: ontology_gap
    span:
      start: 1481
      end: 1580
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-ACF9728CAA2E2C74
    claim_text: '**Route-Based TUI Delivery**: The system must provide an interactive TUI for briefing consumption'
    role: normative
    status: ontology_gap
    span:
      start: 1582
      end: 1679
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-9FB1E3A2A5BF15A2
    claim_text: '**Auto-Open**: The TUI must automatically open the `kibi.brief` route when a new, unread briefing is generated'
    role: normative
    status: ontology_gap
    span:
      start: 1681
      end: 1791
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-851D10DEE33DE530
    claim_text: '**Manual Open**: Users must be able to open the latest briefing manually via the `kibi.open_latest_brief` command'
    role: normative
    status: ontology_gap
    span:
      start: 1793
      end: 1906
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-8DC22115D5C3F90F
    claim_text: '**In-Place Refresh**: The TUI must support an in-place refresh mechanism to update the displayed briefing without navigation flicker'
    role: normative
    status: ontology_gap
    span:
      start: 1908
      end: 2040
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-397A6AEC79F98B1E
    claim_text: '**Deferred Read-State Mutation**: Mark-as-read state must only be committed when the user has actively viewed the briefing route'
    role: normative
    status: ontology_gap
    span:
      start: 2042
      end: 2170
    payload_hash: 03ece6f805283900ef56f1c7da88e0b443baaf3a49949e9f1347b92f1c431071
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
logic_claims:
  - CLAIM-62AF54BBEA495626
  - CLAIM-571CBA12B0A103AA
  - CLAIM-2972231AE088228E
  - CLAIM-36FD00755C99C3C8
  - CLAIM-97C550FAFCCFF4E7
  - CLAIM-FE2219F2671F6895
  - CLAIM-FC779A175E7F0E78
  - CLAIM-5F8225F15E28715E
  - CLAIM-D6DB927E675BD9B3
  - CLAIM-7B64BDCC75B3973D
  - CLAIM-423C6E8B4197A4C1
  - CLAIM-CDE402F7C6BA49AF
  - CLAIM-087E3F60D7FEF53A
  - CLAIM-100B7EA7C807A03C
  - CLAIM-935E8DB97000B30A
  - CLAIM-D07EFB5EB4804F10
  - CLAIM-67319A263EEE965B
  - CLAIM-0E020FA914661C51
  - CLAIM-ACF9728CAA2E2C74
  - CLAIM-9FB1E3A2A5BF15A2
  - CLAIM-851D10DEE33DE530
  - CLAIM-8DC22115D5C3F90F
  - CLAIM-397A6AEC79F98B1E
type: req
---

The OpenCode Kibi Briefing system must migrate to Schema-2.0 to support session-delta tracking, providing a high-fidelity audit of changes since the session began.

1. **Session-Delta Baseline**: The briefing engine must use a session-start baseline captured at plugin initialization.
    - Historical briefs from the same branch but previous sessions are ignored for change detection.
    - Deltas represent the net change from session-start to the current state.

2. **Schema-2.0 Contract**: Briefing envelopes must use `schemaVersion: "2.0"` and include the following structure:
    - `counts: { entitiesAdded, entitiesModified, entitiesRemoved, relationshipsChanged }`
    - `changes: { entities: { added, modified, removed }, relationships: { changed } }`
    - The legacy `requirementsAdded` and other flat count fields are removed.

3. **High-Fidelity Change Semantics**: The system must track exact entity lifecycle states:
    - `added`: Entities created during the session.
    - `modified`: Existing entities updated during the session.
    - `removed`: Entities deleted during the session.
    - `relationships.changed`: Any addition or removal of typed links.

4. **Cited-First Narrative Narrative**: The `briefing.changeNarrative` field must be an ordered array of strings.
    - Narrative generation must prioritize MCP-cited entities (those explicitly touched by tools).
    - An audit fallback must catch any un-cited side effects detected in the KB delta.

5. **Write Path Enforcement**: The system must write Schema-2.0 envelopes exclusively. Readers must tolerate Schema-1.0 envelopes during the migration window but prioritize 2.0 semantics.
6. **Route-Based TUI Delivery**: The system must provide an interactive TUI for briefing consumption.
    - **Auto-Open**: The TUI must automatically open the `kibi.brief` route when a new, unread briefing is generated.
    - **Manual Open**: Users must be able to open the latest briefing manually via the `kibi.open_latest_brief` command.
    - **In-Place Refresh**: The TUI must support an in-place refresh mechanism to update the displayed briefing without navigation flicker.
    - **Deferred Read-State Mutation**: Mark-as-read state must only be committed when the user has actively viewed the briefing route.

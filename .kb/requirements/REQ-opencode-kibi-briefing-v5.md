---
id: REQ-opencode-kibi-briefing-v5
title: 'OpenCode Kibi Briefing v5: Session-Local Reconcile & Semantic Dedupe'
status: closed
created_at: 2026-04-30T12:00:00.000Z
updated_at: 2026-04-30T12:00:00.000Z
source: documentation/requirements/REQ-opencode-kibi-briefing-v5.md
priority: must
tags:
  - opencode
  - briefing
  - session-local
  - semantic-dedupe
  - historical-status:superseded
links:
  - type: supersedes
    target: REQ-opencode-kibi-briefing-v4
  - type: specified_by
    target: SCEN-opencode-kibi-briefing-v5
  - type: verified_by
    target: TEST-opencode-kibi-briefing-v5
semantic_text: |-
  The OpenCode Kibi Briefing system must transition to a session-local reconcile model with semantic duplicate suppression while preserving the render-first TUI delivery established in v4.

  **Session-Local Baseline Counts**: The briefing engine must use session-local baseline counts instead of total historical branch totals.
  The first briefing in a new session must ignore unread briefs from previous sessions on the same branch.
  Briefing counters and change detections must be anchored to the state at session start.

  **Normalized Content Duplicate Suppression**: Briefings must be suppressed if their normalized visible content matches a previously delivered brief in the current session.
  Suppression must use a hash of the normalized `promptBlock` content rather than just a `briefId`.
  Normalization must strip transient whitespace and session-specific metadata to ensure semantic equality.

  **Render-First TUI Delivery**: The system must preserve the render-first delivery model where briefings are persisted as envelopes and replayed during `system.transform` if unread.

  **Session Authoritativeness**: The plugin-local session scope (including uncommitted edits and session history) must be the authoritative source for reconciliation via `kb_briefing_generate`.

  **Multi-File Fingerprinting**: Reconciliation must use multi-file fingerprinting of all currently edited/dirty files in the session to ensure briefing stability.

  **Read-State Persistence**: Briefs must be marked as read only after successful TUI delivery. Semantic dedupe operates on the history of delivered (read) briefs within the session.

  **Deterministic Selection**: Brief selection must continue to use filename timestamps for consistency.
proof_exempt: true
proof_exempt_reason: Historical requirement already retired as superseded before the test-quality audit; retained for provenance, outside current implementation proof scope.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5f2dd000b0b1548b601e8fb6b4a7199dbc17f1a67875f0b472ec1411cd20615c
semantic_inventory:
  - claim_key: CLAIM-95FC1E3E52192357
    claim_text: The OpenCode Kibi Briefing system must transition to a session-local reconcile model with semantic duplicate suppression while preserving the render-first TUI delivery established in v4
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 185
    payload_hash: 22dda232887ec00afa83e83b2255e542c59e73ab34d75ec2600f412c321743f3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-4DBE1C45A4794CEB
    claim_text: '**Session-Local Baseline Counts**: The briefing engine must use session-local baseline counts instead of total historical branch totals'
    role: normative
    status: ontology_gap
    span:
      start: 188
      end: 323
    payload_hash: 22dda232887ec00afa83e83b2255e542c59e73ab34d75ec2600f412c321743f3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-57CCA1011875E542
    claim_text: The first briefing in a new session must ignore unread briefs from previous sessions on the same branch
    role: normative
    status: ontology_gap
    span:
      start: 325
      end: 428
    payload_hash: 22dda232887ec00afa83e83b2255e542c59e73ab34d75ec2600f412c321743f3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-DDAC006ADF5FC868
    claim_text: Briefing counters and change detections must be anchored to the state at session start
    role: normative
    status: ontology_gap
    span:
      start: 430
      end: 516
    payload_hash: 22dda232887ec00afa83e83b2255e542c59e73ab34d75ec2600f412c321743f3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-2B48D677CF43BF54
    claim_text: '**Normalized Content Duplicate Suppression**: Briefings must be suppressed if their normalized visible content matches a previously delivered brief in the current session'
    role: normative
    status: ontology_gap
    span:
      start: 519
      end: 689
    payload_hash: 22dda232887ec00afa83e83b2255e542c59e73ab34d75ec2600f412c321743f3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-EEC771A2E495EE76
    claim_text: Suppression must use a hash of the normalized `promptBlock` content rather than just a `briefId`
    role: normative
    status: ontology_gap
    span:
      start: 691
      end: 787
    payload_hash: 22dda232887ec00afa83e83b2255e542c59e73ab34d75ec2600f412c321743f3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-40FF2E1E631CAAC6
    claim_text: Normalization must strip transient whitespace and session-specific metadata to ensure semantic equality
    role: normative
    status: ontology_gap
    span:
      start: 789
      end: 892
    payload_hash: 22dda232887ec00afa83e83b2255e542c59e73ab34d75ec2600f412c321743f3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-9E872CB4B4F16013
    claim_text: '**Render-First TUI Delivery**: The system must preserve the render-first delivery model where briefings are persisted as envelopes and replayed during `system.transform` if unread'
    role: normative
    status: ontology_gap
    span:
      start: 895
      end: 1074
    payload_hash: 22dda232887ec00afa83e83b2255e542c59e73ab34d75ec2600f412c321743f3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-AF703BFF3F7B88DD
    claim_text: '**Session Authoritativeness**: The plugin-local session scope (including uncommitted edits and session history) must be the authoritative source for reconciliation via `kb_briefing_generate`'
    role: normative
    status: ontology_gap
    span:
      start: 1077
      end: 1267
    payload_hash: 22dda232887ec00afa83e83b2255e542c59e73ab34d75ec2600f412c321743f3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-BBFAA2F4A9F418A3
    claim_text: '**Multi-File Fingerprinting**: Reconciliation must use multi-file fingerprinting of all currently edited/dirty files in the session to ensure briefing stability'
    role: normative
    status: ontology_gap
    span:
      start: 1270
      end: 1430
    payload_hash: 22dda232887ec00afa83e83b2255e542c59e73ab34d75ec2600f412c321743f3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-E094F35F9C31D267
    claim_text: '**Read-State Persistence**: Briefs must be marked as read only after successful TUI delivery'
    role: normative
    status: ontology_gap
    span:
      start: 1433
      end: 1525
    payload_hash: 22dda232887ec00afa83e83b2255e542c59e73ab34d75ec2600f412c321743f3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-2C6BB355FAA81609
    claim_text: Semantic dedupe operates on the history of delivered (read) briefs within the session
    role: descriptive
    status: missing
    span:
      start: 1527
      end: 1612
    payload_hash: 22dda232887ec00afa83e83b2255e542c59e73ab34d75ec2600f412c321743f3
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-97581B67B61D001B
    claim_text: '**Deterministic Selection**: Brief selection must continue to use filename timestamps for consistency'
    role: normative
    status: ontology_gap
    span:
      start: 1615
      end: 1716
    payload_hash: 22dda232887ec00afa83e83b2255e542c59e73ab34d75ec2600f412c321743f3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
logic_claims:
  - CLAIM-95FC1E3E52192357
  - CLAIM-4DBE1C45A4794CEB
  - CLAIM-57CCA1011875E542
  - CLAIM-DDAC006ADF5FC868
  - CLAIM-2B48D677CF43BF54
  - CLAIM-EEC771A2E495EE76
  - CLAIM-40FF2E1E631CAAC6
  - CLAIM-9E872CB4B4F16013
  - CLAIM-AF703BFF3F7B88DD
  - CLAIM-BBFAA2F4A9F418A3
  - CLAIM-E094F35F9C31D267
  - CLAIM-2C6BB355FAA81609
  - CLAIM-97581B67B61D001B
type: req
---

The OpenCode Kibi Briefing system must transition to a session-local reconcile model with semantic duplicate suppression while preserving the render-first TUI delivery established in v4.

1.  **Session-Local Baseline Counts**: The briefing engine must use session-local baseline counts instead of total historical branch totals.
    - The first briefing in a new session must ignore unread briefs from previous sessions on the same branch.
    - Briefing counters and change detections must be anchored to the state at session start.

2.  **Normalized Content Duplicate Suppression**: Briefings must be suppressed if their normalized visible content matches a previously delivered brief in the current session.
    - Suppression must use a hash of the normalized `promptBlock` content rather than just a `briefId`.
    - Normalization must strip transient whitespace and session-specific metadata to ensure semantic equality.

3.  **Render-First TUI Delivery**: The system must preserve the render-first delivery model where briefings are persisted as envelopes and replayed during `system.transform` if unread.

4.  **Session Authoritativeness**: The plugin-local session scope (including uncommitted edits and session history) must be the authoritative source for reconciliation via `kb_briefing_generate`.

5.  **Multi-File Fingerprinting**: Reconciliation must use multi-file fingerprinting of all currently edited/dirty files in the session to ensure briefing stability.

6.  **Read-State Persistence**: Briefs must be marked as read only after successful TUI delivery. Semantic dedupe operates on the history of delivered (read) briefs within the session.

7.  **Deterministic Selection**: Brief selection must continue to use filename timestamps for consistency.

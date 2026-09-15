---
id: REQ-opencode-kibi-briefing-v1
title: 'OpenCode Kibi Briefings v1: Cue-Driven Discovery Through /brief-kibi'
status: closed
created_at: 2026-04-20T00:00:00.000Z
updated_at: 2026-04-20T00:00:00.000Z
source: documentation/requirements/REQ-opencode-kibi-briefing-v1.md
priority: must
tags:
  - opencode
  - briefing
  - guidance
  - start-task
  - historical-status:superseded
links:
  - type: depends_on
    target: REQ-mcp-kibi-briefing-v1
  - type: specified_by
    target: SCEN-opencode-kibi-briefing-v1
  - type: verified_by
    target: TEST-opencode-kibi-briefing-v1
  - type: relates_to
    target: REQ-opencode-kibi-plugin-v1
  - type: relates_to
    target: REQ-opencode-agent-mcp-only
  - type: relates_to
    target: REQ-opencode-smart-enforcement-v1
  - type: relates_to
    target: ADR-018
semantic_text: |-
  **Note**: This requirement is DEPRECATED and superseded by REQ-opencode-kibi-briefing-v2.
  It remains here for historical context and to document the v1 cue-driven contract.
  The OpenCode briefing experience must expose Kibi Briefings v1 as a sanctioned, cue-driven start-task workflow rather than an automatic runtime fetch.

  **Sanctioned Command**: `/brief-kibi` must be the sanctioned start-task command for requesting a Kibi briefing in OpenCode.
  **Cue-Driven Discovery**: The plugin may surface a compact cue that points the user or agent to `/brief-kibi` in relevant risky edit contexts.
  **No Live Hook Execution**: The plugin hook surface must remain text-only guidance. It must not perform live MCP execution while composing prompt guidance.
  **No Hidden Mutation Path**: The OpenCode briefing surface must not introduce background KB mutation, repair, or auto-application behavior.
  **MCP-Only Boundary**: Agent-visible wording for briefing generation must stay on sanctioned slash-command or MCP-owned surfaces consistent with ADR-018.
  **Degraded-Mode Honesty**: When posture or freshness is not authoritative enough for briefing use, the experience must degrade cleanly to `no_briefing` rather than imply a successful live briefing.
  **Prompt-Budget Compatibility**: Any cue that points to `/brief-kibi` must remain compact enough to coexist with existing OpenCode guidance budgeting rules.
proof_exempt: true
proof_exempt_reason: Historical requirement already retired as superseded before the test-quality audit; retained for provenance, outside current implementation proof scope.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 44f406c7bae441f2dbfcfcb08e867ba2e9e684d20cc93f675b1dcfe87e65c135
semantic_inventory:
  - claim_key: CLAIM-6644B37396C77CC2
    claim_text: '**Note**: This requirement is DEPRECATED and superseded by REQ-opencode-kibi-briefing-v2'
    role: descriptive
    status: missing
    span:
      start: 0
      end: 88
    payload_hash: 104ef7baf1fab152576f9d6be3781f7645c595ed8fdfaf50d3986485475c6440
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-AE631A1D305F08EA
    claim_text: It remains here for historical context and to document the v1 cue-driven contract
    role: descriptive
    status: missing
    span:
      start: 90
      end: 171
    payload_hash: 104ef7baf1fab152576f9d6be3781f7645c595ed8fdfaf50d3986485475c6440
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-9EB8D4687F8CBE09
    claim_text: The OpenCode briefing experience must expose Kibi Briefings v1 as a sanctioned, cue-driven start-task workflow rather than an automatic runtime fetch
    role: normative
    status: ontology_gap
    span:
      start: 173
      end: 322
    payload_hash: 104ef7baf1fab152576f9d6be3781f7645c595ed8fdfaf50d3986485475c6440
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-80939E4512651BF9
    claim_text: '**Sanctioned Command**: `/brief-kibi` must be the sanctioned start-task command for requesting a Kibi briefing in OpenCode'
    role: normative
    status: ontology_gap
    span:
      start: 325
      end: 447
    payload_hash: 104ef7baf1fab152576f9d6be3781f7645c595ed8fdfaf50d3986485475c6440
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-552BA1B89F601A01
    claim_text: '**Cue-Driven Discovery**: The plugin may surface a compact cue that points the user or agent to `/brief-kibi` in relevant risky edit contexts'
    role: descriptive
    status: missing
    span:
      start: 449
      end: 590
    payload_hash: 104ef7baf1fab152576f9d6be3781f7645c595ed8fdfaf50d3986485475c6440
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-2ABF5CB62114239E
    claim_text: '**No Live Hook Execution**: The plugin hook surface must remain text-only guidance'
    role: normative
    status: ontology_gap
    span:
      start: 592
      end: 674
    payload_hash: 104ef7baf1fab152576f9d6be3781f7645c595ed8fdfaf50d3986485475c6440
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-F5F46F8FCCED271A
    claim_text: It must not perform live MCP execution while composing prompt guidance
    role: normative
    status: missing
    span:
      start: 676
      end: 746
    payload_hash: 104ef7baf1fab152576f9d6be3781f7645c595ed8fdfaf50d3986485475c6440
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-5C1A2FE5429C3969
    claim_text: '**No Hidden Mutation Path**: The OpenCode briefing surface must not introduce background KB mutation, repair, or auto-application behavior'
    role: normative
    status: ontology_gap
    span:
      start: 748
      end: 886
    payload_hash: 104ef7baf1fab152576f9d6be3781f7645c595ed8fdfaf50d3986485475c6440
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-0A14C4759D3FCC73
    claim_text: '**MCP-Only Boundary**: Agent-visible wording for briefing generation must stay on sanctioned slash-command or MCP-owned surfaces consistent with ADR-018'
    role: normative
    status: ontology_gap
    span:
      start: 888
      end: 1040
    payload_hash: 104ef7baf1fab152576f9d6be3781f7645c595ed8fdfaf50d3986485475c6440
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-9A8DA72AEF9B3B39
    claim_text: '**Degraded-Mode Honesty**: When posture or freshness is not authoritative enough for briefing use, the experience must degrade cleanly to `no_briefing` rather than imply a successful live briefing'
    role: normative
    status: ontology_gap
    span:
      start: 1042
      end: 1238
    payload_hash: 104ef7baf1fab152576f9d6be3781f7645c595ed8fdfaf50d3986485475c6440
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-1AC96FA2E2E26291
    claim_text: '**Prompt-Budget Compatibility**: Any cue that points to `/brief-kibi` must remain compact enough to coexist with existing OpenCode guidance budgeting rules'
    role: normative
    status: ontology_gap
    span:
      start: 1240
      end: 1395
    payload_hash: 104ef7baf1fab152576f9d6be3781f7645c595ed8fdfaf50d3986485475c6440
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
logic_claims:
  - CLAIM-6644B37396C77CC2
  - CLAIM-AE631A1D305F08EA
  - CLAIM-9EB8D4687F8CBE09
  - CLAIM-80939E4512651BF9
  - CLAIM-552BA1B89F601A01
  - CLAIM-2ABF5CB62114239E
  - CLAIM-F5F46F8FCCED271A
  - CLAIM-5C1A2FE5429C3969
  - CLAIM-0A14C4759D3FCC73
  - CLAIM-9A8DA72AEF9B3B39
  - CLAIM-1AC96FA2E2E26291
type: req
---


> **Note**: This requirement is DEPRECATED and superseded by REQ-opencode-kibi-briefing-v2. 
> It remains here for historical context and to document the v1 cue-driven contract.
The OpenCode briefing experience must expose Kibi Briefings v1 as a sanctioned, cue-driven start-task workflow rather than an automatic runtime fetch.

1. **Sanctioned Command**: `/brief-kibi` must be the sanctioned start-task command for requesting a Kibi briefing in OpenCode.
2. **Cue-Driven Discovery**: The plugin may surface a compact cue that points the user or agent to `/brief-kibi` in relevant risky edit contexts.
3. **No Live Hook Execution**: The plugin hook surface must remain text-only guidance. It must not perform live MCP execution while composing prompt guidance.
4. **No Hidden Mutation Path**: The OpenCode briefing surface must not introduce background KB mutation, repair, or auto-application behavior.
5. **MCP-Only Boundary**: Agent-visible wording for briefing generation must stay on sanctioned slash-command or MCP-owned surfaces consistent with ADR-018.
6. **Degraded-Mode Honesty**: When posture or freshness is not authoritative enough for briefing use, the experience must degrade cleanly to `no_briefing` rather than imply a successful live briefing.
7. **Prompt-Budget Compatibility**: Any cue that points to `/brief-kibi` must remain compact enough to coexist with existing OpenCode guidance budgeting rules.

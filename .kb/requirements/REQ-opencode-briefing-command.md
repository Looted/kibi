---
id: REQ-opencode-briefing-command
title: OpenCode Briefing Command
status: closed
created_at: 2026-05-13T00:00:00.000Z
source: packages/opencode/src/brief-intent.ts
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - briefing
  - historical-status:superseded
links:
  - type: specified_by
    target: SCEN-opencode-briefing-command
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
semantic_text: |-
  The plugin must support focused knowledge briefings:

  Provide a `/brief-kibi` slash command to invoke the MCP briefing workflow (`kb_briefing_generate`).
  Surface the command when session starts or authoritative risky work is detected.
  Discovery cues for the briefing must fit within the prompt guidance token budget.
proof_exempt: true
proof_exempt_reason: Historical requirement already retired as superseded before the test-quality audit; retained for provenance, outside current implementation proof scope.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 23771a93e7666e4008882758e4a6be3a8adc54763eab9056a821b5317b987bdd
semantic_inventory:
  - claim_key: CLAIM-43B2966EF3B9C6CF
    claim_text: The plugin must support focused knowledge briefings
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 51
    payload_hash: 4879abbfa8aba544fde52fc9ae247829f9195761cd8ca8d73e922afed96ddb4e
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-1D02F64BC4ECF08E
    claim_text: Provide a `/brief-kibi` slash command to invoke the MCP briefing workflow (`kb_briefing_generate`)
    role: descriptive
    status: missing
    span:
      start: 54
      end: 152
    payload_hash: 4879abbfa8aba544fde52fc9ae247829f9195761cd8ca8d73e922afed96ddb4e
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-5740C3F71658AD9D
    claim_text: Surface the command when session starts or authoritative risky work is detected
    role: normative
    status: ontology_gap
    span:
      start: 154
      end: 233
    payload_hash: 4879abbfa8aba544fde52fc9ae247829f9195761cd8ca8d73e922afed96ddb4e
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-FC43DB73F09F6AFB
    claim_text: Discovery cues for the briefing must fit within the prompt guidance token budget
    role: normative
    status: ontology_gap
    span:
      start: 235
      end: 315
    payload_hash: 4879abbfa8aba544fde52fc9ae247829f9195761cd8ca8d73e922afed96ddb4e
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
logic_claims:
  - CLAIM-43B2966EF3B9C6CF
  - CLAIM-1D02F64BC4ECF08E
  - CLAIM-5740C3F71658AD9D
  - CLAIM-FC43DB73F09F6AFB
type: req
---

The plugin must support focused knowledge briefings:

1. Provide a `/brief-kibi` slash command to invoke the MCP briefing workflow (`kb_briefing_generate`).
2. Surface the command when session starts or authoritative risky work is detected.
3. Discovery cues for the briefing must fit within the prompt guidance token budget.

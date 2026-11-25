---
title: Each host's hook has the person decide a change that lowers a requirement's required_evidence
status: closed
priority: must
required_evidence: tested
tags:
  - levels
semantic_text: Before an edit, kb_upsert call or kb_record call that lowers a requirement's required_evidence, the Claude Code pre-edit hook must ask the person. Before such a change, the Antigravity pre-edit hook must ask the person. Before such a change, the Codex, Cursor or ZCode pre-edit hook must tell the agent to ask the person first. Before such a change, the OpenCode hook must stop the call once so the agent asks. After such a change, the Vibe hook must tell the agent to ask the person.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-25, choosing Kibi levels as presets of how hard Kibi holds the agent to the requirements: "the idea of presets is how much do we force the agent"; "Remember / Test / Prove -> let''s go with this". Approving the Kibi level statements, statement 12 of 13: "Approve all as written". Rewording statements 11 and 12 to what each host''s hook can do: "Reword to match each host".'
  recorded_at: '2026-11-25T13:38:35.001Z'
rationale: Agents lowered a requirement's floor by themselves to clear a floor finding (10 of 42 benchmark sessions with one did this). How much evidence a requirement needs is the person's decision, so each host's hook puts it to the person as far as the host allows.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: fe42f89a166f916c31b2c27b8adef3244a4f2de9b48dfb2ccdda22f494ee4531
semantic_inventory:
  - claim_key: CLAIM-9D5EBE391C08673B
    claim_text: Before an edit, kb_upsert call or kb_record call that lowers a requirement's required_evidence, the Claude Code pre-edit hook must ask the person
    role: normative
    status: missing
    span:
      start: 0
      end: 145
    subjects:
      - kibi.agent_hooks.evidence_lowering_ask
  - claim_key: CLAIM-EBDB7DA50325C92F
    claim_text: Before such a change, the Antigravity pre-edit hook must ask the person
    role: normative
    status: missing
    span:
      start: 147
      end: 218
    subjects:
      - kibi.agent_hooks.evidence_lowering_ask
  - claim_key: CLAIM-E83EDD79E95BF549
    claim_text: Before such a change, the Codex, Cursor or ZCode pre-edit hook must tell the agent to ask the person first
    role: normative
    status: missing
    span:
      start: 220
      end: 326
    subjects:
      - kibi.agent_hooks.evidence_lowering_ask
  - claim_key: CLAIM-9EDC7C3C45E509E9
    claim_text: Before such a change, the OpenCode hook must stop the call once so the agent asks
    role: normative
    status: missing
    span:
      start: 328
      end: 409
    subjects:
      - kibi.agent_hooks.evidence_lowering_ask
  - claim_key: CLAIM-DA16CC1E935F00F0
    claim_text: After such a change, the Vibe hook must tell the agent to ask the person
    role: normative
    status: missing
    span:
      start: 411
      end: 483
    subjects:
      - kibi.agent_hooks.evidence_lowering_ask
logic_claims:
  - CLAIM-9D5EBE391C08673B
  - CLAIM-EBDB7DA50325C92F
  - CLAIM-E83EDD79E95BF549
  - CLAIM-9EDC7C3C45E509E9
  - CLAIM-DA16CC1E935F00F0
id: REQ-agent-hosts-required-evidence-lowering-ask
type: req
---
Before an edit, kb_upsert call or kb_record call that lowers a requirement's required_evidence, the Claude Code pre-edit hook must ask the person. Before such a change, the Antigravity pre-edit hook must ask the person. Before such a change, the Codex, Cursor or ZCode pre-edit hook must tell the agent to ask the person first. Before such a change, the OpenCode hook must stop the call once so the agent asks. After such a change, the Vibe hook must tell the agent to ask the person.

## Context

Agents lowered a requirement's floor by themselves to clear a floor finding (10 of 42 benchmark sessions with one did this). How much evidence a requirement needs is the person's decision, so each host's hook puts it to the person as far as the host allows.

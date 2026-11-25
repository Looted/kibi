---
title: The Codex, Cursor, ZCode and OpenCode hooks have the agent ask the person before a change of the Kibi level or a lowered required_evidence
status: open
priority: must
required_evidence: tested
tags:
  - levels
semantic_text: Before an edit that changes the Kibi level, or an edit, kb_upsert call or kb_record call that lowers a requirement's required_evidence, the Codex, Cursor or ZCode pre-edit hook must tell the agent to ask the person first. Before such a change, the OpenCode hook must stop the change once so the agent asks.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-25, choosing Kibi levels as presets of how hard Kibi holds the agent to the requirements: "the idea of presets is how much do we force the agent"; "Remember / Test / Prove -> let''s go with this". Approving the Kibi level statements, statements 11 and 12 of 13: "Approve all as written". Rewording statements 11 and 12 to what each host''s hook can do: "Reword to match each host".'
  recorded_at: '2026-11-25T14:05:47.601Z'
rationale: The Kibi level and how much evidence a requirement needs are the person's decisions, and agents lowered a requirement's floor by themselves to clear a floor finding (10 of 42 benchmark sessions with one did this). Approved statements 11 (the level) and 12 (required_evidence) are recorded by the hook that enforces them, one requirement per kind of hook, with the approved wording for each host. Codex, Cursor and ZCode cannot prompt the person from a hook, so they tell the agent to ask; OpenCode can only stop a call, so it stops the first try.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: acb2a0f1c9be16b2974df73ac63633dd92d18dacb126d612ca4126a020b1cf70
semantic_inventory:
  - claim_key: CLAIM-1B7636EAA5FAFD6C
    claim_text: Before an edit that changes the Kibi level, or an edit, kb_upsert call or kb_record call that lowers a requirement's required_evidence, the Codex, Cursor or ZCode pre-edit hook must tell the agent to ask the person first
    role: normative
    status: modeled
    span:
      start: 0
      end: 220
    subjects:
      - kibi.agent_hooks.guarded_change
    reason: Grounded by FACT-PROP-agent-hosts-guarded-change-notice-c01 via requires_property.
  - claim_key: CLAIM-1D1CEF05CB85F816
    claim_text: Before such a change, the OpenCode hook must stop the change once so the agent asks
    role: normative
    status: modeled
    span:
      start: 222
      end: 305
    subjects:
      - kibi.agent_hooks.guarded_change
    reason: Grounded by FACT-PROP-agent-hosts-guarded-change-notice-c02 via requires_property.
logic_claims:
  - CLAIM-1B7636EAA5FAFD6C
  - CLAIM-1D1CEF05CB85F816
id: REQ-agent-hosts-guarded-change-notice
type: req
---
Before an edit that changes the Kibi level, or an edit, kb_upsert call or kb_record call that lowers a requirement's required_evidence, the Codex, Cursor or ZCode pre-edit hook must tell the agent to ask the person first. Before such a change, the OpenCode hook must stop the change once so the agent asks.

## Context

The Kibi level and how much evidence a requirement needs are the person's decisions, and agents lowered a requirement's floor by themselves to clear a floor finding (10 of 42 benchmark sessions with one did this). Approved statements 11 (the level) and 12 (required_evidence) are recorded by the hook that enforces them, one requirement per kind of hook, with the approved wording for each host. Codex, Cursor and ZCode cannot prompt the person from a hook, so they tell the agent to ask; OpenCode can only stop a call, so it stops the first try.

## Why this changed

REQ-agent-hosts-level-ask and REQ-agent-hosts-required-evidence-lowering-ask each named every host, so one requirement was implemented by the code of seven hosts. They are recorded by the kind of hook instead: one for the hooks that prompt the person, one for the hooks that tell the agent to ask first, and one for the Vibe hook that tells the agent after the change. Each covers both a change of the Kibi level and a lowered required_evidence, with the approved wording for its hosts.

---
title: Rule notes and the capture template ask for the stated reason in why
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - hooks
  - decision-capture
  - rationale
origin:
  kind: agent
  ref: 'Maintainer review of the capture path, item ''Capture that passes, with one why'': the capture template, filled as given, wrote a requirement that kb_check still blocked, and the reason the person gave was not recorded.'
  approved_by: maintainer
  recorded_at: '2026-11-16T16:13:47.693Z'
rationale: People give the reason together with the rule, with because or so that; unless the hook asks for it, the agent drops it and the requirement records no reason for the rule at all.
semantic_text: The kb_upsert template the hooks give after a rule prompt must carry a why field. When the sentence that states the rule, or the one after it, gives a reason with "because" or "so that", the prompt-time rule note and the capture template must ask the agent to record that reason in why.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7a91cfa1b33737aec7fd7e77da37befcbff429f218a54df648eeb2f71e88d5b2
semantic_inventory:
  - claim_key: CLAIM-05297AB848009408
    claim_text: The kb_upsert template the hooks give after a rule prompt must carry a why field
    role: normative
    status: modeled
    span:
      start: 0
      end: 80
  - claim_key: CLAIM-18E9952D228880AC
    claim_text: When the sentence that states the rule, or the one after it, gives a reason with "because" or "so that", the prompt-time rule note
    role: rationale
    status: nonlogical
    span:
      start: 82
      end: 212
  - claim_key: CLAIM-A06F1B9D34285703
    claim_text: the capture template must ask the agent to record that reason in why
    role: normative
    status: modeled
    span:
      start: 217
      end: 285
logic_claims:
  - CLAIM-05297AB848009408
  - CLAIM-A06F1B9D34285703
id: REQ-agent-hosts-rule-reason-capture
type: req
---
The kb_upsert template the hooks give after a rule prompt must carry a why field. When the sentence that states the rule, or the one after it, gives a reason with "because" or "so that", the prompt-time rule note and the capture template must ask the agent to record that reason in why.

## Context

People give the reason together with the rule, with because or so that; unless the hook asks for it, the agent drops it and the requirement records no reason for the rule at all.

## Source

> Maintainer review of the capture path, item 'Capture that passes, with one why': the capture template, filled as given, wrote a requirement that kb_check still blocked, and the reason the person gave was not recorded.

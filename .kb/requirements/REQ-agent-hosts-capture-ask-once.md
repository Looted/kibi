---
title: Capture notes ask the person once
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - hooks
  - decision-capture
origin:
  kind: agent
  ref: 'Maintainer approval of the benchmark-driven capture, lookup and hook fixes, statement 4 of 8: ''Approve all''.'
  approved_by: maintainer
  recorded_at: '2026-11-24T20:00:15.747Z'
rationale: In the crowded-store benchmark the hooks prompted capture, but the agent then asked the person about each kb_check result in turn, so one rule took several rounds.
semantic_text: The capture reminder and the rule capture template on every supported agent host must tell the agent to put the approvals kb_record returns to the person in one question, not one per check result.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f501be2e41605f088e4440fd5ce8fa1c36348a7d3d0c774f48106f206610b58d
semantic_inventory:
  - claim_key: CLAIM-7BF0622EA719B18C
    claim_text: The capture reminder and the rule capture template on every supported agent host must tell the agent to put the approvals kb_record returns to the person in one question, not one per check result
    role: normative
    status: modeled
    span:
      start: 0
      end: 195
    subjects:
      - kibi.agent_hosts_decision_guard
logic_claims:
  - CLAIM-7BF0622EA719B18C
id: REQ-agent-hosts-capture-ask-once
type: req
---
The capture reminder and the rule capture template on every supported agent host must tell the agent to put the approvals kb_record returns to the person in one question, not one per check result.

## Context

In the crowded-store benchmark the hooks prompted capture, but the agent then asked the person about each kb_check result in turn, so one rule took several rounds.

## Source

> Maintainer approval of the benchmark-driven capture, lookup and hook fixes, statement 4 of 8: 'Approve all'.

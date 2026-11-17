---
title: Hosts and skills point the first write of a rule at kb_record
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - kb-record
  - hooks
  - skills
origin:
  kind: agent
  ref: 'Maintainer request: a stated rule is recorded with one kb_record call, translated into one kb_upsert payload, that returns the commit gate''s verdict; facts and other modeling stay on kb_upsert.'
  recorded_at: '2026-11-17T06:45:15.755Z'
rationale: Agents write what the hook template and the skills show them; while those name kb_upsert for the first write of a rule, kb_record goes unused on every harness and without one.
semantic_text: The default MCP tool profile must list kb_record. The capture template the hooks give after a rule prompt, in agent-core and in every host adapter, and the kibi-usage and kibi-decisions skills must point the first write of a rule at kb_record (kibi record --input - without MCP), and point modeling at kb_upsert.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e93307691a92b50b6f233df08de92f5e658a079d64c08e58b4b642b3d7b42fb2
semantic_inventory:
  - claim_key: CLAIM-DDF37ACD57EAF41E
    claim_text: The default MCP tool profile must list kb_record
    role: normative
    status: modeled
    span:
      start: 0
      end: 48
    subjects:
      - kibi.mcp.tool_catalog
  - claim_key: CLAIM-7D9435800572CD65
    claim_text: The capture template the hooks give after a rule prompt, in agent-core and in every host adapter, and the kibi-usage and kibi-decisions skills must point the first write of a rule at kb_record (kibi record --input - without MCP), and point modeling at kb_upsert
    role: normative
    status: modeled
    span:
      start: 50
      end: 311
    subjects:
      - kibi.agent_hosts_decision_guard
logic_claims:
  - CLAIM-DDF37ACD57EAF41E
  - CLAIM-7D9435800572CD65
id: REQ-agent-hosts-first-write-record
type: req
---
The default MCP tool profile must list kb_record. The capture template the hooks give after a rule prompt, in agent-core and in every host adapter, and the kibi-usage and kibi-decisions skills must point the first write of a rule at kb_record (kibi record --input - without MCP), and point modeling at kb_upsert.

## Context

Agents write what the hook template and the skills show them; while those name kb_upsert for the first write of a rule, kb_record goes unused on every harness and without one.

## Source

> Maintainer request: a stated rule is recorded with one kb_record call, translated into one kb_upsert payload, that returns the commit gate's verdict; facts and other modeling stay on kb_upsert.

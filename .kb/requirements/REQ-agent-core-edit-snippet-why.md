---
title: The first edit snippet gives the lead requirement's recorded reason
status: open
priority: must
required_evidence: tested
tags:
  - progressive-disclosure
  - hooks
semantic_text: The first edit snippet shown for a file whose lead requirement is current must give that requirement's recorded reason, or say that none is recorded, on one line starting with "Why:" inside the snippet's budget.
origin:
  kind: agent
  ref: 'Maintainer request, 2026-11-16: give the statement and the recorded reason in the first search and edit layer'
  approved_by: maintainer
  recorded_at: '2026-11-16T15:55:02.452Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4fbdbc82695a62ea756944b44e5471cbdc8e29710c6922ecc7dd501b6694824b
semantic_inventory:
  - claim_key: CLAIM-301D93AF3C0D044A
    claim_text: The first edit snippet shown for a file whose lead requirement is current must give that requirement's recorded reason, or say that none is recorded, on one line starting with "Why:" inside the snippet's budget
    role: normative
    status: modeled
    span:
      start: 0
      end: 210
logic_claims:
  - CLAIM-301D93AF3C0D044A
id: REQ-agent-core-edit-snippet-why
type: req
---
The first edit snippet shown for a file whose lead requirement is current must give that requirement's recorded reason, or say that none is recorded, on one line starting with "Why:" inside the snippet's budget.

## Why

The edit snippet is shown at the right moment, before the agent changes code that implements a requirement, but it named the rule and not the reason it exists: the shared entity summary had no reason field. Agents that do not know why a rule exists change it as if it were arbitrary.

## Source

> Maintainer request, 2026-11-16: give the statement and the recorded reason in the first search and edit layer
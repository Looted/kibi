---
title: The search answer gives each governing requirement's recorded reason
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - search
  - answer
  - rationale
semantic_text: The kb_search answer must give the recorded reason of each governing requirement.
rationale: In the benchmark run on Kibi's own repository the agent was asked why a rule was what it was. The requirement's Why section held the reason, but the search answer carried only ADR excerpts, so the agent answered from memory instead of the record.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the why-answer statements: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T10:21:04.292Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ea678769a9a2a04da9689208633aed7088afe832d93d71af82a439eaa9da712c
semantic_inventory:
  - claim_key: CLAIM-9E98B1DB83A0D5EB
    claim_text: The kb_search answer must give the recorded reason of each governing requirement
    role: normative
    status: modeled
    span:
      start: 0
      end: 80
logic_claims:
  - CLAIM-9E98B1DB83A0D5EB
id: REQ-search-answer-gives-recorded-reason
type: req
---
The kb_search answer must give the recorded reason of each governing requirement.

## Context

In the benchmark run on Kibi's own repository the agent was asked why a rule was what it was. The requirement's Why section held the reason, but the search answer carried only ADR excerpts, so the agent answered from memory instead of the record.

## Source

> Maintainer decision, 2026-11-16, approving the why-answer statements: "Approve all"
---
title: kb_record refuses modeling fields and names kb_upsert
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - kb-record
  - write-path
origin:
  kind: agent
  ref: 'Maintainer request: a stated rule is recorded with one kb_record call, translated into one kb_upsert payload, that returns the commit gate''s verdict; facts and other modeling stay on kb_upsert.'
  recorded_at: '2026-11-17T06:46:35.302Z'
rationale: kb_record stays small only while it takes the rule as stated; accepting or silently dropping facts, links or proof contracts would hide that they were never written.
semantic_text: kb_record must refuse every input field other than its own, and its refusal must name kb_upsert as the call that records facts, relationships, proof contracts and other modeling.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 01497b2fa192471252c97766fb0662cf31976fe21dae05e4cbf30ec2848e0216
semantic_inventory:
  - claim_key: CLAIM-01C50B44F7457C0D
    claim_text: kb_record must refuse every input field other than its own
    role: normative
    status: modeled
    span:
      start: 0
      end: 58
    subjects:
      - kibi.kb_record
  - claim_key: CLAIM-7747603FD6216690
    claim_text: its refusal must name kb_upsert as the call that records facts, relationships, proof contracts and other modeling
    role: normative
    status: modeled
    span:
      start: 64
      end: 177
    subjects:
      - kibi.kb_record
logic_claims:
  - CLAIM-01C50B44F7457C0D
  - CLAIM-7747603FD6216690
id: REQ-kb-record-modeling-stays-upsert
type: req
---
kb_record must refuse every input field other than its own, and its refusal must name kb_upsert as the call that records facts, relationships, proof contracts and other modeling.

## Context

kb_record stays small only while it takes the rule as stated; accepting or silently dropping facts, links or proof contracts would hide that they were never written.

## Source

> Maintainer request: a stated rule is recorded with one kb_record call, translated into one kb_upsert payload, that returns the commit gate's verdict; facts and other modeling stay on kb_upsert.

---
title: Firm decisions are not edited in place without new human words
status: open
required_evidence: tested
priority: must
tags:
  - kb
  - decisions
firmness: default
semantic_text: Kibi kb_upsert must refuse a write that changes the claim of a current firm requirement or ADR in place unless the write cites new human words. Kibi must report a current requirement or ADR that was firm at HEAD and whose claim changed since HEAD without new human words as a decision-firm-edited violation.
semantic_clauses:
  - Kibi kb_upsert must refuse a write that changes the claim of a current firm requirement or ADR in place unless the write cites new human words
  - Kibi must report a current requirement or ADR that was firm at HEAD and whose claim changed since HEAD without new human words as a decision-firm-edited violation
logic_claims:
  - CLAIM-723B8524A787415E
  - CLAIM-0C4CA5391772724F
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e6c18adbb5ac22782f26ebdc06df845b2d7dcc942ce1a09b1bbb8a80980fd34a
semantic_inventory:
  - claim_key: CLAIM-723B8524A787415E
    claim_text: Kibi kb_upsert must refuse a write that changes the claim of a current firm requirement or ADR in place unless the write cites new human words
    role: exception
    status: modeled
    span:
      start: 0
      end: 142
  - claim_key: CLAIM-0C4CA5391772724F
    claim_text: Kibi must report a current requirement or ADR that was firm at HEAD and whose claim changed since HEAD without new human words as a decision-firm-edited violation
    role: normative
    status: modeled
    span:
      start: 144
      end: 306
origin:
  kind: agent
  recorded_at: '2026-10-14T08:00:10.934Z'
id: REQ-kb-firm-decision-edit
type: req
---
Kibi kb_upsert must refuse a write that changes the claim of a current firm requirement or ADR in place unless the write cites new human words. Kibi must report a current requirement or ADR that was firm at HEAD and whose claim changed since HEAD without new human words as a decision-firm-edited violation.

## Context

Agents changed firm requirements in place, rewording the rule a person stated instead of asking or superseding it, and nothing in Kibi stopped the edit. The supersede rules only judged replacements, so a reworded rule kept its id, its firmness and its reference while its meaning changed. kb_upsert now refuses such a write unless it cites new human words, and kb_check catches the same edit made directly to the file by comparing with the last commit. Context sections, tags, status and links stay editable, so routine maintenance does not need a person.

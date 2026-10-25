---
title: Decisions without firmness are firm unless an agent wrote them
status: open
required_evidence: tested
priority: must
tags:
  - kb
  - decisions
  - migration
firmness: default
semantic_text: Kibi must read a requirement or ADR without firmness as firm unless an agent wrote it. Kibi must report a decision that is not firm and supersedes a decision that reads as firm from its origin as a decision-firm-superseded violation unless the schema 10 migration acknowledged that supersede. Kibi bootstrap must record a requirement planned from a cited intent claim or a normative documentation line as an import that is firm and cites the passage.
semantic_clauses:
  - Kibi must read a requirement or ADR without firmness as firm unless an agent wrote it
  - Kibi must report a decision that is not firm and supersedes a decision that reads as firm from its origin as a decision-firm-superseded violation unless the schema 10 migration acknowledged that supersede
  - Kibi bootstrap must record a requirement planned from a cited intent claim or a normative documentation line as an import that is firm and cites the passage
logic_claims:
  - CLAIM-1467DF1EFF12FAAD
  - CLAIM-180A4C19E8A34EBE
  - CLAIM-AA4A30B17E7F85FF
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b05ce53c2ba038d5ddd948f48918bf18cf940721bbbe02df8b74103fedb2eddc
semantic_inventory:
  - claim_key: CLAIM-1467DF1EFF12FAAD
    claim_text: Kibi must read a requirement or ADR without firmness as firm unless an agent wrote it
    role: exception
    status: modeled
    span:
      start: 0
      end: 85
  - claim_key: CLAIM-180A4C19E8A34EBE
    claim_text: Kibi must report a decision that is not firm and supersedes a decision that reads as firm from its origin as a decision-firm-superseded violation unless the schema 10 migration acknowledged that supersede
    role: exception
    status: modeled
    span:
      start: 87
      end: 291
  - claim_key: CLAIM-AA4A30B17E7F85FF
    claim_text: Kibi bootstrap must record a requirement planned from a cited intent claim or a normative documentation line as an import that is firm and cites the passage
    role: normative
    status: modeled
    span:
      start: 293
      end: 449
origin:
  kind: agent
  recorded_at: '2026-10-13T20:09:16.113Z'
id: REQ-kb-decision-firmness-from-origin
type: req
---
Kibi must read a requirement or ADR without firmness as firm unless an agent wrote it. Kibi must report a decision that is not firm and supersedes a decision that reads as firm from its origin as a decision-firm-superseded violation unless the schema 10 migration acknowledged that supersede. Kibi bootstrap must record a requirement planned from a cited intent claim or a normative documentation line as an import that is firm and cites the passage.

## Context

When a project's rules were imported into Kibi without a firmness value, Kibi read them as default, delegated decisions. The usage skill let an agent supersede such a decision on its own evidence, so agents rewrote the rules instead of asking when a request conflicted with them. Two changes address it: the skill treats a conflicting request as a question whatever the rule's firmness, and the data treats a missing firmness on a decision a person wrote, imported or carried over as firm, with bootstrap and import writing firmness explicitly and a schema bump migrating existing knowledge bases.

Schema 10 records the supersedes that existed before the change in the manifest, so history does not block; a new replacement of such a decision must be firm and cite the person's words. kb_upsert still records a new entity without origin as the agent's own, so an agent's choices stay default.

---
title: A declaration counts as changed when its title is new or its normalized text differs
status: open
priority: must
required_evidence: tested
semantic_text: kibi check --staged must treat a declaration as changed only when its title is absent from the base tree or its whitespace- and comment-normalized text differs from the base tree.
semantic_clauses:
  - kibi check --staged must treat a declaration as changed only when its title is absent from the base tree or its whitespace- and comment-normalized text differs from the base tree.
logic_claims:
  - CLAIM-B0D02A5A16D708F1
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3904f158cff76695d2d282f190788259eabedc46b92fd381c93990c280d71a55
semantic_inventory:
  - claim_key: CLAIM-B0D02A5A16D708F1
    claim_text: kibi check --staged must treat a declaration as changed only when its title is absent from the base tree or its whitespace- and comment-normalized text differs from the base tree
    role: normative
    status: modeled
    span:
      start: 0
      end: 178
    reason: Grounded by the linked fact with this claim key.
tags:
  - staged-gate
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
  approved_by: maintainer
  ref: 'Maintainer, in review on 2026-11-16: approved this requirement statement as written.'
id: REQ-staged-gate-changed-declaration-definition
type: req
---
kibi check --staged must treat a declaration as changed only when its title is absent from the base tree or its whitespace- and comment-normalized text differs from the base tree.

## Context

A benchmark run of agents working in an onboarded open-source repository showed the staged gate refusing 57% of correct commits. Onboarding records the code that decides each behavior, not every declaration, so most source files keep declarations without a symbol record; the gate demanded a record for every declaration in each staged file, and an agent whose change touched one function was blocked over neighbours it never edited. The gate needs a precise notion of which declarations a commit changed. Comparing whitespace- and comment-normalized text with the base tree keeps reformatting and comment edits out of the change, so they never pull an untouched declaration into the judgement, while any real edit does. A line inside a nested declaration such as a method changes that member and not its class.

## Source

> Maintainer, in review on 2026-11-16: approved this requirement statement as written.

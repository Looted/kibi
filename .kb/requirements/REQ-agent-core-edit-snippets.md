---
title: Host edit snippets come from one shared builder and say what a current requirement must keep true and why
status: open
required_evidence: tested
priority: should
tags:
  - hooks
  - snippets
  - agent-core
  - claude
  - cursor
  - codex
  - zcode
  - opencode
semantic_text: Every Kibi host plugin must build its file knowledge snippet with the shared kibi-agent-core snippet builder. An edit snippet for a file that implements a current requirement must state up to two facts that the lead requirement links through constrains, requires_property, requires_predicate, or requires_rule as what it must keep true. An edit snippet for a file that implements a current requirement must name the ADR decision behind the lead requirement. A superseded, deprecated, or retired lead requirement must get no must-keep-true or decision lines. A read or search row must name only the requirement's id, firmness and title and the symbol that implements it. Each host must cap the shared snippet at its own size budget. Snippet grounding must read both the requirement's frontmatter links and its relationship shard records. The Codex and ZCode edit hooks must describe each requirement-linked file at most once per session.
semantic_clauses:
  - Every Kibi host plugin must build its file knowledge snippet with the shared kibi-agent-core snippet builder.
  - An edit snippet for a file that implements a current requirement must state up to two facts that the lead requirement links through constrains, requires_property, requires_predicate, or requires_rule as what it must keep true.
  - An edit snippet for a file that implements a current requirement must name the ADR decision behind the lead requirement.
  - A superseded, deprecated, or retired lead requirement must get no must-keep-true or decision lines.
  - A read or search row must name only the requirement's id, firmness and title and the symbol that implements it.
  - Each host must cap the shared snippet at its own size budget.
  - Snippet grounding must read both the requirement's frontmatter links and its relationship shard records.
  - The Codex and ZCode edit hooks must describe each requirement-linked file at most once per session.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e5e4a73a5b9c9c0f2df9deec9ffc5d50e461ce60d0ebb864f816ed6ac0ce5256
semantic_inventory:
  - claim_key: CLAIM-D31A297558A2DB4D
    claim_text: Every Kibi host plugin must build its file knowledge snippet with the shared kibi-agent-core snippet builder
    role: normative
    status: modeled
    span:
      start: 0
      end: 108
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-FEDC6C187AD0C1F7
    claim_text: An edit snippet for a file that implements a current requirement must state up to two facts that the lead requirement links through constrains, requires_property, requires_predicate, or requires_rule as what it must keep true
    role: normative
    status: modeled
    span:
      start: 110
      end: 335
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-38E8C665D8CAA386
    claim_text: An edit snippet for a file that implements a current requirement must name the ADR decision behind the lead requirement
    role: normative
    status: modeled
    span:
      start: 337
      end: 456
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-A91BB4C0E5B8CC6B
    claim_text: A superseded, deprecated, or retired lead requirement must get no must-keep-true or decision lines
    role: normative
    status: modeled
    span:
      start: 458
      end: 556
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-811E8593D70C6DF4
    claim_text: A read or search row must name only the requirement's id, firmness and title and the symbol that implements it
    role: normative
    status: modeled
    span:
      start: 558
      end: 668
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-A8B41A3ADA698846
    claim_text: Each host must cap the shared snippet at its own size budget
    role: normative
    status: modeled
    span:
      start: 670
      end: 730
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-1296867D6F97CFFE
    claim_text: Snippet grounding must read both the requirement's frontmatter links and its relationship shard records
    role: normative
    status: modeled
    span:
      start: 732
      end: 835
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-ADC3F363B8076F7A
    claim_text: The Codex and ZCode edit hooks must describe each requirement-linked file at most once per session
    role: normative
    status: modeled
    span:
      start: 837
      end: 935
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
logic_claims:
  - CLAIM-D31A297558A2DB4D
  - CLAIM-FEDC6C187AD0C1F7
  - CLAIM-38E8C665D8CAA386
  - CLAIM-A91BB4C0E5B8CC6B
  - CLAIM-811E8593D70C6DF4
  - CLAIM-A8B41A3ADA698846
  - CLAIM-1296867D6F97CFFE
  - CLAIM-ADC3F363B8076F7A
origin:
  kind: agent
  approved_by: maintainer
  recorded_at: '2026-10-04T02:42:12.402Z'
id: REQ-agent-core-edit-snippets
type: req
---
Every Kibi host plugin must build its file knowledge snippet with the shared kibi-agent-core snippet builder. An edit snippet for a file that implements a current requirement must state up to two facts that the lead requirement links through constrains, requires_property, requires_predicate, or requires_rule as what it must keep true. An edit snippet for a file that implements a current requirement must name the ADR decision behind the lead requirement. A superseded, deprecated, or retired lead requirement must get no must-keep-true or decision lines. A read or search row must name only the requirement's id, firmness and title and the symbol that implements it. Each host must cap the shared snippet at its own size budget. Snippet grounding must read both the requirement's frontmatter links and its relationship shard records. The Codex and ZCode edit hooks must describe each requirement-linked file at most once per session.

## Why this changed

Reads and searches now get compact requirement rows (REQ-hook-read-rows-in-view) instead of a read snippet with requirement and test lines; edit snippets are unchanged.

## Source

> Maintainer approval of the read and search hook statements built on the Nov 25 cost analysis, statement 1 of 6 (rows of id, firmness, title and implementing symbol): 'Approve all as worded'.

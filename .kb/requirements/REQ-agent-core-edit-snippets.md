---
title: Host edit snippets come from one shared builder and say what a current requirement must keep true and why
status: open
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
semantic_text: Every Kibi host plugin must build its file knowledge snippet with the shared kibi-agent-core snippet builder. An edit snippet for a file that implements a current requirement must state up to two facts that the lead requirement links through constrains, requires_property, requires_predicate, or requires_rule as what it must keep true. An edit snippet for a file that implements a current requirement must name the ADR decision behind the lead requirement. A superseded, deprecated, or retired lead requirement must get no must-keep-true or decision lines. A read snippet must list only the requirement and test lines. Each host must cap the shared snippet at its own size budget. Snippet grounding must read both the requirement's frontmatter links and its relationship shard records. The Codex and ZCode edit hooks must describe each requirement-linked file at most once per session.
semantic_clauses:
  - Every Kibi host plugin must build its file knowledge snippet with the shared kibi-agent-core snippet builder.
  - An edit snippet for a file that implements a current requirement must state up to two facts that the lead requirement links through constrains, requires_property, requires_predicate, or requires_rule as what it must keep true.
  - An edit snippet for a file that implements a current requirement must name the ADR decision behind the lead requirement.
  - A superseded, deprecated, or retired lead requirement must get no must-keep-true or decision lines.
  - A read snippet must list only the requirement and test lines.
  - Each host must cap the shared snippet at its own size budget.
  - Snippet grounding must read both the requirement's frontmatter links and its relationship shard records.
  - The Codex and ZCode edit hooks must describe each requirement-linked file at most once per session.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 16c5dd393b68aeee8b18f8e8df2e7b0845c3e8f157fa20f7656006de87d1ec05
semantic_inventory:
  - claim_key: CLAIM-D31A297558A2DB4D
    claim_text: Every Kibi host plugin must build its file knowledge snippet with the shared kibi-agent-core snippet builder
    role: normative
    span:
      start: 0
      end: 108
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-FEDC6C187AD0C1F7
    claim_text: An edit snippet for a file that implements a current requirement must state up to two facts that the lead requirement links through constrains, requires_property, requires_predicate, or requires_rule as what it must keep true
    role: normative
    span:
      start: 110
      end: 335
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-38E8C665D8CAA386
    claim_text: An edit snippet for a file that implements a current requirement must name the ADR decision behind the lead requirement
    role: normative
    span:
      start: 337
      end: 456
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-A91BB4C0E5B8CC6B
    claim_text: A superseded, deprecated, or retired lead requirement must get no must-keep-true or decision lines
    role: normative
    span:
      start: 458
      end: 556
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-FD07112ACD545A12
    claim_text: A read snippet must list only the requirement and test lines
    role: normative
    span:
      start: 558
      end: 618
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-A8B41A3ADA698846
    claim_text: Each host must cap the shared snippet at its own size budget
    role: normative
    span:
      start: 620
      end: 680
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-1296867D6F97CFFE
    claim_text: Snippet grounding must read both the requirement's frontmatter links and its relationship shard records
    role: normative
    span:
      start: 682
      end: 785
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-ADC3F363B8076F7A
    claim_text: The Codex and ZCode edit hooks must describe each requirement-linked file at most once per session
    role: normative
    span:
      start: 787
      end: 885
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
logic_claims:
  - CLAIM-D31A297558A2DB4D
  - CLAIM-FEDC6C187AD0C1F7
  - CLAIM-38E8C665D8CAA386
  - CLAIM-A91BB4C0E5B8CC6B
  - CLAIM-FD07112ACD545A12
  - CLAIM-A8B41A3ADA698846
  - CLAIM-1296867D6F97CFFE
  - CLAIM-ADC3F363B8076F7A
origin:
  kind: agent
  recorded_at: '2026-10-04T02:42:12.402Z'
id: REQ-agent-core-edit-snippets
type: req
---
Every Kibi host plugin must build its file knowledge snippet with the shared kibi-agent-core snippet builder. An edit snippet for a file that implements a current requirement must state up to two facts that the lead requirement links through constrains, requires_property, requires_predicate, or requires_rule as what it must keep true. An edit snippet for a file that implements a current requirement must name the ADR decision behind the lead requirement. A superseded, deprecated, or retired lead requirement must get no must-keep-true or decision lines. A read snippet must list only the requirement and test lines. Each host must cap the shared snippet at its own size budget. Snippet grounding must read both the requirement's frontmatter links and its relationship shard records. The Codex and ZCode edit hooks must describe each requirement-linked file at most once per session.

## Rationale

An agent about to edit code that implements a requirement used to see only the requirement's ID, so the constraint and the decision behind it stayed one lookup away (changeset `richer-edit-snippets`). Every host plugin now shows the same grounding lines from one shared builder, and retired policy is never presented as something to keep true, so the snippet cannot steer an agent toward a superseded rule.

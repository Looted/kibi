---
title: Conditional requirement prose compiles to typed forbid rules, and conditionals Kibi cannot translate stay open gaps
status: open
priority: must
tags:
  - modeling
  - semantic-advisor
  - compile-intent
  - conditional
  - rules
  - ontology-gap
semantic_text: The semantic advisor, kb_compile_intent, and kb_model requirement mode must compile a single-comparison conditional clause on one subject property to a forbid rule that carries the comparison as its exception and is linked through requires_rule. A conditional clause they cannot translate must stay an ontology_gap proposition with no observation and no strict property. kb_model requirement mode must return an unresolved_conditional_clause warning for a conditional clause it cannot translate. A kb_model observation below the confidence threshold must be tagged review:ontology-gap and carry no claim key. kb_compile_intent scenario and test drafts must be applicable through kb_apply_plan with their prose in the step document body.
semantic_clauses:
  - The semantic advisor, kb_compile_intent, and kb_model requirement mode must compile a single-comparison conditional clause on one subject property to a forbid rule that carries the comparison as its exception and is linked through requires_rule.
  - A conditional clause they cannot translate must stay an ontology_gap proposition with no observation and no strict property.
  - kb_model requirement mode must return an unresolved_conditional_clause warning for a conditional clause it cannot translate.
  - A kb_model observation below the confidence threshold must be tagged review:ontology-gap and carry no claim key.
  - kb_compile_intent scenario and test drafts must be applicable through kb_apply_plan with their prose in the step document body.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a9132524fa7a34b99059a3f09773842d5c91e1af145983a701b62019694a717f
semantic_inventory:
  - claim_key: CLAIM-D72E6E4D1C2C7460
    claim_text: The semantic advisor, kb_compile_intent, and kb_model requirement mode must compile a single-comparison conditional clause on one subject property to a forbid rule that carries the comparison as its exception and is linked through requires_rule
    role: normative
    span:
      start: 0
      end: 244
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-D9B37E63F5344833
    claim_text: A conditional clause they cannot translate must stay an ontology_gap proposition with no observation and no strict property
    role: normative
    span:
      start: 246
      end: 369
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-24F9424F79C46E7B
    claim_text: kb_model requirement mode must return an unresolved_conditional_clause warning for a conditional clause it cannot translate
    role: normative
    span:
      start: 371
      end: 494
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-F247C630F9CCA419
    claim_text: A kb_model observation below the confidence threshold must be tagged review:ontology-gap and carry no claim key
    role: normative
    span:
      start: 496
      end: 607
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-C55A9879165FC4A7
    claim_text: kb_compile_intent scenario and test drafts must be applicable through kb_apply_plan with their prose in the step document body
    role: normative
    span:
      start: 609
      end: 735
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
logic_claims:
  - CLAIM-D72E6E4D1C2C7460
  - CLAIM-D9B37E63F5344833
  - CLAIM-24F9424F79C46E7B
  - CLAIM-F247C630F9CCA419
  - CLAIM-C55A9879165FC4A7
origin:
  kind: agent
  recorded_at: '2026-10-04T02:31:48.670Z'
id: REQ-kibi-conditional-requirement-authoring
type: req
---
The semantic advisor, kb_compile_intent, and kb_model requirement mode must compile a single-comparison conditional clause on one subject property to a forbid rule that carries the comparison as its exception and is linked through requires_rule. A conditional clause they cannot translate must stay an ontology_gap proposition with no observation and no strict property. kb_model requirement mode must return an unresolved_conditional_clause warning for a conditional clause it cannot translate. A kb_model observation below the confidence threshold must be tagged review:ontology-gap and carry no claim key. kb_compile_intent scenario and test drafts must be applicable through kb_apply_plan with their prose in the step document body.

## Rationale

Agents can now write "checkout may happen only when the cart total is positive" (or "checkout must not happen unless ...") and have Kibi compile it to a typed rule that feasibility checks use, and a conditional Kibi cannot translate stays an open gap instead of being stored as a note that looks modeled (changeset `conditional-requirements`). Compile-plan scenario and test drafts used to carry their prose in an entity property the schema rejects, so the what-if check and `kb_apply_plan` failed on them.

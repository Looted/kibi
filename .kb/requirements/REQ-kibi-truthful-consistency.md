---
title: Contradiction checks decide numeric and rule conflicts exactly and report unmodeled clauses as incomplete
status: open
priority: must
tags:
  - contradictions
  - prolog
  - requirement-proof
  - truthful-consistency
  - review:context-missing
semantic_text: Contradiction checking must decide numeric comparisons exactly, including strict greater-than and less-than bounds. Rule-versus-rule conflict checking must classify each rule pair as contradiction, disjoint, or unresolved. The proof ladder contradiction stage must report analysis incomplete instead of no conflict found for a requirement with unmodeled propositions.
semantic_clauses:
  - Contradiction checking must decide numeric comparisons exactly, including strict greater-than and less-than bounds.
  - Rule-versus-rule conflict checking must classify each rule pair as contradiction, disjoint, or unresolved.
  - The proof ladder contradiction stage must report analysis incomplete instead of no conflict found for a requirement with unmodeled propositions.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 45fca5abd96fe05c8789a331ea40f4151c255234e743a9fa99a68ad006b5c2d1
semantic_inventory:
  - claim_key: CLAIM-AF9ED781C6092797
    claim_text: Contradiction checking must decide numeric comparisons exactly, including strict greater-than and less-than bounds
    role: normative
    span:
      start: 0
      end: 114
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-2F166B678E2A7631
    claim_text: Rule-versus-rule conflict checking must classify each rule pair as contradiction, disjoint, or unresolved
    role: normative
    span:
      start: 116
      end: 221
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-76D1EE5598A1792E
    claim_text: The proof ladder contradiction stage must report analysis incomplete instead of no conflict found for a requirement with unmodeled propositions
    role: normative
    span:
      start: 223
      end: 366
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
logic_claims:
  - CLAIM-AF9ED781C6092797
  - CLAIM-2F166B678E2A7631
  - CLAIM-76D1EE5598A1792E
id: REQ-kibi-truthful-consistency
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Contradiction checking must decide numeric comparisons exactly, including strict greater-than and less-than bounds. Rule-versus-rule conflict checking must classify each rule pair as contradiction, disjoint, or unresolved. The proof ladder contradiction stage must report analysis incomplete instead of no conflict found for a requirement with unmodeled propositions.

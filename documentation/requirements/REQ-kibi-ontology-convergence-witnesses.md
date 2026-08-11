---
id: REQ-kibi-ontology-convergence-witnesses
title: Predicate schemas converge conservatively and contradictions expose exact witnesses
status: open
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/requirements/REQ-kibi-ontology-convergence-witnesses.md
priority: must
tags: [requirements, ontology, predicates, contradictions, prolog, witnesses]
logic_claims:
  - CLAIM-B3F961E54107D338
  - CLAIM-5D43551AD833A708
  - CLAIM-5B6FF50A712800D9
  - CLAIM-3D6B9481D6460349
semantic_clauses:
  - Predicate suggestion must discover existing project-local schemas from normalized RDF
  - It must not emit an applicable predicate plan until every ordered argument has an exact binding
  - Domain contradiction diagnostics must attach source-bound witnesses for strict properties, ground predicates, and safe rules
  - Rule overlap that cannot be proved or excluded must remain unresolved in requirement proof
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 544adba7a37fa1497373b9a2b502f09e40d2b7267c64a50a6f1b69f90a7c6599
semantic_inventory:
  - claim_key: CLAIM-B3F961E54107D338
    claim_text: Predicate suggestion must discover existing project-local schemas from normalized RDF
    role: normative
    status: modeled
    span: {start: 0, end: 85}
  - claim_key: CLAIM-5D43551AD833A708
    claim_text: It must not emit an applicable predicate plan until every ordered argument has an exact binding
    role: normative
    status: modeled
    span: {start: 87, end: 182}
  - claim_key: CLAIM-5B6FF50A712800D9
    claim_text: Domain contradiction diagnostics must attach source-bound witnesses for strict properties, ground predicates, and safe rules
    role: normative
    status: modeled
    span: {start: 184, end: 308}
  - claim_key: CLAIM-3D6B9481D6460349
    claim_text: Rule overlap that cannot be proved or excluded must remain unresolved in requirement proof
    role: normative
    status: modeled
    span: {start: 310, end: 400}
links:
  - type: depends_on
    target: REQ-mcp-suggest-predicates
  - type: depends_on
    target: REQ-kibi-logical-requirement-coverage
  - type: specified_by
    target: SCEN-kibi-ontology-convergence-witnesses
  - type: requires_predicate
    target: FACT-ONTOLOGY-SCHEMA-DISCOVERY
  - type: requires_predicate
    target: FACT-ONTOLOGY-EXACT-BINDINGS
  - type: requires_predicate
    target: FACT-CONTRADICTION-SOURCE-WITNESSES
  - type: requires_predicate
    target: FACT-RULE-OVERLAP-UNRESOLVED
---

Predicate suggestion must discover existing project-local schemas from normalized RDF. It must not emit an applicable predicate plan until every ordered argument has an exact binding. Domain contradiction diagnostics must attach source-bound witnesses for strict properties, ground predicates, and safe rules. Rule overlap that cannot be proved or excluded must remain unresolved in requirement proof.

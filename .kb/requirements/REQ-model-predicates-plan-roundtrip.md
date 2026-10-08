---
title: Predicate modeling plans apply through kb_upsert as returned
status: open
priority: must
tags:
  - modeling
  - predicates
  - mcp
semantic_text: Predicate modeling must return an ontology gap observation plan that kb_upsert accepts unchanged. Predicate modeling must return grounding replacement steps that kb_upsert and kb_delete accept unchanged in their stated order.
semantic_clauses:
  - Predicate modeling must return an ontology gap observation plan that kb_upsert accepts unchanged.
  - Predicate modeling must return grounding replacement steps that kb_upsert and kb_delete accept unchanged in their stated order.
logic_claims:
  - CLAIM-324F37A04D59371F
  - CLAIM-679EBC49D4D11F37
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8d89fac8b01e1dfc6992e2076d9055d73cbef3ed653a24e66faea0fe4eefcb0f
semantic_inventory:
  - claim_key: CLAIM-324F37A04D59371F
    claim_text: Predicate modeling must return an ontology gap observation plan that kb_upsert accepts unchanged
    role: normative
    status: modeled
    span:
      start: 0
      end: 96
  - claim_key: CLAIM-679EBC49D4D11F37
    claim_text: Predicate modeling must return grounding replacement steps that kb_upsert and kb_delete accept unchanged in their stated order
    role: normative
    status: modeled
    span:
      start: 98
      end: 224
origin:
  kind: agent
  recorded_at: '2026-10-08T08:34:10.426Z'
id: REQ-model-predicates-plan-roundtrip
type: req
---
Predicate modeling must return an ontology gap observation plan that kb_upsert accepts unchanged. Predicate modeling must return grounding replacement steps that kb_upsert and kb_delete accept unchanged in their stated order.

## Context

An external agent onboarding a test project with Kibi 2.10.0 and kibi-mcp 3.5.0 could not apply the ontology-gap `applyPlan` that `kb_model` mode `predicates` returned: `kb_upsert` rejected its `relates_to` relationship to the `review:ontology-gap` tag with "Target entity does not exist" on 26 of 26 attempts, and the plan put a `claim_key` on the observation, which makes a review note look like a semantic claim. The agent had to strip both and add a `document.body` before the plan passed. The `replace_grounding` plan had never been applied: its requirement step lacked the required `title` and `status`, and nothing said that the claim is ungrounded between the retraction and the new link. Kibi's own plans should pass Kibi's own write path unchanged.

## Source

Onboarding evaluation round 6 analysis (2026-10-08), finding K9.
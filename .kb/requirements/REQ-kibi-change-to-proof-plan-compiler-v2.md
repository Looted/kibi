---
title: Kibi compiles intent into reviewable plans and applies a compile plan all-or-nothing with a recovery journal
status: open
priority: must
tags:
  - planning
  - compile-intent
  - apply-plan
  - atomic
  - journal
  - recovery
semantic_text: Kibi must compile a natural-language change request into a deterministic, read-only plan containing a clause-complete proposition ledger, requirement/scenario/test drafts, traceability proposals, contradiction witnesses, and explicit abstentions for ambiguity or ontology gaps. Applying a compile plan must require the returned plan hash. A compile plan application must commit all of its steps in one store transaction or leave the store and the workspace unchanged. Before its first write, a compile plan application must record a durable journal with the plan hash, the before and after bytes of every workspace file it changes, and every store upsert. The next kb_apply_plan, kb_upsert, or kb_delete call must complete or roll back an interrupted compile plan application from its journal and report which. Recovery must change nothing and fail with PARTIAL_COMMIT_REPAIR_REQUIRED when a journaled file is at neither its before nor its after hash.
semantic_clauses:
  - Kibi must compile a natural-language change request into a deterministic, read-only plan containing a clause-complete proposition ledger, requirement/scenario/test drafts, traceability proposals, contradiction witnesses, and explicit abstentions for ambiguity or ontology gaps.
  - Applying a compile plan must require the returned plan hash.
  - A compile plan application must commit all of its steps in one store transaction or leave the store and the workspace unchanged.
  - Before its first write, a compile plan application must record a durable journal with the plan hash, the before and after bytes of every workspace file it changes, and every store upsert.
  - The next kb_apply_plan, kb_upsert, or kb_delete call must complete or roll back an interrupted compile plan application from its journal and report which.
  - Recovery must change nothing and fail with PARTIAL_COMMIT_REPAIR_REQUIRED when a journaled file is at neither its before nor its after hash.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a605a729bfb45e6650ce73d730250585cad2df4ed34f73afeb0f2e39518c6647
semantic_inventory:
  - claim_key: CLAIM-56B69F79B13EB024
    claim_text: Kibi must compile a natural-language change request into a deterministic, read-only plan containing a clause-complete proposition ledger, requirement/scenario/test drafts, traceability proposals, contradiction witnesses, and explicit abstentions for ambiguity or ontology gaps
    role: normative
    span:
      start: 0
      end: 276
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-875CFEE228088FD0
    claim_text: Applying a compile plan must require the returned plan hash
    role: normative
    span:
      start: 278
      end: 337
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-E1FC8188B2B9D096
    claim_text: A compile plan application must commit all of its steps in one store transaction or leave the store and the workspace unchanged
    role: normative
    span:
      start: 339
      end: 466
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-E6948C655D374651
    claim_text: Before its first write, a compile plan application must record a durable journal with the plan hash, the before and after bytes of every workspace file it changes, and every store upsert
    role: normative
    span:
      start: 468
      end: 654
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-0D4D25EDD5C32338
    claim_text: The next kb_apply_plan, kb_upsert, or kb_delete call must complete or roll back an interrupted compile plan application from its journal and report which
    role: normative
    span:
      start: 656
      end: 809
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-F986051868A08A5A
    claim_text: Recovery must change nothing and fail with PARTIAL_COMMIT_REPAIR_REQUIRED when a journaled file is at neither its before nor its after hash
    role: normative
    span:
      start: 811
      end: 950
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
logic_claims:
  - CLAIM-56B69F79B13EB024
  - CLAIM-875CFEE228088FD0
  - CLAIM-E1FC8188B2B9D096
  - CLAIM-E6948C655D374651
  - CLAIM-0D4D25EDD5C32338
  - CLAIM-F986051868A08A5A
origin:
  kind: agent
  recorded_at: '2026-10-04T02:20:20.404Z'
id: REQ-kibi-change-to-proof-plan-compiler-v2
type: req
---
Kibi must compile a natural-language change request into a deterministic, read-only plan containing a clause-complete proposition ledger, requirement/scenario/test drafts, traceability proposals, contradiction witnesses, and explicit abstentions for ambiguity or ontology gaps. Applying a compile plan must require the returned plan hash. A compile plan application must commit all of its steps in one store transaction or leave the store and the workspace unchanged. Before its first write, a compile plan application must record a durable journal with the plan hash, the before and after bytes of every workspace file it changes, and every store upsert. The next kb_apply_plan, kb_upsert, or kb_delete call must complete or roll back an interrupted compile plan application from its journal and report which. Recovery must change nothing and fail with PARTIAL_COMMIT_REPAIR_REQUIRED when a journaled file is at neither its before nor its after hash.

## Rationale

`kb_apply_plan` used to execute approved steps one by one, so a failure after the first step left a half-applied plan that needed manual repair. It now applies a compile plan all-or-nothing: if any step fails the store and the workspace are left as they were and the same plan can be applied again, and if the process dies mid-application the next mutating call completes or rolls back the plan from its journal and reports which (changeset `atomic-apply-plan`). The superseded requirement said approved mutations execute sequentially; the compile clause carries over unchanged.

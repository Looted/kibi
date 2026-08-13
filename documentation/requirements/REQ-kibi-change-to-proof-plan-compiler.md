---
id: REQ-kibi-change-to-proof-plan-compiler
title: Kibi compiles intent into reviewable requirement and proof plans
status: open
created_at: 2026-08-13T00:00:00Z
updated_at: 2026-08-13T00:00:00Z
source: documentation/requirements/REQ-kibi-change-to-proof-plan-compiler.md
priority: must
owner: platform-team
tags: [planning, requirements, prolog, contradiction, traceability, proof-runtime]
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 23c490d5320cfad82942db1d9ba6c5f5bd9f4d1b4af154ef0673e898389b5b63
logic_claims: ["CLAIM-56B69F79B13EB024","CLAIM-A80F593EB1011497"]
semantic_inventory: [{"claim_key":"CLAIM-56B69F79B13EB024","claim_text":"Kibi must compile a natural-language change request into a deterministic, read-only plan containing a clause-complete proposition ledger, requirement/scenario/test drafts, traceability proposals, contradiction witnesses, and explicit abstentions for ambiguity or ontology gaps","role":"normative","status":"modeled","span":{"start":0,"end":276},"payload_hash":"c77db485d0609d41a6f2a043711fc03f5854a22d975610bec19feb9758d4ba46","reason":"This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete."},{"claim_key":"CLAIM-A80F593EB1011497","claim_text":"Applying a plan must require the returned plan hash and execute approved mutations sequentially with a structured result","role":"normative","status":"modeled","span":{"start":278,"end":398},"payload_hash":"c77db485d0609d41a6f2a043711fc03f5854a22d975610bec19feb9758d4ba46","reason":"This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete."}]
links:
  - type: constrains
    target: FACT-REQ-PROOF-PLAN-SUBJECT
  - type: requires_property
    target: FACT-REQ-PROOF-PLAN-LEDGER
  - type: requires_property
    target: FACT-REQ-PROOF-PLAN-HASH-GUARD
  - type: specified_by
    target: SCEN-kibi-change-to-proof-plan-compiler
  - type: verified_by
    target: TEST-kibi-change-to-proof-plan-compiler
---

Kibi must compile a natural-language change request into a deterministic, read-only plan containing a clause-complete proposition ledger, requirement/scenario/test drafts, traceability proposals, contradiction witnesses, and explicit abstentions for ambiguity or ontology gaps. Applying a plan must require the returned plan hash and execute approved mutations sequentially with a structured result.

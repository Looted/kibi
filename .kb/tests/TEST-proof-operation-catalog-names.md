---
title: A Kibi catalog operation shall be one of the 25 operations the catalog names, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-operation-catalog-names
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-operation-catalog
    field: name
  proves:
    - CLAIM-62E78938175836BF
origin:
  kind: agent
  recorded_at: '2026-10-28T22:38:38.832Z'
id: TEST-proof-operation-catalog-names
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-cef7ee4db482900d81fa368a
    test_id: TEST-proof-operation-catalog-names
    scope: unit
    outcome: passed
    code_snapshot: 3cbdf32b0ca578c0e6fb1cb36066284a666736978a016aff5518fbb451bb6544
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-20T04:36:15.592Z'
    finished_at: '2026-11-20T04:36:16.838Z'
    artifact_digest: 029ae74c9fc1d1036e9ff50944c2cab86becd1188736342b53061655bca358f6
    contract_hash: 798dceba719eb2e27df7a9779d2686765151e9c2ad711287ccc118b79bb3ed4f
    binding_hash: 5470fed7fa0b089b739b9fa43335299c76922609a0a25f203a4a9e2a694b3f96
    fingerprint: a3d560499a01c2ea46dd98d2ce9f3e7f49a48c69ddbc2de86cd85f6a8a9a5c43
    fingerprint_components:
      contract: 798dceba719eb2e27df7a9779d2686765151e9c2ad711287ccc118b79bb3ed4f
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-proof-operation-catalog-names
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-operation-catalog-names
      domain:
        symbol_id: SYM-operation-catalog
        members:
          - kb_skills_list
          - kb_skills_load
          - kb_skills_read
          - kb_skills
          - kb_query
          - kb_search
          - kb_status
          - kb_find_gaps
          - kb_coverage
          - kb_graph
          - kb_semantic_advisor
          - kb_model_requirement
          - kb_suggest_predicates
          - kb_model
          - kb_plan_bootstrap
          - kb_validate_upsert
          - kb_upsert
          - kb_record
          - kb_delete
          - kb_check
          - kb_prepare_impact_review
          - kb_author_impact_review
          - kb_review_firm_edit
          - kb_sparql_remote
          - kb_compile_intent
          - kb_apply_plan
          - kb_ingest_proof
      results:
        - member: kb_skills_list
          outcome: passed
        - member: kb_skills_load
          outcome: passed
        - member: kb_skills_read
          outcome: passed
        - member: kb_skills
          outcome: passed
        - member: kb_query
          outcome: passed
        - member: kb_search
          outcome: passed
        - member: kb_status
          outcome: passed
        - member: kb_find_gaps
          outcome: passed
        - member: kb_coverage
          outcome: passed
        - member: kb_graph
          outcome: passed
        - member: kb_semantic_advisor
          outcome: passed
        - member: kb_model_requirement
          outcome: passed
        - member: kb_suggest_predicates
          outcome: passed
        - member: kb_model
          outcome: passed
        - member: kb_plan_bootstrap
          outcome: passed
        - member: kb_validate_upsert
          outcome: passed
        - member: kb_upsert
          outcome: passed
        - member: kb_record
          outcome: passed
        - member: kb_delete
          outcome: passed
        - member: kb_check
          outcome: passed
        - member: kb_prepare_impact_review
          outcome: passed
        - member: kb_author_impact_review
          outcome: passed
        - member: kb_review_firm_edit
          outcome: passed
        - member: kb_sparql_remote
          outcome: passed
        - member: kb_compile_intent
          outcome: passed
        - member: kb_apply_plan
          outcome: passed
        - member: kb_ingest_proof
          outcome: passed
    certificate_digest: deffcda611b5f97312d3bea084b7273546cc7b3cd331d7804d30d172c109a0f8
    claim_bindings:
      - claim_key: CLAIM-62E78938175836BF
        requirement_id: REQ-kibi-operation-catalog-names
        fact_id: FACT-operation-catalog-names
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - kb_apply_plan
            - kb_author_impact_review
            - kb_check
            - kb_compile_intent
            - kb_coverage
            - kb_delete
            - kb_find_gaps
            - kb_graph
            - kb_ingest_proof
            - kb_model
            - kb_model_requirement
            - kb_plan_bootstrap
            - kb_prepare_impact_review
            - kb_query
            - kb_record
            - kb_review_firm_edit
            - kb_search
            - kb_semantic_advisor
            - kb_skills
            - kb_skills_list
            - kb_skills_load
            - kb_skills_read
            - kb_sparql_remote
            - kb_status
            - kb_suggest_predicates
            - kb_upsert
            - kb_validate_upsert
---
Proves that a Kibi catalog operation shall be one of the 24 operations the catalog names, against the code Kibi reads at ingest.
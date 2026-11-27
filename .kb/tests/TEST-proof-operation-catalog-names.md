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
    receipt_id: PR-9370a8b9e26965814052b184
    test_id: TEST-proof-operation-catalog-names
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 9c8b13fc42fd0f82cf59713a376c612ea969bd3721a88c628ba4c40a1ca2f92f
    binding_hash: de37f364df44b46787c6df581f71faf61e9d160007264ea459dddcf39287aec1
    fingerprint: 30775271e4d703616fc247a89429b5dab1bc5ed552919c8ff45bfa24c2aacbc0
    fingerprint_components:
      contract: 9c8b13fc42fd0f82cf59713a376c612ea969bd3721a88c628ba4c40a1ca2f92f
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
    evidence_level: tested
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
      - claim_key: CLAIM-E336EB29BBCA15CD
        requirement_id: REQ-kibi-operation-catalog-names
        fact_id: FACT-operation-catalog-names
        binding: rejected
        obligation:
          kind: set_equals
          members:
            - kb_apply_plan
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
        reason: the domain members Kibi read are not FACT-operation-catalog-names's set (not in the set kb_author_impact_review)
---
Proves that a Kibi catalog operation shall be one of the 24 operations the catalog names, against the code Kibi reads at ingest.
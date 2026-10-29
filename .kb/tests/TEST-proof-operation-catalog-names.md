---
title: A Kibi catalog operation shall be one of the 24 operations the catalog names, by an exhaustive proof
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
    - CLAIM-9647A6984DF59611
origin:
  kind: agent
  recorded_at: '2026-10-28T22:38:38.832Z'
id: TEST-proof-operation-catalog-names
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-435b7cfc316c9317d064eca5
    test_id: TEST-proof-operation-catalog-names
    scope: unit
    outcome: passed
    code_snapshot: 1619578ae16102858195e7fd455f112bc688d764b648588834ddbf2c07ed739b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:40:04.961Z'
    finished_at: '2026-10-28T22:40:05.161Z'
    artifact_digest: bee14a746b7e34619bf20ca63971c6b711a630f0469d93b04e0f31c87a845cd6
    contract_hash: c43501cb74f9542c0320377feaa084ca2471103c2b4be471acab600f429f9ef4
    binding_hash: 6a0c376fd386e65b539f459002c99535e69863e177485540f2bb863e2aed224c
    fingerprint: 4a1792ce021456924fdfa85477f0d1e502d4cfd372890fd5357b6aebb2afdf9b
    fingerprint_components:
      contract: c43501cb74f9542c0320377feaa084ca2471103c2b4be471acab600f429f9ef4
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
          - kb_delete
          - kb_check
          - kb_prepare_impact_review
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
        - member: kb_delete
          outcome: passed
        - member: kb_check
          outcome: passed
        - member: kb_prepare_impact_review
          outcome: passed
        - member: kb_sparql_remote
          outcome: passed
        - member: kb_compile_intent
          outcome: passed
        - member: kb_apply_plan
          outcome: passed
        - member: kb_ingest_proof
          outcome: passed
    certificate_digest: c9572fbea94ea7dd85a22f1ad71d24b15330dab81b26f7ac7359e149d6989e6f
    claim_bindings:
      - claim_key: CLAIM-9647A6984DF59611
        requirement_id: REQ-kibi-operation-catalog-names
        fact_id: FACT-operation-catalog-names
        binding: derived
        scope: code
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
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
    - CLAIM-5D894E84FA104A78
origin:
  kind: agent
  recorded_at: '2026-10-28T22:38:38.832Z'
id: TEST-proof-operation-catalog-names
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-db0262878db12ada2def9a07
    test_id: TEST-proof-operation-catalog-names
    scope: unit
    outcome: passed
    code_snapshot: e1bd8a80fa17d4458d04cf69090de97f0009b437dd1fb759547530d10d7f6bf9
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T09:36:37.354Z'
    finished_at: '2026-11-16T09:36:37.615Z'
    artifact_digest: d72be8bc900378bcd3d188008ceb963e748d81119b236b9b95ee8aebc5280151
    contract_hash: 3874a21052eff35dfbf97e418bb4e44a10758dfcfe0593b59c9822e417847005
    binding_hash: f2bf1f806b2c7fe144159394431155d320b7c017c446e0a6deca031d791b923c
    fingerprint: e62a504a72ce8de68b4f5c8423999c1cf7090183c70823ac33d33538e594a9d3
    fingerprint_components:
      contract: 3874a21052eff35dfbf97e418bb4e44a10758dfcfe0593b59c9822e417847005
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
        - member: kb_delete
          outcome: passed
        - member: kb_check
          outcome: passed
        - member: kb_prepare_impact_review
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
    certificate_digest: 6d8a5b203cc37b4be69c111a7e9eb545bf917a70f6782d3db1acfd21f0ad53e6
    claim_bindings:
      - claim_key: CLAIM-5D894E84FA104A78
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
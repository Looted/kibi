---
title: The required SWI-Prolog libraries shall be semweb/rdf_db, semweb/rdf_persistency, semweb/sparql_client, pcre, crypto, sha, http/json, http/json_convert, chr, clpfd, thread, persistency, filesex, readutil, date, aggregate and solution_sequences, by an exhaustive proof
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
    - symbol_id: SYM-proof-required-swipl-libraries
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-prolog-swipl-required-swipl-libraries-src
  proves:
    - CLAIM-D471C4F1472AA73D
origin:
  kind: agent
  recorded_at: '2026-10-28T19:22:16.482Z'
id: TEST-proof-required-swipl-libraries
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-642d208db070011523c32b37
    test_id: TEST-proof-required-swipl-libraries
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 55cd1813b1ab19770823e21be3044ca0d4e7387c3d7274b933fb51ea6d5429af
    binding_hash: 6ef398c311507a9343ba97003dc1f963243f19c725b4f03b78895244f18a2a8b
    fingerprint: ea80c88948047495ee1ca42afc5d69d968103b5eff62b6810fc02942b812a278
    fingerprint_components:
      contract: 55cd1813b1ab19770823e21be3044ca0d4e7387c3d7274b933fb51ea6d5429af
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
      - symbol_id: SYM-proof-required-swipl-libraries
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
      test_id: TEST-proof-required-swipl-libraries
      domain:
        symbol_id: SYM-prolog-swipl-required-swipl-libraries-src
        members:
          - semweb/rdf_db
          - semweb/rdf_persistency
          - semweb/sparql_client
          - pcre
          - crypto
          - sha
          - http/json
          - http/json_convert
          - chr
          - clpfd
          - thread
          - persistency
          - filesex
          - readutil
          - date
          - aggregate
          - solution_sequences
      results:
        - member: semweb/rdf_db
          outcome: passed
        - member: semweb/rdf_persistency
          outcome: passed
        - member: semweb/sparql_client
          outcome: passed
        - member: pcre
          outcome: passed
        - member: crypto
          outcome: passed
        - member: sha
          outcome: passed
        - member: http/json
          outcome: passed
        - member: http/json_convert
          outcome: passed
        - member: chr
          outcome: passed
        - member: clpfd
          outcome: passed
        - member: thread
          outcome: passed
        - member: persistency
          outcome: passed
        - member: filesex
          outcome: passed
        - member: readutil
          outcome: passed
        - member: date
          outcome: passed
        - member: aggregate
          outcome: passed
        - member: solution_sequences
          outcome: passed
    certificate_digest: 03eb76645e820676a729b6f83f7930a42d9ad18dc0e8aed88c7c3589950825f9
    claim_bindings:
      - claim_key: CLAIM-D471C4F1472AA73D
        requirement_id: REQ-prolog-runtime-libraries
        fact_id: FACT-required-swipl-libraries
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - aggregate
            - chr
            - clpfd
            - crypto
            - date
            - filesex
            - http/json
            - http/json_convert
            - pcre
            - persistency
            - readutil
            - semweb/rdf_db
            - semweb/rdf_persistency
            - semweb/sparql_client
            - sha
            - solution_sequences
            - thread
---
Proves that the required SWI-Prolog libraries shall be semweb/rdf_db, semweb/rdf_persistency, semweb/sparql_client, pcre, crypto, sha, http/json, http/json_convert, chr, clpfd, thread, persistency, filesex, readutil, date, aggregate and solution_sequences, against the code Kibi reads at ingest.
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
    receipt_id: PR-5b8071e1fba4ddc7156d11c2
    test_id: TEST-proof-required-swipl-libraries
    scope: unit
    outcome: passed
    code_snapshot: 48cc5f2c6340fb17a7d99816b8c9a340c61bcad65b834285c14663cdc1f2d7fa
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:23:05.989Z'
    finished_at: '2026-10-28T19:23:06.131Z'
    artifact_digest: d11eed4c5f4bcfad34e0a842ff72fd2a1dd1ec0b2a3d2bdbcd57a94724975a36
    contract_hash: 55cd1813b1ab19770823e21be3044ca0d4e7387c3d7274b933fb51ea6d5429af
    binding_hash: 25cb2acb9245648959016f7c90285df963935cc56c68ce74dad838f4cb27efcd
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
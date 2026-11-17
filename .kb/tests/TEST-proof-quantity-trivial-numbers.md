---
title: The numbers Kibi check treats as too trivial to compare are 0 and 1, by an exhaustive proof
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
    - symbol_id: SYM-proof-quantity-trivial-numbers
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-const-quantity-trivial-numbers
  proves:
    - CLAIM-D2CBDFD589DF53F1
origin:
  kind: agent
  recorded_at: '2026-11-17T06:00:04.920Z'
id: TEST-proof-quantity-trivial-numbers
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f82c792d974998077ca7806c
    test_id: TEST-proof-quantity-trivial-numbers
    scope: unit
    outcome: passed
    code_snapshot: 85b2624165d7e44fc735b108a25d4917ae5c54792c3260a53e21c812ec79a72a
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T06:05:04.601Z'
    finished_at: '2026-11-17T06:05:23.072Z'
    artifact_digest: 30a9ef74c4d8f99d3cbcf7212d200154a20a5377764de71fb25335bed5f462b9
    contract_hash: 15b6f7225044238dadae703ef40b69bf4c1f3448d4a9217c76a5a38dc01251f3
    binding_hash: ead3c6c6c79cc23f2c74b62ad60a917bb02b14b361610571b41ccf87006b471f
    fingerprint: dcad30b74d0a77e53a0b98bad0d92af1fad5798d4db8b6455123f26f795d513b
    fingerprint_components:
      contract: 15b6f7225044238dadae703ef40b69bf4c1f3448d4a9217c76a5a38dc01251f3
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
      - symbol_id: SYM-proof-quantity-trivial-numbers
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
      test_id: TEST-proof-quantity-trivial-numbers
      domain:
        symbol_id: SYM-const-quantity-trivial-numbers
        members:
          - '0'
          - '1'
      results:
        - member: '0'
          outcome: passed
        - member: '1'
          outcome: passed
    certificate_digest: 893f9752846dedd5dc414fee3fcaa2e63e69cfa83155ef688ae69b38c871037e
    claim_bindings:
      - claim_key: CLAIM-D2CBDFD589DF53F1
        requirement_id: REQ-check-quantity-duplicate-trivial-values
        fact_id: FACT-check-quantity-duplicate-trivial-numbers
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - '0'
            - '1'
---
Proves that the numbers the quantity-duplicate check treats as too trivial to compare are exactly 0 and 1, against the code Kibi reads at ingest.
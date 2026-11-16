---
title: A certificate proof kind shall be exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source, by an exhaustive proof
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
    - symbol_id: SYM-proof-certificate-proof-kinds
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-const-certificate-proof-kinds
  proves:
    - CLAIM-D723EBD2E0400142
origin:
  kind: agent
  recorded_at: '2026-10-29T16:45:36.383Z'
id: TEST-proof-certificate-proof-kinds
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a7f068eec7a6288c4d9373ca
    test_id: TEST-proof-certificate-proof-kinds
    scope: unit
    outcome: passed
    code_snapshot: 11f442c7ec4bb6d8777db81ff07ba6a13346fd4d39b9ff7058236e99adc44d21
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T12:24:03.034Z'
    finished_at: '2026-11-16T12:24:32.903Z'
    artifact_digest: 1bbb6b9d182a9bfb24ff6904410f4b4360b68d3d7cb4e22c1a4598f12fc5a58f
    contract_hash: f3fe3b52ef85b0cabbeddec662d1a15a0fc650f5233260212504fd4f86177a0b
    binding_hash: 7c2ec68fb36ab69a87fcca9e5af84c861800ea9a7162a917e22a2cf3ca6f4240
    fingerprint: 77aed6a425e41bc87d70d6dc2120197f85c26573b6310d8d2ea3ba9d68a1efda
    fingerprint_components:
      contract: f3fe3b52ef85b0cabbeddec662d1a15a0fc650f5233260212504fd4f86177a0b
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
      - symbol_id: SYM-proof-certificate-proof-kinds
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
      test_id: TEST-proof-certificate-proof-kinds
      domain:
        symbol_id: SYM-const-certificate-proof-kinds
        members:
          - exhaustive
          - typecheck
          - arithmetic
          - smt
          - rule
          - state_machine
          - regex
          - source
      results:
        - member: exhaustive
          outcome: passed
        - member: typecheck
          outcome: passed
        - member: arithmetic
          outcome: passed
        - member: smt
          outcome: passed
        - member: rule
          outcome: passed
        - member: state_machine
          outcome: passed
        - member: regex
          outcome: passed
        - member: source
          outcome: passed
    certificate_digest: 931c401489aeec59d3a1a30b6408e9f9cd573b0ffc320b3deac5781b8682631c
    claim_bindings:
      - claim_key: CLAIM-D723EBD2E0400142
        requirement_id: REQ-kibi-proof-vocabulary
        fact_id: FACT-certificate-proof-kinds
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - arithmetic
            - exhaustive
            - regex
            - rule
            - smt
            - source
            - state_machine
            - typecheck
---
Proves that a certificate proof kind shall be exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source, against the code Kibi reads at ingest.
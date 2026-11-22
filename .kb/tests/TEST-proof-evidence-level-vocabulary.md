---
title: Kibi evidence levels shall be proved, tested, asserted and unverified, by an exhaustive proof
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
    - symbol_id: SYM-proof-evidence-level-vocabulary
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-cli-evidence-levels
  proves:
    - CLAIM-ABCB82718BC90BF2
origin:
  kind: agent
  recorded_at: '2026-10-28T10:06:11.219Z'
id: TEST-proof-evidence-level-vocabulary
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-69586b0d8ce3700fe4190161
    test_id: TEST-proof-evidence-level-vocabulary
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 55d9da62d52424f5e42b594d4fc7685b4e9dd490ee6399d179a9414a2f8434ae
    binding_hash: 3abfed1024663d8ccedb2e6998a554326aa182f6987bf43007a6cf5f5d378295
    fingerprint: eccd8d02aae10ccac140a0e5054823c4f34c1bc9534d86b07acc7f50c8b4695a
    fingerprint_components:
      contract: 55d9da62d52424f5e42b594d4fc7685b4e9dd490ee6399d179a9414a2f8434ae
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
      - symbol_id: SYM-proof-evidence-level-vocabulary
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
      test_id: TEST-proof-evidence-level-vocabulary
      domain:
        symbol_id: SYM-cli-evidence-levels
        members:
          - proved
          - tested
          - asserted
          - unverified
      results:
        - member: proved
          outcome: passed
        - member: tested
          outcome: passed
        - member: asserted
          outcome: passed
        - member: unverified
          outcome: passed
    certificate_digest: 106021b3e908d7c6aa3f69d5792aae6e4b4ddbf72661639e8e81586a0d4a5e8b
    claim_bindings:
      - claim_key: CLAIM-ABCB82718BC90BF2
        requirement_id: REQ-kibi-evidence-level-vocabulary
        fact_id: FACT-evidence-level-vocabulary
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - asserted
            - proved
            - tested
            - unverified
---
Proves that kibi evidence levels shall be proved, tested, asserted and unverified, against the code Kibi reads at ingest.
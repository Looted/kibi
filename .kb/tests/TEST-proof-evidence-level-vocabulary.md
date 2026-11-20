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
    receipt_id: PR-941f523008b31acea4265b79
    test_id: TEST-proof-evidence-level-vocabulary
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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
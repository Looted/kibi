---
title: The legacy Kibi environment file shall be .env, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-env-legacy-file
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-env-bootstrap-kibi-legacy-env-file
  proves:
    - CLAIM-1F71DA2071DB7162
origin:
  kind: agent
  recorded_at: '2026-10-28T10:41:08.805Z'
id: TEST-proof-env-legacy-file
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-92cddc175110dce62d441f7a
    test_id: TEST-proof-env-legacy-file
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 0a5235e71958f59542a1543e6c8ebbe358f0672d05d75a648a8f496a072f4f8b
    binding_hash: fd7fff8444181c3bdfab15130c95315a7da5046e6cfbc2d98de3edf6bbb1acc7
    fingerprint: 71d04c38333f48e286389b67a705273299462188afda014e7832f51523e270c6
    fingerprint_components:
      contract: 0a5235e71958f59542a1543e6c8ebbe358f0672d05d75a648a8f496a072f4f8b
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
      - symbol_id: SYM-proof-env-legacy-file
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-env-legacy-file
      pattern:
        symbol_id: SYM-env-bootstrap-kibi-legacy-env-file
        type: string
        value: .env
    certificate_digest: aff7774e5e2ea93c0b86b004f5ea2df4678833fb0c6d72a12bcb65980d67a7f4
    claim_bindings:
      - claim_key: CLAIM-1F71DA2071DB7162
        requirement_id: REQ-kibi-env-bootstrap-files
        fact_id: FACT-env-legacy-file
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .env
---
Proves that the legacy Kibi environment file shall be .env, against the code Kibi reads at ingest.
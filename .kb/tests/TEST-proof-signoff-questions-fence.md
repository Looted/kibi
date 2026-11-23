---
title: The signoff questions fence shall be kibi-questions, by a regex proof
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
    - symbol_id: SYM-proof-signoff-questions-fence
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-signoff-model-signoff-fences
    export: SIGNOFF_FENCES.questions
  proves:
    - CLAIM-67426D4B8A8EC1F8
origin:
  kind: agent
  recorded_at: '2026-10-29T10:47:03.287Z'
id: TEST-proof-signoff-questions-fence
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-dcc165ca30887aaae382ef54
    test_id: TEST-proof-signoff-questions-fence
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: c36cc4e8d12e4ad87975e120e2864a9b6e4f735e409babc8f8ec8fb27d1b8cb4
    binding_hash: af907ba2312a042758935f52ff1c2f4009f611452ae8b27983a4b7a58e4951ac
    fingerprint: 58b20f0fc3c1862a39d3ad62a09d887b745294add661594eeddbb4e88298be85
    fingerprint_components:
      contract: c36cc4e8d12e4ad87975e120e2864a9b6e4f735e409babc8f8ec8fb27d1b8cb4
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
      - symbol_id: SYM-proof-signoff-questions-fence
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
      test_id: TEST-proof-signoff-questions-fence
      pattern:
        symbol_id: SYM-cli-signoff-model-signoff-fences
        type: string
        value: kibi-questions
    certificate_digest: b8f73f9a93d7e24247f023fc7bd0ebe3284e76640477e4793316f1f639940097
    claim_bindings:
      - claim_key: CLAIM-67426D4B8A8EC1F8
        requirement_id: REQ-kibi-signoff-fences
        fact_id: FACT-signoff-questions-fence
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi-questions
---
Proves that the signoff questions fence shall be kibi-questions, against the code Kibi reads at ingest.
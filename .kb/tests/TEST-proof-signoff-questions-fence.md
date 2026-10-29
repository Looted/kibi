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
    receipt_id: PR-30fcd672648e2679df9624af
    test_id: TEST-proof-signoff-questions-fence
    scope: unit
    outcome: passed
    code_snapshot: 5a69977c7f503c700a4522a6ec37b369d0ee69c1e511d7f69e127e53432d7f55
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T10:51:04.296Z'
    finished_at: '2026-10-29T10:51:04.494Z'
    artifact_digest: 904e6befd0374a59a19828a6a58f577fe7c5e97ebdf59026dfce95bab83f15e7
    contract_hash: c36cc4e8d12e4ad87975e120e2864a9b6e4f735e409babc8f8ec8fb27d1b8cb4
    binding_hash: c87466270e510a3b6eb13d8cb89828b65240704a2e3ac40c49558bc4a0033117
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
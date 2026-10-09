---
title: UI pattern vocabulary tests
status: active
tags:
  - predicates
  - ui
  - modeling
priority: must
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: UI design plugin'
  recorded_at: '2026-10-09T12:13:22.881Z'
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-ui-pattern-vocabulary
      target: default
  success_policy: all_required_first_attempt
id: TEST-ui-pattern-vocabulary
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-cbf1d8320ab9399ecdc2e6e2
    test_id: TEST-ui-pattern-vocabulary
    scope: end_to_end
    outcome: passed
    code_snapshot: 06bcb9d0b41a820d7ba77a759d45cbb22b0404df99c99db8f9b25cdbc68306f0
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-09T12:33:57.844Z'
    finished_at: '2026-10-09T12:33:57.978Z'
    artifact_digest: f172398da026155281204c009e670710c102acce23379cc980b067be5fd2e583
    contract_hash: c5927293dbd79034f3b3985dedc97f0567343fd9744fce6e2592b0b3462fa02f
    binding_hash: cb656e607445c6e29e62d2fcab782cf03d6e93179860c5a97fba861de6efb28e
    fingerprint: a93aa994c55f89255b135bf453b591ad2a8ba505b7a5ac9c4b07b8985a7f7f67
    fingerprint_components:
      contract: c5927293dbd79034f3b3985dedc97f0567343fd9744fce6e2592b0b3462fa02f
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
      - symbol_id: SYM-test-ui-pattern-vocabulary
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Runs the UI pattern vocabulary suite, which checks the four built-in UI predicate schemas and their argument names and asks the predicate suggester to rank UI pattern, shared variant, marker and container sentences, plus a developer coding standard sentence that must stay with coding_standard_rule.

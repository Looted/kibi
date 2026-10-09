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
    receipt_id: PR-b6157a4cd2a6887219a82750
    test_id: TEST-ui-pattern-vocabulary
    scope: end_to_end
    outcome: passed
    code_snapshot: 64eefb00127e4bc040abb481f7ec6e310806f9d4f6df0d6b18b937a3b98e26b2
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-09T12:22:01.981Z'
    finished_at: '2026-10-09T12:22:02.132Z'
    artifact_digest: 165e8720ad127ce1e7d2355e97f11c638930cbf8ddba105de41c0976ee34c701
    contract_hash: c5927293dbd79034f3b3985dedc97f0567343fd9744fce6e2592b0b3462fa02f
    binding_hash: 325223c4bf680e4c022f096b0eb54d3a95277b4d3ceb978f1496e27f3d8b34e6
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

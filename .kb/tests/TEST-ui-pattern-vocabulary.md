---
title: UI pattern vocabulary tests
status: passing
tags:
  - predicates
  - ui
  - modeling
priority: must
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-09: UI design plugin'
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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c35a1d7bea0c15b0f05ea896
    test_id: TEST-ui-pattern-vocabulary
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: c5927293dbd79034f3b3985dedc97f0567343fd9744fce6e2592b0b3462fa02f
    binding_hash: 00c72ba441a8ac23222d0cd355453852ed2b32a01e62812c1198161c15e365c5
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
    kind: e2e
    evidence_level: tested
---
Runs the UI pattern vocabulary suite, which checks the four built-in UI predicate schemas and their argument names and asks the predicate suggester to rank UI pattern, shared variant, marker and container sentences, plus a developer coding standard sentence that must stay with coding_standard_rule.

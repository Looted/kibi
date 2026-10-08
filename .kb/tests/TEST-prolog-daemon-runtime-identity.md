---
title: Daemon handshake and replacement controls
status: active
verification_scope: end_to_end
verification_perspective: internal
tags:
  - prolog
  - bundle
  - review:context-missing
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-prolog-daemon-runtime-identity
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-daemon-runtime-identity
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-fb4310e6f7c599593b711940
    test_id: TEST-prolog-daemon-runtime-identity
    scope: end_to_end
    outcome: passed
    code_snapshot: 6aa95fb8504e5af798c201ea3d60bd0e42e54d6f1278a633b2698cd6ae0d427d
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-08T22:01:24.019Z'
    finished_at: '2026-10-08T22:01:32.684Z'
    artifact_digest: 8668feb9cf76f06f9c80438200a2bc635d864f05abff8a60b291ea1d3d448874
    contract_hash: d72c4705059135438b1fc71972d0ba452be3c3c568faaf38e8d7bfbf56fff310
    binding_hash: 9da88217d905a553b4f5115e953d30835832c7d43adad782d2a59dee96853f5a
    fingerprint: f7dee56c5f569ced9f4100db75e1bc6585a89a9e8063804985d8fcb39a5639ba
    fingerprint_components:
      contract: d72c4705059135438b1fc71972d0ba452be3c3c568faaf38e8d7bfbf56fff310
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
      - symbol_id: SYM-test-prolog-daemon-runtime-identity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

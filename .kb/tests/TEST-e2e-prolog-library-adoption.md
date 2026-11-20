---
title: Prolog library adoption keeps local behavior with bounded remote SPARQL
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-prolog-library-adoption
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-prolog-library-adoption
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9fd822b07d7e16fc41727209
    test_id: TEST-e2e-prolog-library-adoption
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 1907394f271b961d238412efab3edf446e805cc77227d728ff5b157e40b14edc
    binding_hash: 590e117d245e9ca3d01f14fea14d842c1436eb2bc61af492d65e9a7661fdc00a
    fingerprint: 9142d6dfcc2e65a03d5cee0e697ae9dda0ec9e06ffc7502ead7ca3a2760d1338
    fingerprint_components:
      contract: 1907394f271b961d238412efab3edf446e805cc77227d728ff5b157e40b14edc
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
      - symbol_id: SYM-e2e-test-prolog-library-adoption
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Packed end-to-end regression for prolog library adoption keeps local behavior with bounded remote sparql.

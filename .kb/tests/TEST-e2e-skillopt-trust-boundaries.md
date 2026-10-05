---
title: SkillOpt external trust boundaries fail closed through the real CLIs
status: active
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-skillopt-trust-boundaries
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-skillopt-trust-boundaries
    target: default
    native_id: documentation/tests/e2e/skillopt-trust-boundaries.e2e.ts::skillopt trust boundary e2e
id: TEST-e2e-skillopt-trust-boundaries
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-220f8f7a7c0bd02946ff6c8a
    test_id: TEST-e2e-skillopt-trust-boundaries
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 9020824a8e1d04d5bdf1177ebadc073b9c5a92e28cc227941f1dd81f3a509009
    binding_hash: 9841c10f584814cd89196e317b5bf54580efa69bcc88e9dbe4cdc85298774a7f
    fingerprint: 88e534076ad7041d09154b93c898e71b247f6063a280809d0ee97a038a1bd02e
    fingerprint_components:
      contract: 9020824a8e1d04d5bdf1177ebadc073b9c5a92e28cc227941f1dd81f3a509009
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 49332de63a630349120d3b5bb6e6d11f1136214f4d797f1cca1f3c0129d4c5de
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-skillopt-trust-boundaries
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

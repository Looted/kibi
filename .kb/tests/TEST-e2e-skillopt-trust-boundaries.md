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
    receipt_id: PR-85ff98915bf035d0c8687c3d
    test_id: TEST-e2e-skillopt-trust-boundaries
    scope: end_to_end
    outcome: passed
    code_snapshot: 39b771790c601f53ed3716f1281d2c43ba1f16e3afa435aaf6553f948010a5b2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T19:52:45.876Z'
    finished_at: '2026-09-19T20:33:53.928Z'
    artifact_digest: c07890b19bad57525f3d20afb4b81d9ade6918e879a58d30516e81c53116f3f1
    contract_hash: 9020824a8e1d04d5bdf1177ebadc073b9c5a92e28cc227941f1dd81f3a509009
    binding_hash: a269ba56ee8042ea22e0d6813c7afc1b2cbf790bddaaed100d4927e78960fc09
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-04f653cf0cd08bd3b90713df
    test_id: TEST-e2e-skillopt-trust-boundaries
    scope: end_to_end
    outcome: failed
    code_snapshot: 681cb0098baf45c6ee059ff93a4a30032fcc24bb0df13208262766a1ad626b98
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T21:33:49.509Z'
    finished_at: '2026-09-19T22:09:14.664Z'
    artifact_digest: 12322021e6a74b565709314d5ebdfe7bc12de7b0c075ddc6c461878ce518f337
    contract_hash: 9020824a8e1d04d5bdf1177ebadc073b9c5a92e28cc227941f1dd81f3a509009
    binding_hash: a269ba56ee8042ea22e0d6813c7afc1b2cbf790bddaaed100d4927e78960fc09
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-skillopt-trust-boundaries
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-skillopt-trust-boundaries
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f018812bc43c632aa50ee6d0
    test_id: TEST-e2e-skillopt-trust-boundaries
    scope: end_to_end
    outcome: passed
    code_snapshot: 62f33234a3e102c0d74a3a0c83bb8d78707e18fa19ab74217e11b62dffd2a1b9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T22:24:42.197Z'
    finished_at: '2026-09-19T23:01:02.646Z'
    artifact_digest: 15804a5d3fe1df0236a1702bf6ce5a978953313dc2a11106eedc9653f4b18d57
    contract_hash: 9020824a8e1d04d5bdf1177ebadc073b9c5a92e28cc227941f1dd81f3a509009
    binding_hash: a269ba56ee8042ea22e0d6813c7afc1b2cbf790bddaaed100d4927e78960fc09
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
---

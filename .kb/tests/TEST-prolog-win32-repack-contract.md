---
title: swipl-windows-repack contract tests cover the PE audit, import allowlist, trim pins, manifest prebuilt block, and tar layout
status: passing
sourceFile: scripts/tests/swipl-windows-repack.test.ts
origin:
  kind: agent
  recorded_at: '2026-11-20T11:03:08.872Z'
id: TEST-prolog-win32-repack-contract
type: test
verification_scope: end_to_end
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-prolog-win32-repack-contract
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-73a9373f14586765e78e6e35
    test_id: TEST-prolog-win32-repack-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 003688fb2e72e89e66ff4373b817611a789366af12bc2e8504e66a9d7a75ea1d
    environment_hash: fed63429e709f20235a1a8aea7f4549fd91216f8f13a3bf80688ffed5eb571cb
    started_at: '2026-11-20T15:08:49.400Z'
    finished_at: '2026-11-20T15:08:55.551Z'
    artifact_digest: b440f20634712bbf31bc78befc3a86e986d1d223a73f719706a007636dd208c3
    contract_hash: a0165df8346c9ea732cbeb5fa2c25d16e1461734ed8b3c64d79e7dc7e53b95d2
    binding_hash: 2d662596450412a93df09a65d96bbe0f8ae46af74326f81dbc9acbcbb884190f
    fingerprint: 5e7ee3be1c6359e44b88e00e32685f070112981f4cecb32f5920ce70d363148d
    fingerprint_components:
      contract: a0165df8346c9ea732cbeb5fa2c25d16e1461734ed8b3c64d79e7dc7e53b95d2
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
      - symbol_id: SYM-test-prolog-win32-repack-contract
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
scripts/tests/swipl-windows-repack.test.ts builds synthetic PE fixtures and covers the machine check, the import allowlist, the missing-trim-path failure, the checksum refusal, the manifest fields, and the tar layout and modes, without network access.
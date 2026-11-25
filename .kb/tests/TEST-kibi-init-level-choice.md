---
title: 'kibi init and the Kibi level: asked at a terminal, --level or test without one, and the bootstrap skill asks'
status: passing
verification_scope: end_to_end
verification_perspective: internal
tags:
  - levels
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-init-level-choice
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-25T09:49:39.903Z'
id: TEST-kibi-init-level-choice
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-71bb5248ce2b491c2ac93b37
    test_id: TEST-kibi-init-level-choice
    scope: end_to_end
    outcome: passed
    code_snapshot: b6649d29181ccab088798d2373ba640e85507f701aca154d615cc7f2c4e9cc6f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T10:22:04.318Z'
    finished_at: '2026-11-25T10:22:04.398Z'
    artifact_digest: 0a80588e952d39bfdd5e13557a58967f85f71f05adf3cc6fb68ab74b76851170
    contract_hash: 97439db4aefdc9648d68e99c82780fc3dbaa5e78e9f1ad7e3c49e9c4146d146c
    binding_hash: 1226543afd276a58cc54e3bcc0d427daa39de2266235a4ff359bd2bb3477dab1
    fingerprint: 6709c82b970a6b98cc14d81ebad32c1e57d9cde4b171150e87358704f81a8ea3
    fingerprint_components:
      contract: 97439db4aefdc9648d68e99c82780fc3dbaa5e78e9f1ad7e3c49e9c4146d146c
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
      - symbol_id: SYM-test-kibi-init-level-choice
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Automated verification lives in `packages/cli/tests/kibi-levels/init-level.test.ts`. It checks the question offers test as recommended, that a terminal answer is recorded and a non-level answer asked again, that without a terminal --level or test is recorded and nobody is asked, that a recorded level is kept, that the level goes to package.json or .kb/setup.json, that init asks only at a terminal outside CI, and that the bootstrap skill tells the agent to ask the person and pass --level.

---
title: 'Kibi levels through the CLI: init records the level, check and upsert follow it, and the commit gate reports a new requirement below its floor'
status: passing
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - levels
  - cli
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-levels-cli
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-25T09:50:59.965Z'
id: TEST-kibi-levels-cli
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e0b7cf569fbc83fbd82f472f
    test_id: TEST-kibi-levels-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: b6649d29181ccab088798d2373ba640e85507f701aca154d615cc7f2c4e9cc6f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T10:22:06.689Z'
    finished_at: '2026-11-25T10:22:14.844Z'
    artifact_digest: 926c01278e7bde1528f882c2936d2cbec4602a74a93e6d3a1932a12a1f6a3971
    contract_hash: 11502147a6e5399c6ce5a88eb4b651936db15b9e6f15ab3167114a033953d703
    binding_hash: ac016359820b3984da060b9b01c35b14fc342be90cfa11f3a94e2385aef45c06
    fingerprint: 6fc44fc63df240e1f4896906fba0b41c405ad232d5e6daeeda71fcdc52b4a41d
    fingerprint_components:
      contract: 11502147a6e5399c6ce5a88eb4b651936db15b9e6f15ab3167114a033953d703
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
      - symbol_id: SYM-test-kibi-levels-cli
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Automated verification lives in `packages/cli/tests/commands/kibi-levels.test.ts`, which runs the kibi CLI in a fresh Git repository. kibi init without a terminal records test, or the --level it is given, and refuses an unknown one; at remember a plain kibi check runs the knowledge rules only, reports a tested floor as advice and kb_upsert refuses to raise one; and at test kibi check --staged reports, and does not refuse, a requirement the commit adds below its floor.

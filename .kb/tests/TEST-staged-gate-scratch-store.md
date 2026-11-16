---
title: Staged gate scratch store tests
status: active
priority: must
verification_scope: integration
tags:
  - check
  - staged
origin:
  kind: agent
  recorded_at: '2026-11-16T19:30:00.000Z'
id: TEST-staged-gate-scratch-store
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-staged-gate-scratch-store
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-86cbe035953c19d6c318e649
    test_id: TEST-staged-gate-scratch-store
    scope: integration
    outcome: passed
    code_snapshot: ff2d8b3c7643e1070b8cb345146659c6ec2ab99cffd6373e635b802b70195f45
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T20:31:21.272Z'
    finished_at: '2026-11-16T20:31:49.392Z'
    artifact_digest: 9dae2ccd195cec11904c2b36eaa3e3d423ee1112c99ddb84a7d476c306672999
    contract_hash: e006222ed4a7d9ff00b7ff57c1ab1bf719955547d841c769002068e14682aa77
    binding_hash: 4e27d2326b75036319a3b560663cf9fef218b20921338952b554875c243b7ccb
    fingerprint: bf9093a5a1a5a2f6009d68b6189d7cc9349f315dc1408061bb4581fcc40aad08
    fingerprint_components:
      contract: e006222ed4a7d9ff00b7ff57c1ab1bf719955547d841c769002068e14682aa77
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
      - symbol_id: SYM-test-staged-gate-scratch-store
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Checks that the staged gate's temporary store does not save after each write batch, that the evidence floor can be asked for named requirements only, and that the engine's scoped evidence floor evaluates only those requirements.
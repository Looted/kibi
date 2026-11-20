---
title: kibi query from a subdirectory with the packed CLI
status: passing
tags:
  - cli
  - workspace
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-cli-subdirectory-workspace
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-26T13:32:49.092Z'
id: TEST-cli-subdirectory-workspace
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-79c6abfb2e87391b41e4e410
    test_id: TEST-cli-subdirectory-workspace
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 7b4b1670d8507d9772d5fcc89ed742810e9032ca5c7ac63f01af87dd08671959
    binding_hash: e226c2b148db3cdb933182b6dac22e774f8ce9e0fa6b8e7ce8e07f68624f0a09
    fingerprint: 2511f75764f237b1d3768f4c2cc78d4a2b720c1f0f6fc5462014542164f441fe
    fingerprint_components:
      contract: 7b4b1670d8507d9772d5fcc89ed742810e9032ca5c7ac63f01af87dd08671959
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
      - symbol_id: SYM-e2e-packed-cli-subdirectory-workspace
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the installed packed CLI on a sandbox repository with a synced requirement, then runs kibi query from apps/server with a relative --input file in that directory. The query lists the requirement from the root knowledge base, and no .kb directory appears in apps/server. The unit suite checks the directory and path rewriting rules, including kibi init, an explicit KIBI_WORKSPACE and a directory outside any workspace.
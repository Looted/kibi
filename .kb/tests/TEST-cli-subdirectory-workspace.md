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
    receipt_id: PR-3dbd66b8901a9451ab5c928b
    test_id: TEST-cli-subdirectory-workspace
    scope: end_to_end
    outcome: passed
    code_snapshot: ac5df080b175b7efc825c3166ba5c68e0d2bb0fc0f2ad7dccb0055a18c09eb1d
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-26T13:50:02.340Z'
    finished_at: '2026-10-26T13:51:15.442Z'
    artifact_digest: a1e0d2c1f12f6a9540384b5a4df05b3073222d95329502cf49e960defa227461
    contract_hash: 7b4b1670d8507d9772d5fcc89ed742810e9032ca5c7ac63f01af87dd08671959
    binding_hash: db70ae7117a2b888be3c6535f6a7c068f2c9ef3c16a55f2c9b5a355834667c73
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
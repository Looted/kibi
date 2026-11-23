---
id: TEST-opencode-smart-enforcement
title: Smart Enforcement Verification and Surface Policy
type: test
status: passing
created_at: 2026-04-03T00:00:00.000Z
updated_at: 2026-04-20T00:00:00.000Z
priority: must
tags:
  - enforcement
  - opencode
  - kibi
  - test
links:
  - type: validates
    target: SCEN-opencode-smart-enforcement
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-cli-workflows
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-318e7c0e8081f404238fb61b
    test_id: TEST-opencode-smart-enforcement
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 6907ef1dd1aafd78b6175964c54f50e6a3e16c4660bbf6b8ecf05d3c6f654bb4
    binding_hash: 3cc12b4a6834fd09c986c21db86511b1256432dbf704561edd5c2db42fe2ae71
    fingerprint: 5802a43cc4640a02573b20e676f828c1d5e5aff77b3354c3d78855fbba53e8ae
    fingerprint_components:
      contract: 6907ef1dd1aafd78b6175964c54f50e6a3e16c4660bbf6b8ecf05d3c6f654bb4
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
      - symbol_id: SYM-e2e-cli-workflows
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
Verify smart enforcement reads typed Kibi status and next actions, routes general work to canonical skills, routes explicit bootstrap requests to kibi-bootstrap, and keeps guidance advisory.

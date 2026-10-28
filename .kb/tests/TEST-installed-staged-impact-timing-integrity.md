---
title: Installed staged-impact timing observations remain bounded and fail closed
status: active
text_ref: scripts/benchmark-installed-staged-impact.test.mjs
tags:
  - multilingual
  - benchmark
  - timing-integrity
  - installed-consumer
  - review:context-missing
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-installed-staged-impact-timing-integrity
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-installed-impact-runWorkflow
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1f84ae3c8d3da1ac150736ff
    test_id: TEST-installed-staged-impact-timing-integrity
    scope: end_to_end
    outcome: passed
    code_snapshot: c93413e20f2fbe933ea3d5bde3572c88e748564b4d879a842927b272b519ce50
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:37:06.685Z'
    finished_at: '2026-10-28T17:39:40.515Z'
    artifact_digest: ec83351ec53a6c930b167393bb5375225dac74f85e8e84e154e1fbc7d715cf93
    contract_hash: 3b60b75b5abcf1b6a7d461075de49a903ba7d2d3cb252829b4cbd6b3be3760b5
    binding_hash: aa7e418c2b0967b5706d3ee14217fd0a4827a3116cf9d9a4b8d8bd1327563fd6
    fingerprint: c133990437a3498ce4683b23bc5376213d584336ea2c1fbef7f71e7f9986deb2
    fingerprint_components:
      contract: 3b60b75b5abcf1b6a7d461075de49a903ba7d2d3cb252829b4cbd6b3be3760b5
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
      - symbol_id: SYM-installed-impact-runWorkflow
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

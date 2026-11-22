---
title: A SkillOpt campaign keeps evidence with the harness chosen for the run, through the CLIs and without a model
status: passing
priority: should
tags:
  - skillopt
  - harness
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-skillopt-host-neutral-optimization
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-skillopt-host-neutral-optimization
    target: default
    native_id: documentation/tests/e2e/skillopt-host-neutral-optimization.e2e.ts::skillopt host-neutral optimization e2e
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-21: "Make SkillOpt treat the agent harness as an explicit per-run choice, finish the leftovers of the bundle removal, and record missing protocol calls."'
  recorded_at: '2026-10-21T10:54:15.330Z'
id: TEST-e2e-skillopt-host-neutral-optimization
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e13671f00ec240d2d6bfa9ec
    test_id: TEST-e2e-skillopt-host-neutral-optimization
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 1bc25d543c310912861344269cf3fb3d4846d2c66e768ac37caecd78fe2ae27e
    binding_hash: 29dd866138027e9497a14091464c8b15fc7c6a23d51efef2995dc463937521f2
    fingerprint: f84c42c68452ba022d0a414bf14cb5a2ed43baa9abbfb3530ea09a428a59cdba
    fingerprint_components:
      contract: 1bc25d543c310912861344269cf3fb3d4846d2c66e768ac37caecd78fe2ae27e
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: c733dade42902a02ea6bb3af0a6514e60f9eaa525e39864b459af53238c6e82f
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-skillopt-host-neutral-optimization
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs a SkillOpt campaign evaluation offline with fixture cells on Codex, then drives the real `campaign.ts`, `cli.ts` and `operator.ts` entry points as processes. It checks that the run records its harness and CLI version, that candidate cells and public feedback carry the first missing required call without private content, that `confirm` and `package --evaluation` refuse the Codex evidence on Claude Code before writing anything, that `--host` wins over `KIBI_SKILLOPT_HOST`, that unknown hosts and the Codex-only workflow on another host exit 2, and that the offline contracts are at 1.1.0 without a bundle. No model is called.
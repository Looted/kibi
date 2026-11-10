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
    receipt_id: PR-f4cd3cbc86bed7f4927986bd
    test_id: TEST-e2e-skillopt-host-neutral-optimization
    scope: end_to_end
    outcome: passed
    code_snapshot: c05f77bba7df77f015b0b2d3c442676cd9c4f40576ae886f262844f8bf718d9b
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T10:06:27.563Z'
    finished_at: '2026-11-10T10:06:29.662Z'
    artifact_digest: af0713878168ab808726751eabf3e3b6a98251205b8ef38ec52e14df2482f1d8
    contract_hash: 1bc25d543c310912861344269cf3fb3d4846d2c66e768ac37caecd78fe2ae27e
    binding_hash: ec7e6d2b0a0e20792ecd1c5620c65982b54fa4a5fa801578104ef2e004229735
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
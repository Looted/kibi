---
title: Prolog mutation runner selects Mutalog and forwards arguments
status: passing
tags:
  - prolog
  - mutation
  - testing
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-prolog-mutation-lane
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-29T16:12:36.940Z'
id: TEST-prolog-mutation-lane
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-40142d4b487d85d41133fba4
    test_id: TEST-prolog-mutation-lane
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 1972213e220903999e0bf9a7512987ff3795e82702f18c486cb9626873bcfece
    binding_hash: 1857d7e00c55651be4fc5087b6910828ac5c24ee5ba11f16a61e02ad23ec1967
    fingerprint: 15252e0927abe57b3e972d7f3e058dac53851fe2ac89e33768405613b0dfff5b
    fingerprint_components:
      contract: 1972213e220903999e0bf9a7512987ff3795e82702f18c486cb9626873bcfece
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
      - symbol_id: SYM-test-prolog-mutation-lane
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Run `bun test ./packages/core/tests/prolog-mutation-runner.test.ts`. Each case runs `scripts/run-prolog-mutation.pl` with `swipl` against a stub `library(mutalog)` whose entry point prints which copy loaded and the arguments it received. The first case points MUTALOG_HOME at a stub checkout and checks the arguments arrive unchanged and no pack directory is created. The second case leaves MUTALOG_HOME unset with a stub pack of the pinned version under `.cache/prolog-packs` and checks that pack runs without an install.
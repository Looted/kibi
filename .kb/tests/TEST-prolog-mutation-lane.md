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
    receipt_id: PR-159a6305c121de1311724cf5
    test_id: TEST-prolog-mutation-lane
    scope: end_to_end
    outcome: passed
    code_snapshot: 41743ad8ee6448607ad8bb9d7adbd0643f7fa980778c83ace32ffec97dce7e25
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T17:31:47.792Z'
    finished_at: '2026-10-29T17:31:48.037Z'
    artifact_digest: 82525d228b60d725dd0348dde8039752a9532bf4efb6e3bd8ea76ea2d2f02778
    contract_hash: 1972213e220903999e0bf9a7512987ff3795e82702f18c486cb9626873bcfece
    binding_hash: 6214939e1e657fc99e25f78193478e650f5b17328c3f0ef32b07f51dcb0169a8
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
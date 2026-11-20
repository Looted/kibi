---
title: Engine client core-module loading tests
status: passing
priority: must
tags:
  - engine
  - prolog
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T09:59:26.387Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-engine-client-core-modules-from-engine
      target: default
  success_policy: all_required_first_attempt
id: TEST-engine-client-core-modules-from-engine
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2a934e58bebd0db0c11d0d0a
    test_id: TEST-engine-client-core-modules-from-engine
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 0dab8f101a1fd8dc17a0d8385aff2ae1071a60565d66288f778b515eaf31005f
    binding_hash: 8bf4869fc01a194bace013788a7d131dcf1037939b042f63c25a07d20767bfa2
    fingerprint: 434a851c93d765149271e53b0e4d9cb4360414eebed270039dc643572cf5a7e9
    fingerprint_components:
      contract: 0dab8f101a1fd8dc17a0d8385aff2ae1071a60565d66288f778b515eaf31005f
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
      - symbol_id: SYM-test-engine-client-core-modules-from-engine
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Starts SWI-Prolog with kb.pl and discovery.pl loaded from one copy of the core and asks it, as a client of a second copy would, to load discovery.pl: a plain use_module of the second copy is refused with a redefine permission error, and the goal clients send loads the first copy (packages/cli/tests/prolog/core-module-goal.test.ts). The callers' goals are checked in their own suites.

A false pass would be a test whose two copies share one directory, so the redefine refusal never happens and the goal is never shown to pick the engine's copy.
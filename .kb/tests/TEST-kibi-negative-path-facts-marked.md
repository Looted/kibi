---
title: kb_search marks negative-path facts and ranks them below the requirement they guard
status: passing
priority: should
tags:
  - search
  - answer-layer
  - search-hints
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-negative-path-facts-marked
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-11T17:20:32.740Z'
id: TEST-kibi-negative-path-facts-marked
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-478b8a2953d0f738a92095c4
    test_id: TEST-kibi-negative-path-facts-marked
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 4d3c80ce9d40b76971da58187d6b322097ca3ec8eb6ca73cc8bb34a77acc068e
    binding_hash: 8f707f251ea1676b12263776589bab9a41eb3efa121c0171216e90523eb039a2
    fingerprint: 7c117ab057fe97b603066f00f303a2bd83e2656a45d6e17783c13468a839ff0f
    fingerprint_components:
      contract: 4d3c80ce9d40b76971da58187d6b322097ca3ec8eb6ca73cc8bb34a77acc068e
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
      - symbol_id: SYM-test-kibi-negative-path-facts-marked
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs packages/cli/tests/negative-path-facts.test.ts, which drives the engine answer parser, intent ranking, search hints, the answer layer and the kibi search table with a negative-path fact, and the kb.plt case negative_path_facts_are_assumed_by_rejecting_scenarios_and_ground_nothing, which checks kb_negative_path_facts/2 on a fixture KB: rejecting and erroring scenarios count, success scenarios and grounded facts do not, and only current requirements are named as guards.
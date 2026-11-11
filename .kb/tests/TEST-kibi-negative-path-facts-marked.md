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
    receipt_id: PR-7ab346ba0a4db5f7ba7e00d8
    test_id: TEST-kibi-negative-path-facts-marked
    scope: end_to_end
    outcome: passed
    code_snapshot: ebcb3bc77f7fd1213eea2c935c6185958315b1dcafdbe5d5c0fc093b494b87cf
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-11T17:24:52.785Z'
    finished_at: '2026-11-11T17:24:54.004Z'
    artifact_digest: 4653c2df5c685a33e40886e210abed587c8969009656fe92e14c186c450414c7
    contract_hash: 4d3c80ce9d40b76971da58187d6b322097ca3ec8eb6ca73cc8bb34a77acc068e
    binding_hash: f6f344f8d3cc5bffbd498902c8a7522ba7c1b9d80c813a007280faaa5785ba14
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
---
title: Predicate participant binding tests
status: passing
tags:
  - modeling
  - predicates
  - bindings
priority: must
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-09: onboarding evaluation round 9 finding K19'
  recorded_at: '2026-10-09T07:21:44.962Z'
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-model-predicates-participant-not-subject
      target: default
  success_policy: all_required_first_attempt
id: TEST-model-predicates-participant-not-subject
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-764543f2ac9f332dd6e3fa38
    test_id: TEST-model-predicates-participant-not-subject
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 8555c75858d0e3f8c3c6663cd0722bd2ee20da7cf566b65c1d2a65f62e0f9218
    binding_hash: 366e03160ebbcfc8586ef4ff09e3e2f7bef10c15555a95dd3a9219a9a7eba9ec
    fingerprint: 246b9eeeff79f0d7a77da960c533e9896cb784ecd4dbfd69808a3aae2f6e339e
    fingerprint_components:
      contract: 8555c75858d0e3f8c3c6663cd0722bd2ee20da7cf566b65c1d2a65f62e0f9218
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
      - symbol_id: SYM-test-model-predicates-participant-not-subject
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the predicate participant binding suite, which models a claim without an actor against a requirement that constrains a component identifier and checks that the actor stays unbound with a hint naming the missing participant and record_ontology_gap, that an explicit actor binding equal to that identifier is rejected with that reason, that a claim naming the actor in a short noun still binds, and that the constrained identifiers are offered as examples only for the argument that names what the claim is about and for entity arguments.
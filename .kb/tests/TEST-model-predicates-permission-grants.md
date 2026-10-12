---
title: Capability grants select permission_rule with singular bindings and reviewed polarity
status: passing
tags:
  - modeling
  - predicates
  - semantic-advisor
  - search-lane
priority: must
text_ref: packages/cli/tests/operations/predicate-permission-modals.test.ts; packages/plugin-builtin/tests/vocabulary-alignment.test.ts
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-model-predicates-permission-grants
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-11T18:45:59.181Z'
id: TEST-model-predicates-permission-grants
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-bbe96154ac954793e03e8174
    test_id: TEST-model-predicates-permission-grants
    scope: unit
    outcome: passed
    code_snapshot: a6dbaee2758bba0c474b0135f8b37dcd954e4aefb568df57bbe8e43d067a3cfb
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-11T18:48:03.046Z'
    finished_at: '2026-10-11T18:48:03.182Z'
    artifact_digest: d2028aca1830f1b58e939405737931d5cfcf6ce0208f0209060a8ea58cda1bde
    contract_hash: 07f5b2c78940547144ca3a0d89262794a7b2026c9a3b6755db9caaeb13725530
    binding_hash: a5bc3bd09ff28f04a1c8e561e5d7710d40b988fd3e481082859e0c9ecfb05712
    fingerprint: b0c46c97e6116bf74c6068e6156757bd16f50f74beebbf01cdc8b1f787e083ce
    fingerprint_components:
      contract: 07f5b2c78940547144ca3a0d89262794a7b2026c9a3b6755db9caaeb13725530
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
      - symbol_id: SYM-test-model-predicates-permission-grants
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e72533fbfbdc348404a05453
    test_id: TEST-model-predicates-permission-grants
    scope: end_to_end
    outcome: passed
    code_snapshot: a6dbaee2758bba0c474b0135f8b37dcd954e4aefb568df57bbe8e43d067a3cfb
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-11T18:49:13.473Z'
    finished_at: '2026-10-11T18:49:13.598Z'
    artifact_digest: 874b3245ed3f5ab3370d4a1b54411fc13a03cc20409ee2121da6450cfe631838
    contract_hash: 07f5b2c78940547144ca3a0d89262794a7b2026c9a3b6755db9caaeb13725530
    binding_hash: a5bc3bd09ff28f04a1c8e561e5d7710d40b988fd3e481082859e0c9ecfb05712
    fingerprint: b0c46c97e6116bf74c6068e6156757bd16f50f74beebbf01cdc8b1f787e083ce
    fingerprint_components:
      contract: 07f5b2c78940547144ca3a0d89262794a7b2026c9a3b6755db9caaeb13725530
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
      - symbol_id: SYM-test-model-predicates-permission-grants
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
# Capability grants select permission_rule with singular bindings and reviewed polarity

The describe block `capability grants express permission intent` in `packages/cli/tests/operations/predicate-permission-modals.test.ts` runs `handleKbSuggestPredicates` over the permission_rule schema for the test-project fixture sentences "must be able to", "are able to", "have permission to", "are entitled to", "is allowed to" and a compound "are permitted to" sentence, and expects an eligible candidate with a planned permission_rule fact of polarity assert, never `record_ontology_gap` with "required semantic cue absent". It calls `inferPermissionRuleArgs` directly and expects determiner-free singular actor and resource tokens (`[admin, read, analysis_request, allow]`, `[guest, export, report, deny]` for "must not be able to"), expects a reviewed `decision` binding to set the planned fact's polarity, and expects `hasNormativeAssertion` to accept "have permission to" and "are entitled to" while rejecting a bare "are able to" clause. The describe block `builtin classifier permission signals` in `packages/plugin-builtin/tests/vocabulary-alignment.test.ts` expects `detectSignals` to emit the permission signal for the same wordings.

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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-34f0154b6adff495b5301471
    test_id: TEST-model-predicates-permission-grants
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 07f5b2c78940547144ca3a0d89262794a7b2026c9a3b6755db9caaeb13725530
    binding_hash: a6fc323b121e4f1652a76bfb3daed6eb3fd37e215523e3074aec3793d5473482
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
    kind: e2e
    evidence_level: tested
---
# Capability grants select permission_rule with singular bindings and reviewed polarity

The describe block `capability grants express permission intent` in `packages/cli/tests/operations/predicate-permission-modals.test.ts` runs `handleKbSuggestPredicates` over the permission_rule schema for the test-project fixture sentences "must be able to", "are able to", "have permission to", "are entitled to", "is allowed to" and a compound "are permitted to" sentence, and expects an eligible candidate with a planned permission_rule fact of polarity assert, never `record_ontology_gap` with "required semantic cue absent". It calls `inferPermissionRuleArgs` directly and expects determiner-free singular actor and resource tokens (`[admin, read, analysis_request, allow]`, `[guest, export, report, deny]` for "must not be able to"), expects a reviewed `decision` binding to set the planned fact's polarity, and expects `hasNormativeAssertion` to accept "have permission to" and "are entitled to" while rejecting a bare "are able to" clause. The describe block `builtin classifier permission signals` in `packages/plugin-builtin/tests/vocabulary-alignment.test.ts` expects `detectSignals` to emit the permission signal for the same wordings.

---
title: Fact contradiction refusal and sibling requirement tests
status: passing
priority: must
tags:
  - upsert
  - sibling-requirements
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T19:16:54.965Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-upsert-stale-siblings
      target: default
  success_policy: all_required_first_attempt
id: TEST-upsert-stale-siblings
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3f6be63d71991ac6be45cfaa
    test_id: TEST-upsert-stale-siblings
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 0aa301414728e0f94e16eed1c7c75bd624d2fc3da23d0d4a16f391fe0a524328
    binding_hash: d76fccfef33bc0ccc64f47243e196c2218b561b8182604a4a23fa3a4dac122f4
    fingerprint: 57d323067b8fc3754212cd7d55ba4f67acceb1618f9d147bd5df9c85756037bc
    fingerprint_components:
      contract: 0aa301414728e0f94e16eed1c7c75bd624d2fc3da23d0d4a16f391fe0a524328
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
      - symbol_id: SYM-test-upsert-stale-siblings
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs kibi upsert through the built CLI on a workspace where one requirement grounds client.call_quota.remaining at most 500 and another at least 300 (packages/cli/tests/consumer/stale-siblings.test.ts): a move to 200 is refused in the dry run and the write and leaves 500 stored, and a move to 400 lists both requirements as siblings, flags the claim that still says 500, and puts each first in the warnings and in nextActions, with the dry run writing nothing. The unit suite (packages/cli/tests/operations-mutation/mutation/sibling-requirements.test.ts) covers firmness, same-key and twin siblings, a created fact and a claim that already states the new value; the Prolog tests in packages/core/tests/kb.plt cover the refusal, a contradiction the KB already held, a requirement linked by the write itself, and a batch that is checked once after both of its fact moves.

A false pass would be a fixture whose two requirements never share a quantity, so neither the refusal nor a sibling is ever produced.
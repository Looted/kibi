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
    receipt_id: PR-90cf824c80f11b365c055692
    test_id: TEST-upsert-stale-siblings
    scope: end_to_end
    outcome: passed
    code_snapshot: f883ce04186ffb54c84365001cc51d372740dbb79a0ab54dfdedff76501b3765
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T19:17:53.204Z'
    finished_at: '2026-11-16T19:17:58.951Z'
    artifact_digest: 620ef95e906c63291ed83d437569f7e187ac190eebf9733d3b5a32126392b94a
    contract_hash: 0aa301414728e0f94e16eed1c7c75bd624d2fc3da23d0d4a16f391fe0a524328
    binding_hash: e3867f6ca9cfbc4b17d13093c30831a814ac174af90c97fd8594866faadbb490
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
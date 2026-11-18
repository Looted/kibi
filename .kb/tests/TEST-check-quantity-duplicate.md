---
title: quantity-duplicate check, upsert and migrate tests
status: passing
priority: must
tags:
  - check
  - quantity-duplicate
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T16:10:07.033Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-check-quantity-duplicate
      target: default
  success_policy: all_required_first_attempt
id: TEST-check-quantity-duplicate
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e1731a3a0be85fc4009bb296
    test_id: TEST-check-quantity-duplicate
    scope: end_to_end
    outcome: passed
    code_snapshot: 85b2624165d7e44fc735b108a25d4917ae5c54792c3260a53e21c812ec79a72a
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T06:05:04.601Z'
    finished_at: '2026-11-17T06:05:23.072Z'
    artifact_digest: 30a9ef74c4d8f99d3cbcf7212d200154a20a5377764de71fb25335bed5f462b9
    contract_hash: ca8043cd5d416589d0941c1ab37349b79c1abac76fa765181e963f899472c0b0
    binding_hash: 0edfcbb7c79c0c99d46a5c22183ca4d12408aa1a3224743c8d6dbc1c63909358
    fingerprint: 3f3bf46399f42c14a1a5fff67259fb7553aa457ada6a9f827239f628ccddbf69
    fingerprint_components:
      contract: ca8043cd5d416589d0941c1ab37349b79c1abac76fa765181e963f899472c0b0
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
      - symbol_id: SYM-test-check-quantity-duplicate
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs kibi check, kibi upsert and kibi migrate through the built CLI on a workspace where two requirements, implemented by one symbol in src/quota.ts, ground the value 500 under two keys of client.call_quota (packages/cli/tests/consumer/quantity-duplicate.test.ts). It checks the finding, that two facts sharing the number 1 in the same file are not paired, the warning on a write that restates the value and on a dry run that moves it, that distinct_from ends both, that a distinct_from naming no value fact is reported, and the review action and note kibi migrate gives on the upgrade from schema 18 without writing anything. It also runs kibi check --staged: a commit that drops the distinct_from is blocked on the fact it stages, and an unrelated commit after the pair is committed is not.

A false pass would be a fixture whose requirements are implemented in different files, or a value change that never leaves the twin behind, so neither the finding nor the stale-value warning is ever produced.
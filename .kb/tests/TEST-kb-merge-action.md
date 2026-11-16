---
title: Kibi KB merge action tests
status: passing
priority: should
tags:
  - ci
  - merge
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:30.120Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kb-merge-action
      target: default
  success_policy: all_required_first_attempt
id: TEST-kb-merge-action
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7ec199ff905e8007ec8de3a6
    test_id: TEST-kb-merge-action
    scope: end_to_end
    outcome: passed
    code_snapshot: 95c2368e16c896858e17640973f954ec0c9b541683115c823324e0640e68bdfe
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T18:22:59.564Z'
    finished_at: '2026-11-16T18:23:05.831Z'
    artifact_digest: 28dfd0f27432c6376cb2ebb0fab0bd753f8f19866a40301a632502731648945e
    contract_hash: 799eff1b2a17f4985d7ff86bf2fa6e4f444cefb67e03f9f9abedce9699b224e5
    binding_hash: 1db3c95146ffe84acbaf7a46fa936697cea3750697aaf27daefcd3ee04a9dedb
    fingerprint: 90e71bbbf4b4c0b3056145e6c0e3717ea676470312d8d1d108353f3eed5c1a1b
    fingerprint_components:
      contract: 799eff1b2a17f4985d7ff86bf2fa6e4f444cefb67e03f9f9abedce9699b224e5
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
      - symbol_id: SYM-test-kb-merge-action
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs actions/kb-merge/kb-merge.sh against scratch Git repositories (a bare remote, a seed clone that writes history and a workspace clone the action runs in) with fake gh and Kibi commands (scripts/tests/kb-merge-action.test.ts). It checks that a manifest-only conflict is merged with the driver and pushed after sync and the check, that other conflicts, real manifest conflicts and fork pull requests are left alone, that a failing check or a sync that rewrites a tracked file blocks the push, that a branch moved during the merge is merged again or given up on after the configured attempts, and that the repository's Git hooks do not run.

A false pass would be a fixture whose branches never conflict, so the action never merges, or a check that never fails, so the refusal is never exercised; each refusal test has a passing control.
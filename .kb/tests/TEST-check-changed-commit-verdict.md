---
title: Changed check verdict tests
status: passing
priority: must
verification_scope: end_to_end
tags:
  - check
  - staged
origin:
  kind: agent
  recorded_at: '2026-11-16T19:30:00.000Z'
id: TEST-check-changed-commit-verdict
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-check-changed-commit-verdict
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f6a1408764a652b9d7f54a8d
    test_id: TEST-check-changed-commit-verdict
    scope: end_to_end
    outcome: passed
    code_snapshot: c33f07cacea43afe85092a020a5bd61b0ce802896e145375ebe10da1e1b43036
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T18:37:30.424Z'
    finished_at: '2026-11-17T18:37:44.351Z'
    artifact_digest: 05cca8873c133fffeae49e7f83423571daaaf26b2e709578d6cf90f29beb8823
    contract_hash: 9be9644a56671a7c70f3f7d830f13cab65b7c9a8f5e0a77769b53ae287007ad7
    binding_hash: 019810a9fdb149024f58d25405e7534d73253bc3fb08b0c05623dc70319495bd
    fingerprint: 945ae72f876cbe264aa0cb37487fd507b4472a53892a5a5ca462533d0e6de86b
    fingerprint_components:
      contract: 9be9644a56671a7c70f3f7d830f13cab65b7c9a8f5e0a77769b53ae287007ad7
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
      - symbol_id: SYM-test-check-changed-commit-verdict
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Builds the scratch index over staged, unstaged, untracked, deleted and ignored changes and checks the real index is untouched; routes kibi check --changed through it; and runs kibi check --changed and kb_check changed:true on a repository with an unstaged new unowned function: the verdict is the gate's refusal, a check naming another file passes, and git diff --cached stays empty.
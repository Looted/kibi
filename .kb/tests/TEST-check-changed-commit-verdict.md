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
    receipt_id: PR-d553a790d7e546f1f3b35900
    test_id: TEST-check-changed-commit-verdict
    scope: end_to_end
    outcome: passed
    code_snapshot: 2d2e51abb29a0062a03c6b5eac4f61123e6660d452df84971e95c70ec8930502
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T20:48:45.656Z'
    finished_at: '2026-11-16T20:48:52.298Z'
    artifact_digest: f7769c49485efe6bc0898e62d8e8d02119dcdbce7f2c7efbe9f1f72116c59834
    contract_hash: 9be9644a56671a7c70f3f7d830f13cab65b7c9a8f5e0a77769b53ae287007ad7
    binding_hash: 1bf261f2d7bb71f3c799e47af85f3db4669fa6118d86da65c4372c2abb8a91f5
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
---
title: Packed runtime engine daemon consumer proof
status: passing
tags:
  - runtime
  - engine
  - packed
  - e2e
  - proof
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-runtime-engine-daemon
      target: default
  success_policy: all_required_first_attempt
id: TEST-runtime-packed-engine-daemon
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-32df969723db40b82b562e85
    test_id: TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 82eff1d56d373f50508c977f0a39bceb515d717eaf4356b155d1764f3ed0d6a4
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-27T08:31:03.576Z'
    finished_at: '2026-11-27T08:31:07.907Z'
    artifact_digest: b063949828703b94407d15d1e1f990111d2d337e2d48be6e62b0349f783a5f20
    contract_hash: ec8538cede0c497fbd808316e461fbd35bbfa5bd13aca63444a8eb8affe6c8a3
    binding_hash: 56a29ed7cc6e3b2216f7a47ee0ba516c1416d8441c473027399f63d6a4cebae2
    fingerprint: 76e8e28be0080a3523df987dfd0fd913a3938502845df485e52a8ca7b04e3b6a
    fingerprint_components:
      contract: ec8538cede0c497fbd808316e461fbd35bbfa5bd13aca63444a8eb8affe6c8a3
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
      - symbol_id: SYM-test-runtime-engine-daemon
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 7): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---

## Context
This installs published tarballs into a clean prefix and starts the engine client from the installed runtime. It proves daemon resolution without a nested `kibi-cli`.

---
title: No-Git store adoption tests
status: active
priority: must
tags:
  - vcs
  - branching
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:21:30.076Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-no-git-adoption
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-no-git-adoption
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-95e90f63d78f28876badccfb
    test_id: TEST-kibi-no-git-adoption
    scope: end_to_end
    outcome: passed
    code_snapshot: ab010f37efcf08fa96a686fb375f97e60fdc390a3cd0d543a237c0bfef7a8124
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-25T11:42:23.769Z'
    finished_at: '2026-11-25T11:42:39.768Z'
    artifact_digest: df9aa3c0b51ffb494b04d54987b22a9b68b52d70658be8c2811666419936aa33
    contract_hash: b565fa9015bf08c99a67b2ff8a2c9be29e0ad3b828e41eb827d8866bc738e723
    binding_hash: 938a2cdb0df6014f1dca03fdbfef6162d4b44b6e8dcdb1dbf024be6db433ac06
    fingerprint: cf6317c4a0dd0b3f230364b9c2200e9add0c738e22ce1707ef43032b791d33f9
    fingerprint_components:
      contract: b565fa9015bf08c99a67b2ff8a2c9be29e0ad3b828e41eb827d8866bc738e723
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
      - symbol_id: SYM-test-kibi-no-git-adoption
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Checks that adoption seals only untracked syncable sources for the new branch, moves the store into recovery with a committed journal, happens once, is reported once, does nothing without a no-Git store or for a named store, and handles a lost race (packages/cli/tests/vcs/no-git-adoption.test.ts); the protocol envelope reporting it (packages/cli/tests/cli-protocol-mutation.test.ts); and the built CLI carrying both requirements over after git init (packages/cli/tests/consumer/outside-git.test.ts).

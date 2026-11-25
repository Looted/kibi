---
title: Source inventory tests outside Git
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
  recorded_at: '2026-11-25T09:17:16.428Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-source-inventory
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-no-git-sources-on-disk
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3a4687c7326d94e1d211cb12
    test_id: TEST-kibi-no-git-sources-on-disk
    scope: end_to_end
    outcome: passed
    code_snapshot: ab010f37efcf08fa96a686fb375f97e60fdc390a3cd0d543a237c0bfef7a8124
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-25T11:41:43.708Z'
    finished_at: '2026-11-25T11:42:00.305Z'
    artifact_digest: d204f6a7528a27d018ccebe1d7c1f186decd825b1680b409276de84075c81bf2
    contract_hash: c01b9dd84ddc19dd4018e900d308d66d027a9a908d0e7b0e9499706bd8f0f640
    binding_hash: d6ae3bbbe6300c1f0965bc834de9f2ff4ece4cf22f15cb445f91cee36483f4ae
    fingerprint: 103ac79e94358f233f139fe79a120583efb8f6e156895be67a6b0abe4c2efab8
    fingerprint_components:
      contract: c01b9dd84ddc19dd4018e900d308d66d027a9a908d0e7b0e9499706bd8f0f640
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
      - symbol_id: SYM-test-kibi-source-inventory
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Checks that the source inventory lists Git's tracked files in a repository, answers disk outside any repository and keeps Git's failure for a repository Git refuses, and that kbFilesOnDisk lists every .kb file (packages/cli/tests/vcs/source-inventory.test.ts); that no receipt is written outside Git (packages/cli/tests/commands-coverage/pending-receipt-branch.test.ts); and that a hand-written source is compiled by kibi sync without a receipt (packages/cli/tests/consumer/outside-git.test.ts).

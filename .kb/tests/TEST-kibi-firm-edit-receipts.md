---
title: Firm-edit receipt tests
status: passing
priority: must
tags:
  - firmness
  - cli
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T06:59:01.038Z'
id: TEST-kibi-firm-edit-receipts
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-firm-edit-receipts
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-5670a2e09e3619f19202021f
    test_id: TEST-kibi-firm-edit-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 38a432c1294f100d5eb4223ad32add98cc10c8e7d67fe6275694b5df801f0fa0
    binding_hash: cefa3a21cf9e830723c59a4a401cd77edbc551ef352e411b8bf9acf5eb5347d3
    fingerprint: 31e7b4b4991cd7fceb0bbe7f2aa3e82dcfc5e645473f76c76636b623b8a16749
    fingerprint_components:
      contract: 38a432c1294f100d5eb4223ad32add98cc10c8e7d67fe6275694b5df801f0fa0
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
      - symbol_id: SYM-test-kibi-firm-edit-receipts
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The agent-core tests write and parse receipts, read a requirement statement the same way for the hooks and the CLI, hash a symbol's line range, find unchanged code wherever it moved in the file, and check that a receipt stops matching once the statement or the code changes (packages/agent-core/tests/firm-edit-review.test.ts). Receipt files are named by a hash of the source file and symbol, and receipts written under the earlier names are still read and replaced. The operation tests run kibi review-firm-edit against a workspace: a keeps or changes verdict on a symbol that implements a current firm requirement (a declaration, a coarse manifest symbol with coordinates, or a symbol the change removed) is written under .kb/firm-edit-reviews/<requirement>/ with the statement and code hashes, staged:true reads the Git index, and a requirement that is not current and firm, a file outside the workspace or a symbol that implements nothing is refused (packages/cli/tests/public-mutation/operations/firm-edit-review.mutation.test.ts, packages/cli/tests/consumer/firm-edit-review.test.ts).

A false pass would be a test that checks only that a file was written, never that a changed statement or changed code makes the receipt stop matching.
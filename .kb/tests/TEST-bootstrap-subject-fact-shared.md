---
title: Bootstrap shared subject fact tests
status: active
priority: must
tags:
  - bootstrap
  - modeling
  - naming
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-bootstrap-subject-fact-shared
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-08T15:34:28.648Z'
id: TEST-bootstrap-subject-fact-shared
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-66983aabde3fa691bc4f0616
    test_id: TEST-bootstrap-subject-fact-shared
    scope: end_to_end
    outcome: passed
    code_snapshot: 6cca97613441c1fbaabc1ae371ee3f303736b4d4b1a0c6d7c908439c9eabb06d
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-08T16:06:28.400Z'
    finished_at: '2026-10-08T16:07:11.594Z'
    artifact_digest: 7ad746bb3df1aed777db8d28a2428c620ec70f56784d7fa625a4e1ca0096b2aa
    contract_hash: aa669fb1a2b3d3afaa79531bfef2aed4320d069f363420d9beed33e837208495
    binding_hash: 4a9b10f43eba1cc4a28a13efb6cd4731627cd99351b1aaeea789392e812f98f5
    fingerprint: 4b7526fdf72c64b1696cb20084c3968a3c74007f5986006049decf582a813b6b
    fingerprint_components:
      contract: aa669fb1a2b3d3afaa79531bfef2aed4320d069f363420d9beed33e837208495
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
      - symbol_id: SYM-test-bootstrap-subject-fact-shared
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Runs `packages/cli/tests/consumer/bootstrap-write-failures.test.ts` through the real CLI and Prolog engine: two declared sources with claims about the same subject plan one subject fact with two `constrains` links and a `subject-key-shared:` diagnostic, replan to the same hash, apply, and pass `kb_check` without `subject-key-identity`; the other bootstrap write cases in the file keep passing with the shared fact.
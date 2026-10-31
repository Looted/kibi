---
title: Go, Java, C# and Rust source references through kibi prove with the packed CLI
status: passing
tags:
  - proof
  - source
  - multilingual
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-10-31T16:50:50.560Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-tree-sitter-source-references
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-tree-sitter-references
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-80bc4a3c6ec6954b811ac557
    test_id: TEST-kibi-tree-sitter-references
    scope: end_to_end
    outcome: passed
    code_snapshot: b2edd87f9db88973f9e196f6a0d9024cced12f4a3af6a63e455f5afc217e383a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-31T18:26:28.977Z'
    finished_at: '2026-10-31T18:26:54.017Z'
    artifact_digest: 4da3512c96616f9be5eaf68ea32ba89919d4f1ef9f6dcab1dc7a701e3bb7cddd
    contract_hash: 666c46c3735bda5801924dbcc821974cfd32b70f230ed17b3aa333dc8a057bcf
    binding_hash: b1f6200f953e36605eafa7788fdbe383f1ea317557fc71da5b488738d1dbfd19
    fingerprint: d1bb1844a5f3b21915897be3766b565cb2aee442c7187e0b9bedb74ac5afbc67
    fingerprint_components:
      contract: 666c46c3735bda5801924dbcc821974cfd32b70f230ed17b3aa333dc8a057bcf
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
      - symbol_id: SYM-e2e-packed-tree-sitter-source-references
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Packs the CLI and kibi-plugin-treesitter, installs them into a polyglot service and runs kibi prove on source tests over its Go, Java, C# and Rust files. While the plugin is active for symbols only the read is refused with what to install; once kibi.reference-extractor.v1 is active the environment, never-call and import claims are proved, a Go read of a variable named at run time is refused with its place, and a Rust worker that reads another variable is rejected. Unit tests cover each language reader (packages/plugin-treesitter/tests/references.test.js), the capability contract (packages/plugin-sdk/tests/reference-extractor.test.ts), the host routing and qualification (packages/cli/tests/proofs/plugin-references.test.ts) and the bootstrap offer.
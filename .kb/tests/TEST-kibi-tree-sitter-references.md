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
    receipt_id: PR-3c4fbb2360a1cbf4ec2493c2
    test_id: TEST-kibi-tree-sitter-references
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 666c46c3735bda5801924dbcc821974cfd32b70f230ed17b3aa333dc8a057bcf
    binding_hash: 5ea0144003b796c3bfae56162073410bad5867c7de3bb00628e527d627556b59
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
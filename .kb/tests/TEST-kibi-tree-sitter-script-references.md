---
title: PHP, C, Bash and Terraform source references through kibi prove with the packed CLI
status: passing
tags:
  - proof
  - source
  - multilingual
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-tree-sitter-script-references
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-02T12:20:27.735Z'
id: TEST-kibi-tree-sitter-script-references
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a05b6e52c0061140c70d55a8
    test_id: TEST-kibi-tree-sitter-script-references
    scope: end_to_end
    outcome: passed
    code_snapshot: 264fcebc1070a2a9e6ed376780e992fddd07461d2898359372b4546a81577663
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-02T15:33:45.442Z'
    finished_at: '2026-11-02T15:35:21.451Z'
    artifact_digest: 15b70cc3ee33d1f305d83224c5d9e982aa5a29729a48425bc3344afb77679e05
    contract_hash: 1e8dc9c25c56aa4c4e063da954dba64454553746d196cc1e85d362b6b52d59f2
    binding_hash: 70a2c015116f9752251cc38f927b3d862694215cee9fc6d2c3403c86e195cb20
    fingerprint: c721c2d28efdf77bf808a283b9ee1e6b725329fb5f1a6fbd682d8f591e1e78ad
    fingerprint_components:
      contract: 1e8dc9c25c56aa4c4e063da954dba64454553746d196cc1e85d362b6b52d59f2
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
      - symbol_id: SYM-e2e-packed-tree-sitter-script-references
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Packs the CLI, kibi-plugin-treesitter and the PHP, C, Bash and HCL grammar packs, installs them into a service and runs kibi prove on source tests over its PHP app, C daemon, Bash scripts and Terraform bucket. The environment, never-call and property claims are proved; a Bash script running eval and one reading a variable it sets only in a branch are refused with their place; the C daemon's claim is rejected once it calls system; and the bucket's claim is refused once an override file sits in its folder. Unit tests cover each reader (packages/plugin-treesitter/tests/references-more-languages.test.js), the host rows for PHP namespace functions and C header macros (packages/cli/tests/proofs/java-package-shadow.test.ts) and the Terraform override refusal (packages/cli/tests/proofs/plugin-references.test.ts).

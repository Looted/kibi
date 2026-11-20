---
id: TEST-mcp-skills-resource-discoverability
title: Verify MCP bundled skill resource discovery
status: passing
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-08-18T00:00:00.000Z
source: packages/mcp/tests/tools/skills.test.ts
links:
  - type: validates
    target: SCEN-mcp-skills-resource-discoverability
type: test
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-mcp-cli-help
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-36855bb1d7d9aad124d5c861
    test_id: TEST-mcp-skills-resource-discoverability
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 4d5bdf0192c0e9dfeb46523808093cf45e8fd0986b879f7f1580d9cfdfadfc30
    binding_hash: 8ec6d891303a6d5a0e27f3893ee50413f2d0022e12842075a9b6156dfd6a3c99
    fingerprint: ad81c4249cdcf903dd8ce7e4b481127bd853e96da1e9cbb43cb11114acd2a783
    fingerprint_components:
      contract: 4d5bdf0192c0e9dfeb46523808093cf45e8fd0986b879f7f1580d9cfdfadfc30
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
      - symbol_id: SYM-e2e-mcp-cli-help
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
List bundled skills, load a declared resource, and attempt an undeclared path while asserting deterministic success and rejection behavior. Executable coverage spans `packages/mcp/tests/tools/skills.test.ts`.

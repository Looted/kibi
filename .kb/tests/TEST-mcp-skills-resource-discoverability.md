---
id: TEST-mcp-skills-resource-discoverability
title: Verify MCP bundled skill resource discovery
status: active
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
    - symbol_id: SYM-e2e-test-mcp-skills-resource-discoverability
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-73560543f97736da86a51e30
    test_id: TEST-mcp-skills-resource-discoverability
    scope: end_to_end
    outcome: passed
    code_snapshot: 48cc5f2c6340fb17a7d99816b8c9a340c61bcad65b834285c14663cdc1f2d7fa
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:26:02.820Z'
    finished_at: '2026-10-28T19:26:03.164Z'
    artifact_digest: ef6c5d3bc61adda33d28e54b24abb4f2c9bb03e9cdc259ea91daf762700d0ff3
    contract_hash: d1ef4e61d69a268fc8ac1724062fa7db51be5f116629333801a26a9ae5232781
    binding_hash: e192a29fc3025878aa709ec4503480bde4f035cfa7f5d30aeb37b841bc6cfd3e
    fingerprint: cfb0aa44a71df80cfee69b149fa7661271f57c002526afe340f58a6b00fcc3da
    fingerprint_components:
      contract: d1ef4e61d69a268fc8ac1724062fa7db51be5f116629333801a26a9ae5232781
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
      - symbol_id: SYM-e2e-test-mcp-skills-resource-discoverability
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

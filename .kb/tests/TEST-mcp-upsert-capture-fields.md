---
title: kb_upsert advertises the 15 capture fields and the field reference lists the rest
status: passing
priority: must
tags:
  - tool-surface
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-mcp-upsert-proof-field-stubs
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-16T20:00:00.000Z'
id: TEST-mcp-upsert-capture-fields
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-65d03d34ad44c9358228d22a
    test_id: TEST-mcp-upsert-capture-fields
    scope: end_to_end
    outcome: passed
    code_snapshot: 4ae84505607840b85652271c83b4a620cb178812763babb250f0c619e27d9571
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T18:30:38.301Z'
    finished_at: '2026-11-16T18:30:57.734Z'
    artifact_digest: e950da86863fb0c6745c78e52a44ded938468a695050a0a79234968c603eb14d
    contract_hash: f97396d5c708389639276f478e351b8f7455dc0d0d1a27c695579ccde3cdf4ff
    binding_hash: 5e22b39c4b889856b654d70ef52eba928f96409eb1c4dae2f5ba5eb53fecbb4a
    fingerprint: 6ba62ec0f32810ed00ed0297cd697de7fc4bb0ab0c98d037a47b1c110dea743f
    fingerprint_components:
      contract: f97396d5c708389639276f478e351b8f7455dc0d0d1a27c695579ccde3cdf4ff
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
      - symbol_id: SYM-test-mcp-upsert-proof-field-stubs
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Asserts that advertisedInputSchema keeps only the properties an x-kibi-advertised-fields marker names and drops the marker (packages/cli/tests/operations/advertised-schema.test.ts), that the field reference lists the left-out fields with their descriptions (field-reference.test.ts), that the MCP kb_upsert definition advertises exactly the 15 capture fields (packages/mcp/tests/server/tools-coverage.test.ts), and the kb_upsert input-schema budget (tool-surface-consumer).
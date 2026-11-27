---
title: 'Remember surface: no kb_ingest_proof in the tool listing and no kibi-provable-code in kb_skills'
status: passing
verification_scope: end_to_end
verification_perspective: internal
tags:
  - levels
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-remember-level-surface
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-25T09:49:19.888Z'
id: TEST-kibi-remember-level-surface
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a5a5d9ca3c6b8e7f3712b904
    test_id: TEST-kibi-remember-level-surface
    scope: end_to_end
    outcome: passed
    code_snapshot: fec8bb5381fc9c57996e68fa13a8ded8909647b6ed057e68c39c2d03ea118b13
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-26T10:30:44.246Z'
    finished_at: '2026-11-26T10:30:44.371Z'
    artifact_digest: 8ae8d45e9b6a2f09834eaaaa7ea27110f23e35ead2bdbf01a99400d3f8a58f17
    contract_hash: f877e79fa16630643ca4a4af3f2136cbd99b5cbc266fd5ef032d8642cbd9b40e
    binding_hash: f9e2580d2e86c3d652955179a036e6e0609e9c93e89690245fb84ea15f5224e6
    fingerprint: e8a7446c4bea7c4d0f29a3bc5d33490c5729ded00b4f73eb40d1d7af2735fea9
    fingerprint_components:
      contract: f877e79fa16630643ca4a4af3f2136cbd99b5cbc266fd5ef032d8642cbd9b40e
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
      - symbol_id: SYM-test-kibi-remember-level-surface
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Automated verification lives in `packages/cli/tests/kibi-levels/remember-surface.test.ts`, with the MCP listing in `packages/mcp/tests/server/tool-profile.test.ts`. They check that kibi-provable-code is the one skill remember does not offer, that kb_skills at remember lists every other bundled skill, that at test or with no level every skill is listed, that the skill still loads by id, and that no MCP tool profile lists kb_ingest_proof at remember.

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
    receipt_id: PR-448776c32d37374e276c98f8
    test_id: TEST-kibi-remember-level-surface
    scope: end_to_end
    outcome: passed
    code_snapshot: b6649d29181ccab088798d2373ba640e85507f701aca154d615cc7f2c4e9cc6f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T10:22:02.022Z'
    finished_at: '2026-11-25T10:22:02.114Z'
    artifact_digest: 20245c62f015147bf6acbf30a27740f34a0caa5518dc7931eb700490576f3dd0
    contract_hash: f877e79fa16630643ca4a4af3f2136cbd99b5cbc266fd5ef032d8642cbd9b40e
    binding_hash: be251a092cb2aeaa16b147548a0ca73a36406e13af16504d1884f586aa95f59e
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

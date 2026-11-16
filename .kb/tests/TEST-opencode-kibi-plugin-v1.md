---
id: TEST-opencode-kibi-plugin-v1
title: OpenCode Kibi Plugin v1 Automated Verification
status: passing
created_at: 2026-03-13T00:00:00.000Z
updated_at: 2026-04-20T00:00:00.000Z
priority: must
tags:
  - opencode
  - kibi
  - test
  - enforcement
links:
  - type: validates
    target: SCEN-opencode-kibi-plugin-v1
type: test
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-opencode-plugin
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-40b84ac50c959bb3f68a42ee
    test_id: TEST-opencode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 05e0d24fa5c81791b656d46a9af810b6e962f357fcc4c02de2478221ec374bca
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T15:53:33.977Z'
    finished_at: '2026-11-16T15:54:37.590Z'
    artifact_digest: 14d75e0b17b92e5f50167b67f2038de17ca1334e917daa8b536f14f7b47090b0
    contract_hash: fda6ee3d82151dd1cee4719e6d67b7b1ebb8eb7cc3d8f7d84715fb2eb44d56a6
    binding_hash: 555b63ee78afbe6f1905d7750b0ed4468c900568fa084c2c9836d6fd360ba28b
    fingerprint: 6cb6521f423fa548cc931afe9997c54414b79165051b87c6a8f369f58c41fd2e
    fingerprint_components:
      contract: fda6ee3d82151dd1cee4719e6d67b7b1ebb8eb7cc3d8f7d84715fb2eb44d56a6
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
      - symbol_id: SYM-e2e-opencode-plugin
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
Verify the OpenCode plugin routes initial repository inference through kibi-bootstrap and the exact plan/apply contract, while normal work follows typed status and canonical skills.

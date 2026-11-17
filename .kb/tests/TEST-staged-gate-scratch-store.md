---
title: Staged gate scratch store tests
status: passing
priority: must
verification_scope: end_to_end
tags:
  - check
  - staged
origin:
  kind: agent
  recorded_at: '2026-11-16T19:30:00.000Z'
id: TEST-staged-gate-scratch-store
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-staged-gate-scratch-store
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-cefd82286426fc45521f7b71
    test_id: TEST-staged-gate-scratch-store
    scope: end_to_end
    outcome: passed
    code_snapshot: 208e833b856f0e522e4059068fdd60db02ab931118523dbf10567ed01d8b8c1d
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T15:16:48.398Z'
    finished_at: '2026-11-17T15:17:12.256Z'
    artifact_digest: 4598745bf10acaaf879498510d2b680a329a4266db4462906f0201e55af13179
    contract_hash: e006222ed4a7d9ff00b7ff57c1ab1bf719955547d841c769002068e14682aa77
    binding_hash: 5bb93a57df46fb2313f5218ac2da5cf99bf879e3f85f868da49b92c189161e6b
    fingerprint: bf9093a5a1a5a2f6009d68b6189d7cc9349f315dc1408061bb4581fcc40aad08
    fingerprint_components:
      contract: e006222ed4a7d9ff00b7ff57c1ab1bf719955547d841c769002068e14682aa77
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
      - symbol_id: SYM-test-staged-gate-scratch-store
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Checks that the staged gate's temporary store does not save after each write batch, that the evidence floor can be asked for named requirements only, and that the engine's scoped evidence floor evaluates only those requirements.
---
title: The supersedes reason acknowledgement code shall be supersedes_reason_acknowledge, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-supersedes-acknowledge-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-supersedes-reason-acknowledge-code
  proves:
    - CLAIM-9D285E495E7AAEE0
origin:
  kind: agent
  recorded_at: '2026-10-28T20:32:29.349Z'
id: TEST-proof-supersedes-acknowledge-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-680c7edc38532d781dbb2790
    test_id: TEST-proof-supersedes-acknowledge-code
    scope: unit
    outcome: passed
    code_snapshot: e25a1f0385dac8dcff3382f76f7940204d134ea7aa298c9b083cb2fcd11015b2
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T18:30:40.052Z'
    finished_at: '2026-11-04T18:30:40.192Z'
    artifact_digest: 2fde0f083856ae792f96fd009c93a3d8ffdddfbf0ef984832715c625d539c4f2
    contract_hash: 8d3f0f4df05f71f5cc51055faccb56e8f6596b0bd4d6be1591654fe07428a581
    binding_hash: e5dee231383b60ebf0bfce524351fafcc104636e81dd19b7e3b756c9f3721307
    fingerprint: 39b8a532921ed17c1ad780cfc70cbf2e3d386d9ba393777d8c47b989f00fb861
    fingerprint_components:
      contract: 8d3f0f4df05f71f5cc51055faccb56e8f6596b0bd4d6be1591654fe07428a581
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
      - symbol_id: SYM-proof-supersedes-acknowledge-code
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-supersedes-acknowledge-code
      pattern:
        symbol_id: SYM-const-supersedes-reason-acknowledge-code
        type: string
        value: supersedes_reason_acknowledge
    certificate_digest: 91fb018bb5e5484474a398832d62ffd4e8282fb89f185779a4b31eb63a5e3ef3
    claim_bindings:
      - claim_key: CLAIM-9D285E495E7AAEE0
        requirement_id: REQ-cli-migration-supersession-codes
        fact_id: FACT-supersedes-acknowledge-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: supersedes_reason_acknowledge
---
Proves that the supersedes reason acknowledgement code shall be supersedes_reason_acknowledge, against the code Kibi reads at ingest.
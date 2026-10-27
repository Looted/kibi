---
title: 'Source proof: the portable plugin.json uses only schema fields'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:57:28.289Z'
id: TEST-proof-cursor-agent-plugin-plugin-fields
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-cursor-agent-plugin-plugin-fields
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/cursor/agent-plugin/plugin.json
    path: ''
    select: keys
  proves:
    - CLAIM-C7B0F78EAB07CB58
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-47f388357955da62fd31ec69
    test_id: TEST-proof-cursor-agent-plugin-plugin-fields
    scope: unit
    outcome: passed
    code_snapshot: e54c836d045ddc66e5300f74cfaff528e05df36605bd9587408dc179d35908ca
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:58:30.635Z'
    finished_at: '2026-10-27T07:58:30.813Z'
    artifact_digest: 95cdade427e5cf2aa72b1f686e67bc2fb9cb1336a246d1991642a04a32b38801
    contract_hash: 2c1584204043b99489006a00d5d93bc4a613c8dfb6611ef959eddb146075b645
    binding_hash: 3564b62c8c469d2d14c7218399747340c1e55f2c9c4662c576c872f4377b2329
    fingerprint: 02c9dac7bb05cee21acb265a46ba785f6092018bbfe373a057dd7706b44a8310
    fingerprint_components:
      contract: 2c1584204043b99489006a00d5d93bc4a613c8dfb6611ef959eddb146075b645
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
      - symbol_id: SYM-proof-cursor-agent-plugin-plugin-fields
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: source
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: source
      test_id: TEST-proof-cursor-agent-plugin-plugin-fields
      source:
        reader: json
        file: packages/cursor/agent-plugin/plugin.json
        path: ''
        select: keys
      model:
        members:
          - $schema
          - author
          - description
          - homepage
          - keywords
          - license
          - name
          - repository
          - version
    certificate_digest: cf8e9e2ba78244337c7f43e616f5c01844d9480a5728fa842b791f5560bb1b41
    claim_bindings:
      - claim_key: CLAIM-C7B0F78EAB07CB58
        requirement_id: REQ-cursor-agent-plugin-package
        fact_id: FACT-agent-plugin-manifest-fields
        binding: derived
        scope: code
        obligation:
          kind: set_relation
          members:
            - $schema
            - author
            - description
            - extensions
            - homepage
            - keywords
            - license
            - name
            - repository
            - version
          operator: subset_of
---
Reads the top-level fields of packages/cursor/agent-plugin/plugin.json. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the file still matches.

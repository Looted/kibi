---
title: 'Source proof: the kibi-codex manifest declares its plugin parts'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:48:56.084Z'
id: TEST-proof-codex-manifest-fields
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-codex-manifest-fields
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/codex/.codex-plugin/plugin.json
    path: ''
    select: keys
  proves:
    - CLAIM-AEF7587DBC190FD1
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-78d22065397671f31cd3a5e5
    test_id: TEST-proof-codex-manifest-fields
    scope: unit
    outcome: passed
    code_snapshot: 017f08e44cfd7461b2b4632514b2750261c1be0471722dc4ee28dbea05858af6
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-25T18:11:18.032Z'
    finished_at: '2026-11-25T18:11:18.145Z'
    artifact_digest: 64729ba01c9060cf23f8ed9a7055ec9629d8fe49e4994d049cd7801aab044155
    contract_hash: d827e7249b61b847ea0e7dc2762b61c339162f249ae4523e9431c935a1702a0b
    binding_hash: 7729dfbe42ed0b73d598a1ba5d6f4c63c23d8c0db90ff66fc659a7e6cf85a3c3
    fingerprint: 8130e931cb9fd396091c1eb9bf5c187357ad1b76d3cff92602962f9a5f365fdc
    fingerprint_components:
      contract: d827e7249b61b847ea0e7dc2762b61c339162f249ae4523e9431c935a1702a0b
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
      - symbol_id: SYM-proof-codex-manifest-fields
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
      test_id: TEST-proof-codex-manifest-fields
      source:
        reader: json
        file: packages/codex/.codex-plugin/plugin.json
        path: ''
        select: keys
      model:
        members:
          - author
          - description
          - homepage
          - hooks
          - interface
          - keywords
          - license
          - mcpServers
          - name
          - repository
          - skills
          - version
    certificate_digest: 8dec67353de158b36ec224004ee65de9e6a77fb9af3683cc03b54fa8463fbfe5
    claim_bindings:
      - claim_key: CLAIM-AEF7587DBC190FD1
        requirement_id: REQ-codex-plugin-package
        fact_id: FACT-codex-manifest-declares-plugin-parts
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - hooks
            - mcpServers
            - skills
          operator: includes
---
Reads the top-level fields of packages/codex/.codex-plugin/plugin.json. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the file still matches.

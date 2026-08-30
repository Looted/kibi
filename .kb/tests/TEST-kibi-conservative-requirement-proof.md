---
id: TEST-kibi-conservative-requirement-proof
title: Conservative requirement proof report tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: packages/core/tests/kb.plt
tags:
  - requirements
  - proof
  - prolog
  - cli
  - mcp
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
links:
  - type: validates
    target: SCEN-kibi-conservative-requirement-proof
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-conservative-requirement-proof-chain
      target: default
  success_policy: all_required_first_attempt
type: test
---

Verifies the conservative requirement-proof contract through core Prolog, the CLI command surface, and the MCP adapter. It covers structural false positives, complete proof chains, semantic-inventory RDF round trips, refresh-before-extract source-coordinate persistence, executable-versus-production symbol classification, stable proof gaps, ranked repairs, and compatibility of existing coverage fields.

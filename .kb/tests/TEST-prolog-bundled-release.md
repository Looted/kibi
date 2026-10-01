---
title: Platform package population, symlink materialization, release workflow, and publish-metadata controls
status: active
tags:
  - prolog
  - bundle
  - release
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-populate-swipl-platform-packages
      target: default
    - symbol_id: SYM-test-release-pack-workflow-contract
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-bundled-release
type: test
---

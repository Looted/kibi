---
title: The packed kibi-opencode package loads on the OpenCode v1 and v2 plugin APIs and keeps registering hooks after one fails
status: pending
priority: must
tags:
  - opencode
  - plugin-api
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
links:
  - type: validates
    target: SCEN-opencode-v2-plugin-load
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-opencode-plugin
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, on review-level findings: "Everything, in this PR".'
  approved_by: maintainer
  recorded_at: '2026-11-04T15:30:00.000Z'
id: TEST-e2e-opencode-v2-plugin-load
type: test
---
Installs the packed kibi-opencode tarball into an isolated directory and imports its default export. The definition carries a non-empty id, a `server` function that OpenCode v1 reads and a `setup` function that OpenCode v2 calls. It then runs the packaged v2 setup against a host whose session hook throws, and checks that the tool and command hooks still register and that the failed registration is reported.

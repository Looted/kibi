---
title: Capability plugin protocol safety
status: open
tags:
  - plugins
semantic_text: An activated capability plugin must export validated protocol kibi.plugin.v1 from the named export kibiPlugin. The exported provider version must reference an existing resolved package version.
logic_claims:
  - CLAIM-63FDA15E922B547A
  - CLAIM-F56119D70E27236A
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 751f906a25cae52ad65079e3e698e738a84d27c00abaa41313f5c9f7f612f8cf
semantic_inventory:
  - claim_key: CLAIM-63FDA15E922B547A
    claim_text: An activated capability plugin must export validated protocol kibi.plugin.v1 from the named export kibiPlugin
    role: normative
    status: modeled
    span:
      start: 0
      end: 109
    payload_hash: 2dc36db4ab8ba3fa0a1fb34cc9141b420676edf10affe6e2506d0855e9939001
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-F56119D70E27236A
    claim_text: The exported provider version must reference an existing resolved package version
    role: normative
    status: modeled
    span:
      start: 111
      end: 192
    payload_hash: 2dc36db4ab8ba3fa0a1fb34cc9141b420676edf10affe6e2506d0855e9939001
    reason: No accepted typed interpretation grounds this assertive proposition.
id: REQ-capability-plugin-protocol-v1
type: req
proof_exempt: false
semantic_clauses:
  - An activated capability plugin must export validated protocol kibi.plugin.v1 from the named export kibiPlugin.
  - The exported provider version must reference an existing resolved package version.
---
# REQ-capability-plugin-protocol-v1

An activated capability plugin must export validated protocol kibi.plugin.v1 from the named export kibiPlugin. The exported provider version must reference an existing resolved package version.

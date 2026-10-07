---
title: Kibi resolves a verified bundled SWI-Prolog before falling back to the system
status: open
priority: must
tags:
  - prolog
  - bundle
  - resolver
  - lane:strict
  - review:context-missing
text_ref: packages/cli/src/prolog/swipl-resolver.ts
semantic_text: Kibi must resolve SWI-Prolog from KIBI_SWIPL first, then from the verified bundled platform package, then from swipl on PATH. Kibi must skip the bundled platform package when KIBI_SWIPL is system. Kibi must refuse a bundled platform package whose manifest is malformed or whose binary checksum differs from the manifest. Kibi must reject a swipl on PATH older than version 9.0. Kibi must fail with the detected platform, the covering platform package, and the operating-system install command when no usable SWI-Prolog is found. Kibi must set SWI_HOME_DIR for the SWI-Prolog child process when the bundled build is used
semantic_source_field: semantic_text
semantic_source_hash: 302d4c8f1310dff8857fa2a4069f28426eed649dfb229278c0f4178c4b740207
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_inventory:
  - claim_key: CLAIM-FDC71CEE4F0FEE05
    claim_text: Kibi must resolve SWI-Prolog from KIBI_SWIPL first, then from the verified bundled platform package, then from swipl on PATH
    role: normative
    status: modeled
    span:
      start: 0
      end: 124
    payload_hash: d8d8505e3c7e5bf07a09979135fb5f2af09a154ecd6a034c5492f95facc7b13d
    reason: Grounded by FACT-prolog-bundled-resolves-env-then-bundled-then-path via requires_property.
  - claim_key: CLAIM-D6D38F79C8941288
    claim_text: Kibi must skip the bundled platform package when KIBI_SWIPL is system
    role: normative
    status: modeled
    span:
      start: 126
      end: 195
    payload_hash: d8d8505e3c7e5bf07a09979135fb5f2af09a154ecd6a034c5492f95facc7b13d
    reason: Grounded by FACT-prolog-bundled-skips-bundle-when-env-is-system via requires_property.
  - claim_key: CLAIM-7BFD6D037E8F4195
    claim_text: Kibi must refuse a bundled platform package whose manifest is malformed or whose binary checksum differs from the manifest
    role: normative
    status: modeled
    span:
      start: 197
      end: 319
    payload_hash: d8d8505e3c7e5bf07a09979135fb5f2af09a154ecd6a034c5492f95facc7b13d
    reason: Grounded by FACT-prolog-bundled-refuses-corrupt-bundle via requires_property.
  - claim_key: CLAIM-7ED81CE5062FB889
    claim_text: Kibi must reject a swipl on PATH older than version 9.0
    role: normative
    status: modeled
    span:
      start: 321
      end: 376
    payload_hash: d8d8505e3c7e5bf07a09979135fb5f2af09a154ecd6a034c5492f95facc7b13d
    reason: Grounded by FACT-prolog-bundled-rejects-path-swipl-older-than-9 via requires_property.
  - claim_key: CLAIM-A51EE716AC9D093E
    claim_text: Kibi must fail with the detected platform, the covering platform package, and the operating-system install command when no usable SWI-Prolog is found
    role: normative
    status: modeled
    span:
      start: 378
      end: 527
    payload_hash: d8d8505e3c7e5bf07a09979135fb5f2af09a154ecd6a034c5492f95facc7b13d
    reason: Grounded by FACT-prolog-bundled-names-platform-package-and-install-command-when-missing via requires_property.
  - claim_key: CLAIM-DD0EC27D9AD705EC
    claim_text: Kibi must set SWI_HOME_DIR for the SWI-Prolog child process when the bundled build is used
    role: normative
    status: modeled
    span:
      start: 529
      end: 619
    payload_hash: d8d8505e3c7e5bf07a09979135fb5f2af09a154ecd6a034c5492f95facc7b13d
    reason: Grounded by FACT-prolog-bundled-sets-swi-home-dir-for-bundled-child via requires_property.
logic_claims:
  - CLAIM-FDC71CEE4F0FEE05
  - CLAIM-D6D38F79C8941288
  - CLAIM-7BFD6D037E8F4195
  - CLAIM-7ED81CE5062FB889
  - CLAIM-A51EE716AC9D093E
  - CLAIM-DD0EC27D9AD705EC
id: REQ-prolog-bundled-runtime
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Kibi must resolve SWI-Prolog from KIBI_SWIPL first, then from the verified bundled platform package, then from swipl on PATH. Kibi must skip the bundled platform package when KIBI_SWIPL is system. Kibi must refuse a bundled platform package whose manifest is malformed or whose binary checksum differs from the manifest. Kibi must reject a swipl on PATH older than version 9.0. Kibi must fail with the detected platform, the covering platform package, and the operating-system install command when no usable SWI-Prolog is found. Kibi must set SWI_HOME_DIR for the SWI-Prolog child process when the bundled build is used

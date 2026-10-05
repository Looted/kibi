---
title: Doctor reports which SWI-Prolog Kibi uses and whether it can load the required libraries
status: open
priority: must
tags:
  - prolog
  - doctor
  - lane:strict
text_ref: packages/cli/src/commands/doctor.ts
semantic_text: kibi doctor must report the SWI-Prolog source, executable path, and version. kibi doctor must fail when the resolved SWI-Prolog cannot load a required library. kibi doctor must name the platform package to add when no bundled or system SWI-Prolog is found
semantic_clauses:
  - kibi doctor must report the SWI-Prolog source, executable path, and version
  - kibi doctor must fail when the resolved SWI-Prolog cannot load a required library
  - kibi doctor must name the platform package to add when no bundled or system SWI-Prolog is found
semantic_source_field: semantic_text
semantic_source_hash: 39fe127739edd9d15d2727bd35fddfa3ce6cb3e6d54a7edf06c1a7e11c8d4dad
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_inventory:
  - claim_key: CLAIM-BEF22AFD020E70FF
    claim_text: kibi doctor must report the SWI-Prolog source, executable path, and version
    role: normative
    status: modeled
    span:
      start: 0
      end: 75
    payload_hash: 55d0ecb012ac87e2492e612cf0a08da8fb70d58d1578aaf466ac38854d5f7806
    reason: Grounded by FACT-prolog-doctor-runtime-reports-source-path-and-version via requires_property.
  - claim_key: CLAIM-235CE24A89EDE409
    claim_text: kibi doctor must fail when the resolved SWI-Prolog cannot load a required library
    role: normative
    status: modeled
    span:
      start: 77
      end: 158
    payload_hash: 55d0ecb012ac87e2492e612cf0a08da8fb70d58d1578aaf466ac38854d5f7806
    reason: Grounded by FACT-prolog-doctor-runtime-fails-on-missing-required-library via requires_property.
  - claim_key: CLAIM-063154CE4A81EAE4
    claim_text: kibi doctor must name the platform package to add when no bundled or system SWI-Prolog is found
    role: normative
    status: modeled
    span:
      start: 160
      end: 255
    payload_hash: 55d0ecb012ac87e2492e612cf0a08da8fb70d58d1578aaf466ac38854d5f7806
    reason: Grounded by FACT-prolog-doctor-runtime-names-platform-package-when-runtime-missing via requires_property.
logic_claims:
  - CLAIM-BEF22AFD020E70FF
  - CLAIM-235CE24A89EDE409
  - CLAIM-063154CE4A81EAE4
id: REQ-prolog-doctor-runtime-report
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
kibi doctor must report the SWI-Prolog source, executable path, and version. kibi doctor must fail when the resolved SWI-Prolog cannot load a required library. kibi doctor must name the platform package to add when no bundled or system SWI-Prolog is found

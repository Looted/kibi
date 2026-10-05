---
title: Kibi's own CI runs the verified bundled SWI-Prolog, keeps one system-SWI-Prolog job, and never lets a release trust the CI cache
status: open
tags:
  - prolog
  - bundle
  - ci
  - lane:strict
priority: must
text_ref: .github/workflows/swipl-ci-bundle.yml
semantic_text: Kibi's own CI Prolog jobs must run the bundled SWI-Prolog archive built by the release pipeline after re-verifying its checksum, pins, and binary hash. Kibi's own CI must keep one job that runs a system SWI-Prolog selected with KIBI_SWIPL=system. A cached CI archive must skip the commit and run binding only through the explicit cached-build flag. Release workflows must never use the cached-build flag.
logic_claims:
  - CLAIM-68A623E1A0EC156C
  - CLAIM-CA83D697C22842DC
  - CLAIM-C5A87E737E2C3067
  - CLAIM-129A0E013A27F87F
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 55fb9804ecc5cf8ca3c7b6ce479d3253673b7164d87de5d02a2d433589192c8b
semantic_inventory:
  - claim_key: CLAIM-68A623E1A0EC156C
    claim_text: Kibi's own CI Prolog jobs must run the bundled SWI-Prolog archive built by the release pipeline after re-verifying its checksum, pins, and binary hash
    role: normative
    status: modeled
    span:
      start: 0
      end: 150
    payload_hash: 7c54a02896362edfc33a5ea801c8aafc1f22e5d19c28d2b12f9544329ce9ba20
    reason: Grounded by FACT-prolog-bundled-ci-runs-verified-bundle via requires_property.
  - claim_key: CLAIM-CA83D697C22842DC
    claim_text: Kibi's own CI must keep one job that runs a system SWI-Prolog selected with KIBI_SWIPL=system
    role: normative
    status: modeled
    span:
      start: 152
      end: 245
    payload_hash: 7c54a02896362edfc33a5ea801c8aafc1f22e5d19c28d2b12f9544329ce9ba20
    reason: Grounded by FACT-prolog-bundled-ci-keeps-system-swipl-job via requires_property.
  - claim_key: CLAIM-C5A87E737E2C3067
    claim_text: A cached CI archive must skip the commit and run binding only through the explicit cached-build flag
    role: normative
    status: modeled
    span:
      start: 247
      end: 347
    payload_hash: 7c54a02896362edfc33a5ea801c8aafc1f22e5d19c28d2b12f9544329ce9ba20
    reason: Grounded by FACT-prolog-bundled-ci-cached-archive-skips-binding-only-with-flag via requires_property.
  - claim_key: CLAIM-129A0E013A27F87F
    claim_text: Release workflows must never use the cached-build flag
    role: normative
    status: modeled
    span:
      start: 349
      end: 403
    payload_hash: 7c54a02896362edfc33a5ea801c8aafc1f22e5d19c28d2b12f9544329ce9ba20
    reason: Grounded by FACT-prolog-bundled-ci-release-uses-cached-build via requires_property.
id: REQ-prolog-bundled-ci
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Kibi's own CI Prolog jobs must run the bundled SWI-Prolog archive built by the release pipeline after re-verifying its checksum, pins, and binary hash. Kibi's own CI must keep one job that runs a system SWI-Prolog selected with KIBI_SWIPL=system. A cached CI archive must skip the commit and run binding only through the explicit cached-build flag. Release workflows must never use the cached-build flag.

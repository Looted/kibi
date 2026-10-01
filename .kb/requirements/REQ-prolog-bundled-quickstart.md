---
title: Published install guidance needs no SWI-Prolog on supported platforms and the README quick start is proven without one
status: open
tags:
  - prolog
  - bundle
  - ci
  - lane:strict
priority: must
text_ref: docs/install.md
semantic_text: Published installation guidance must state that no SWI-Prolog install is needed on the supported Linux and macOS platforms. Published installation guidance must document the KIBI_SWIPL override, the lookup order, and the doctor source report. The README quick start must reach a bootstrapped project from the packed release tarballs on every launch platform with no SWI-Prolog installed.
logic_claims:
  - CLAIM-582953A24118D6E1
  - CLAIM-80EC1AC74E5579F4
  - CLAIM-6D290A90A606C02C
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: bb38654d432d13f4368ad375117efd505487b138689087dbee5a1ed59f3bf759
semantic_inventory:
  - claim_key: CLAIM-582953A24118D6E1
    claim_text: Published installation guidance must state that no SWI-Prolog install is needed on the supported Linux and macOS platforms
    role: normative
    status: modeled
    span:
      start: 0
      end: 122
    payload_hash: 0b233bf16196a910f41be833ee2a5459ee1df34dfada6dbdc4a829ebb556c071
    reason: Grounded by FACT-prolog-bundled-quickstart-docs-state-no-install via requires_property.
  - claim_key: CLAIM-80EC1AC74E5579F4
    claim_text: Published installation guidance must document the KIBI_SWIPL override, the lookup order, and the doctor source report
    role: normative
    status: modeled
    span:
      start: 124
      end: 241
    payload_hash: 0b233bf16196a910f41be833ee2a5459ee1df34dfada6dbdc4a829ebb556c071
    reason: Grounded by FACT-prolog-bundled-quickstart-docs-document-override-and-order via requires_property.
  - claim_key: CLAIM-6D290A90A606C02C
    claim_text: The README quick start must reach a bootstrapped project from the packed release tarballs on every launch platform with no SWI-Prolog installed
    role: normative
    status: modeled
    span:
      start: 243
      end: 386
    payload_hash: 0b233bf16196a910f41be833ee2a5459ee1df34dfada6dbdc4a829ebb556c071
    reason: Grounded by FACT-prolog-bundled-quickstart-readme-reaches-bootstrap via requires_property.
id: REQ-prolog-bundled-quickstart
type: req
---
Published installation guidance must state that no SWI-Prolog install is needed on the supported Linux and macOS platforms. Published installation guidance must document the KIBI_SWIPL override, the lookup order, and the doctor source report. The README quick start must reach a bootstrapped project from the packed release tarballs on every launch platform with no SWI-Prolog installed.

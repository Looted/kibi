---
title: When kibi doctor runs with JSON output on an installed consumer workspace, it mu
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: kibi.cli.doctor
property_key: reports_installed_mcp_version
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_cli_doctor_packed_provenance.reports_installed_mcp_version.eq.true
claim_key: CLAIM-2F306D93E829A446
claim_text: When kibi doctor runs with JSON output on an installed consumer workspace, it must report the installed kibi-mcp package version by resolving the package entrypoint whenever the package does not export its package.json subpath
id: FACT-PROP-REQ-CLI-DOCTOR-PACKED-PROVENANCE-C01
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

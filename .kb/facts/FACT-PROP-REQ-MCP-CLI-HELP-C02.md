---
title: It must NOT start the MCP stdio server or wait for input when help is requested
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: mcp.binary.help
property_key: help_skips_stdio_server
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_mcp_cli_help.help_skips_stdio_server.eq.true
claim_key: CLAIM-6448FEFEA50A7DCD
claim_text: It must NOT start the MCP stdio server or wait for input when help is requested
id: FACT-PROP-REQ-MCP-CLI-HELP-C02
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

---
title: 'The `kibi-cursor` package is an optional Cursor adapter for teams who want Kibi '
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: req.req_cursor_kibi_plugin_v1
property_key: clause_01_the_kibi_cursor_package_is_an_optional_cursor_ad
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_cursor_kibi_plugin_v1.clause_01_the_kibi_cursor_package_is_an_optional_cursor_ad.eq.true
claim_key: CLAIM-C27AC44AF1CAFFF4
claim_text: The `kibi-cursor` package is an optional Cursor adapter for teams who want Kibi in Cursor workflows without changing core Kibi runtime components.\n\nWhen installed and enabled, it should:\n\nKeep `kibi-core`, `kibi-cli`, `kibi-mcp`, and SWI-Prolog as the required foundation for project-local Kibi operations.\nBundle and expose a Cursor plugin manifest, rules, skills, commands, hooks, and MCP server config that points to the local project `kibi-mcp` binary.\nRun hook-driven reminders and warnings only, so it does not replace MCP tooling behavior or write directly to `.kb`.\nRemain clearly documented as optional, with a supported manual MCP configuration path when teams do not use the plugin installer path.\n\nThis requirement is scoped to plugin documentation and operational guidance
id: FACT-PROP-REQ-CURSOR-KIBI-PLUGIN-V1-C01
type: fact
---

---
title: The `kibi-codex` package is an optional Codex adapter for teams who want Kibi in
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: req.req_codex_kibi_plugin_v1
property_key: clause_01_the_kibi_codex_package_is_an_optional_codex_adap
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_codex_kibi_plugin_v1.clause_01_the_kibi_codex_package_is_an_optional_codex_adap.eq.true
claim_key: CLAIM-BE5BFCB5AECD235B
claim_text: The `kibi-codex` package is an optional Codex adapter for teams who want Kibi in Codex workflows without changing core Kibi runtime components.\n\nWhen installed and enabled, it should:\n\nKeep `kibi-core`, `kibi-cli`, and `kibi-mcp` as the required foundation for project-local Kibi operations.\nBundle and expose a Codex plugin manifest, skills, hooks, and MCP server config that points to the local project `kibi-mcp` binary.\nRun hook-driven reminders and warnings only, so it does not replace MCP tooling behavior or write directly to `.kb`.\nRemain clearly documented as optional, with a supported manual MCP configuration path when teams do not use the plugin installer path.\n\nThis requirement is now scoped to plugin documentation and operational guidance
id: FACT-PROP-REQ-CODEX-KIBI-PLUGIN-V1-C01
type: fact
---

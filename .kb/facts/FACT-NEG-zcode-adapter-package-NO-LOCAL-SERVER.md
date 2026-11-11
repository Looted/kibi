---
title: The kibi-zcode MCP configuration launches a server it did not resolve
status: active
tags:
  - negative-path
fact_kind: property_value
subject_key: zcode.kibi_adapter
property_key: mcp_configuration_resolver
operator: eq
value_type: string
value_string: unresolved_kibi_mcp
origin:
  kind: agent
  recorded_at: '2026-11-05T10:40:00.000Z'
id: FACT-NEG-zcode-adapter-package-NO-LOCAL-SERVER
type: fact
---
A Kibi workspace has no resolvable kibi-mcp executable, and the kibi-zcode launcher still starts some server for it.

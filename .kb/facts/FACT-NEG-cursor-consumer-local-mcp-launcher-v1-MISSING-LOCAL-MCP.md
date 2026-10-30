---
title: The consumer workspace has no project-local kibi-mcp and the Cursor launcher would fall back to a downloaded, global or plugin-local runtime
status: active
fact_kind: predicate
predicate_name: plugin_launcher_contract
predicate_args:
  - kibi_cursor_launcher
  - dependency_runtime_resolution
  - consumer_project_local_kibi_mcp_only_without_download_global_or_plugin_local_runtime
predicate_namespace: kibi.launcher
polarity: deny
canonical_key: plugin_launcher_contract(kibi_cursor_launcher,dependency_runtime_resolution,consumer_project_local_kibi_mcp_only_without_download_global_or_plugin_local_runtime)
origin:
  kind: agent
  recorded_at: '2026-10-29T21:15:52.465Z'
id: FACT-NEG-cursor-consumer-local-mcp-launcher-v1-MISSING-LOCAL-MCP
type: fact
---

# Operation access

MCP tools and the trusted project-local CLI are peer surfaces for the same
operation contracts. Use the dedicated JSON route; parse the shared
`KibiResult` envelope and follow required `nextActions` after partial commits.

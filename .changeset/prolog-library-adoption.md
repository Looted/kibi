---
"kibi-core": patch
"kibi-mcp": patch
---

Kibi now uses more of SWI-Prolog's maintained standard library to make graph reporting clearer and to pilot derived validation facts internally. MCP users also get an opt-in remote SPARQL query tool for querying external RDF endpoints without changing Kibi's local RDF storage model. The new SPARQL surface is explicitly remote-only, validates HTTP(S) endpoints, and keeps network-dependent behavior outside the normal local KB query path.

- Refactored Prolog relationship counting to use `library(aggregate)`.
- Added an isolated CHR-derived facts pilot module for bounded validation facts.
- Added a remote SPARQL client wrapper and `kb_sparql_remote` MCP tool.

---
"kibi-cli": patch
"kibi-mcp": patch
---

Kibi now treats symbol granularity as a behavioral traceability decision instead of assuming every exported declaration is an equally precise target. Agents can model behavior hidden inside factory or composition expressions with manual behavioral anchors, while interfaces, type aliases, and enums no longer block valid coarse behavioral links by themselves. This makes traceability stricter where real behavior symbols exist and more flexible when extractors only see type-shape declarations.

Technical summary:

- Added `symbol_role` metadata for symbol entities.
- Added shared role-aware symbol granularity helpers.
- Updated MCP upsert and CLI staged checks to reject coarse links only when narrower behavioral symbols are available.
- Documented manual behavioral anchors for extractor-miss cases.

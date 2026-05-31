---
"kibi-cli": patch
"kibi-mcp": patch
---

Agents can now link requirements directly to class methods when that is the narrowest meaningful code symbol. Method-level symbol upserts use `ClassName.methodName` identities, with bare method names accepted only when they are unique in the file. This reduces unnecessary `extractor-miss` workarounds and keeps traceability closer to the behavior being changed.

- Add qualified `method` symbols to parser-backed symbol analysis and staged symbol extraction for exported classes.
- Include exported class methods in MCP symbol granularity validation so method-level `kb_upsert` calls are accepted without allowing duplicate bare-name collisions.
- Update symbol granularity documentation to name class methods as narrow traceability targets.

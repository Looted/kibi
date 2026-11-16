---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
---

`kb_upsert` of a requirement accepts `implementedBy: [{sourceFile, symbol}]` and records the `implements` link from each named declaration's symbol in the same call. Kibi parses the file and resolves each entry to exactly one granular declaration: a function, a method as `Class.method` (or its unique bare name) or an exported constant. It reuses the stored symbol for that declaration or creates one under a free `SYM-` id. An entry that names nothing the file declares, a bare method several classes declare, a class whose behavior lives in its methods, or a whole file is refused with the candidate names, and the requirement and every symbol write are validated before anything is written. The result's `implementedBy` lists each `symbolId` and whether it was created; a dry run previews the links. Writing a requirement for existing code no longer needs a separate symbol upsert per function.

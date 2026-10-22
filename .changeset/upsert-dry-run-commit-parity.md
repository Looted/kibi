---
"kibi-core": patch
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
---

`kb_upsert` with `dryRun: true` now refuses every payload the real write would refuse, with the same message. Before, a dry run could report a payload valid that the write then rejected: a relationship whose target entity does not exist, a symbol that mixes `executable_for` with `implements` or `covered_by` (in one payload or against links it already has), or an authored document path or format the write cannot use. Such a refusal now comes back as an invalid dry run, and a refusal that carries an error code (for example `SOURCE_PATH_INVALID`) also returns it as `errorCode`.

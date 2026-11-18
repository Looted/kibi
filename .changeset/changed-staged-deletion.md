---
"kibi-cli": patch
"kibi-mcp": patch
---

`kibi check --changed <path>` and `kb_check` with `changed: true` and `sourceFiles` accept a path whose deletion or rename is already staged. They used to refuse it as "neither in the working tree nor tracked", so the removal of firm code could not be judged by naming the file.
